# API Context Design — 让 LLM 快速且准确地了解项目 API

## 1. 问题陈述

LLM 在辅助开发时，需要快速、准确地理解项目的 API 全貌：

| 场景 | LLM 需要回答的问题 |
|------|-------------------|
| 新功能开发 | "哪些 API 已经存在？我要调用哪个？" |
| Bug 修复 | "这个端点的入参/出参是什么？认证方式？" |
| 代码审查 | "这次变更影响了哪些 API？是否有破坏性？" |
| 接口对接 | "给我一个可用的 curl 示例" |

**当前状态**（本模版）：

- Context Awareness 特性已提供 OpenAPI 合约**模版**（位于 `.ai/skills/features/context-awareness/templates/docs/context/api/openapi.yaml`），但 `docs/context/` 目录在启用并物化该特性前**不存在**——这是预期行为，需通过 `init Stage C apply` 或手动复制模版来物化（详见 `init/_tools/feature-docs/context-awareness.md`）
- 物化后的 OpenAPI 文件是**空壳**（`paths: {}`），完全依赖手动维护
- 没有自动化同步机制，缺少 LLM 友好的摘要层
- 与实际代码之间可能产生漂移，无 CI 卡点

## 2. 设计目标

| 目标 | 衡量标准 |
|------|---------|
| **快速** | LLM 在 1 次文件读取内获得 API 全局概览 |
| **准确** | API 描述与运行时行为一致（实时性） |
| **结构化** | 支持按端点精准查询，不需全文扫描 |
| **可验证** | CI 可检测文档与代码的漂移 |
| **渐进式** | 小项目可手动维护，大项目可接入自动生成 |

## 3. 整体架构：三层 API 上下文

```
┌─────────────────────────────────────────────────────────────────┐
│                    LLM 消费入口                                  │
│         docs/context/registry.json  →  按需加载                  │
└────────────┬──────────────────┬───────────────────┬─────────────┘
             │                  │                   │
     ┌───────▼───────┐  ┌──────▼──────┐  ┌─────────▼─────────┐
     │  Layer 1       │  │  Layer 2     │  │  Layer 3           │
     │  OpenAPI 合约   │  │  API Index  │  │  源码约定参照        │
     │  (权威/完整)    │  │  (摘要/速查) │  │  (深入/按需)        │
     └───────┬───────┘  └──────┬──────┘  └─────────┬─────────┘
             │                  │                   │
        openapi.yaml      api-index.json       routers/
        (OpenAPI 3.1)     (LLM 优化摘要)      controllers/
                                               schemas/
```

### Layer 1 — OpenAPI 合约（权威源，已有）

| 属性 | 值 |
|------|---|
| 位置 | `docs/context/api/openapi.yaml` |
| 格式 | OpenAPI 3.1.0 |
| 角色 | 完整 API 定义的 SSOT（Single Source of Truth） |
| 更新方式 | 手动编辑 / 代码生成器产出 |
| 注册 | `docs/context/registry.json` 中 `type: openapi` |

**已有能力**：Context Awareness 特性已支持。

**要求强化**：OpenAPI 文件中每个端点**必须**包含：

```yaml
paths:
  /api/users:
    post:
      operationId: createUser          # 必填：唯一操作标识
      summary: 创建新用户               # 必填：一句话业务语义
      tags: [users]                    # 必填：业务分组
      security:
        - bearerAuth: []               # 必填：认证方式
      requestBody:                     # 有请求体时必填
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: 用户创建成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
        '400':
          description: 输入校验失败
        '401':
          description: 未认证
```

**OpenAPI 结构化切片规则**（给索引/RAG 系统）：

- 切片粒度：每个 `paths.{path}.{method}` 为一个独立 chunk
- 每个 chunk 必须展开包含：`$ref` 引用的 schemas、security 定义
- 不要将 OpenAPI 当成纯文本按行切分

### Layer 2 — API Index 摘要（新增，LLM 速查层）

| 属性 | 值 |
|------|---|
| 位置 | `docs/context/api/api-index.json` |
| 格式 | 自定义 JSON（见下方 schema） |
| 角色 | LLM 一次读取即可获得 API 全貌的压缩摘要 |
| 更新方式 | 脚本从 OpenAPI 自动生成 |
| 注册 | `docs/context/registry.json` 中 `type: json`, `id: api-index` |

#### 2a. API Index JSON Schema

```jsonc
{
  "version": 1,
  "generatedAt": "2026-02-18T12:00:00Z",
  "sourceOpenapi": "docs/context/api/openapi.yaml",
  "sourceChecksumSha256": "abc123...",
  "stats": {
    "totalEndpoints": 12,
    "byTag": { "users": 4, "orders": 5, "auth": 3 }
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/api/users",
      "operationId": "createUser",
      "summary": "创建新用户",
      "tag": "users",
      "auth": "bearer",
      "input": {
        "params": [],
        "query": [],
        "body": {
          "required": ["email", "password", "name"],
          "optional": ["avatar", "role"]
        }
      },
      "output": {
        "successStatus": 201,
        "coreFields": ["id", "email", "name", "createdAt"]
      },
      "errors": [400, 401, 409],
      "example": {
        "curl": "curl -X POST /api/users -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' -d '{\"email\":\"a@b.com\",\"password\":\"Str0ng!\",\"name\":\"Alice\"}'"
      }
    }
  ]
}
```

#### 2b. 为什么需要 API Index

| 对比维度 | 原始 OpenAPI | API Index |
|---------|------------|-----------|
| 文件大小 | 大（含完整 schema 定义） | 小（每端点约 10 行） |
| 读取次数 | 需要多次展开 `$ref` | 1 次读取全部端点 |
| 适合回答 | "这个端点的完整 schema 是什么" | "有哪些 API 能完成 X" |
| 维护成本 | 手动 / 生成器 | **自动**从 OpenAPI 生成 |

**LLM 加载协议**：
1. 先读 `api-index.json` 获取全局概览
2. 需要某端点完整细节时，再读 `openapi.yaml` 对应段落

#### 2c. API Index Markdown 视图（可选）

同时生成 `docs/context/api/API-INDEX.md` 供人类快速浏览：

```markdown
# API Index

> 自动生成于 2026-02-18T12:00:00Z — 请勿手动编辑

| Method | Path | Summary | Auth | Input (required) | Output (core) | Errors |
|--------|------|---------|------|-------------------|---------------|--------|
| POST | /api/users | 创建新用户 | bearer | email, password, name | id, email, name | 400, 401, 409 |
| GET | /api/users/:id | 获取用户详情 | bearer | — | id, email, name, role | 401, 404 |
| ... | ... | ... | ... | ... | ... | ... |
```

### Layer 3 — 源码约定参照（按需深入）

当 LLM 需要理解实现细节时，按约定的目录结构直接阅读源码。

**推荐的源码索引源**（按优先级）：

| 优先级 | 源 | 用途 |
|--------|---|------|
| 1 | `openapi.yaml` / `api-index.json` | 合约层（已覆盖） |
| 2 | `README.md` / `docs/api/*.md` | 解释性文档、业务语义 |
| 3 | `src/routes/` 或 `src/routers/` | 路由定义、tags、summary |
| 4 | `src/schemas/` 或 `src/models/` | Pydantic/DTO/response model |
| 5 | `src/middleware/auth*` | security scheme、权限矩阵 |

**约定**：项目应在 OpenAPI `info.x-source-mapping` 中声明源码映射关系：

```yaml
info:
  title: My API
  version: 1.0.0
  x-source-mapping:
    routes: src/routes/
    controllers: src/controllers/
    schemas: src/schemas/
    middleware: src/middleware/
```

## 4. 实时性保障机制

这是整个方案的核心——确保 API 文档与实际代码始终一致。

### 4a. 同步策略矩阵

| 项目阶段 | OpenAPI 维护方式 | API Index 生成 | 验证时机 |
|---------|----------------|----------------|---------|
| 原型期（< 10 个端点） | 手动编辑 | 脚本生成 | 提交前（可选） |
| 成长期（10-50 个端点） | 代码注解 → 生成器产出 | 脚本生成 | CI 必须通过 |
| 成熟期（> 50 个端点） | 代码注解 → 生成器产出 | CI 自动生成 | CI + pre-commit |

### 4b. 生成脚本：`ctl-api-index.mjs`

新增脚本，职责单一：从 OpenAPI 生成 API Index。

```
node .ai/scripts/ctl-api-index.mjs generate [options]

Commands:
  generate          从 openapi.yaml 生成 api-index.json + API-INDEX.md
    --source <path>           OpenAPI 文件路径 (default: docs/context/api/openapi.yaml)
    --out-json <path>         JSON 输出路径 (default: docs/context/api/api-index.json)
    --out-md <path>           Markdown 输出路径 (default: docs/context/api/API-INDEX.md)
    --repo-root <path>        仓库根目录 (default: cwd)
    --touch                   生成后自动运行 ctl-context touch

  verify            验证 api-index.json 与 openapi.yaml 是否一致
    --source <path>           OpenAPI 文件路径
    --index <path>            API Index 文件路径
    --strict                  校验和不匹配时以非零退出码终止

  diff              显示 openapi.yaml 变更后 api-index.json 需要更新的端点
```

**脚本逻辑**（伪代码）：

```
1. 读取 openapi.yaml，解析 paths
2. 遍历 paths.{path}.{method}:
   a. 提取 operationId, summary, tags[0], security
   b. 展开 requestBody schema → 提取 required/optional 字段名
   c. 展开 responses.2xx schema → 提取核心字段名
   d. 收集所有 error status codes
   e. 生成示例 curl
3. 计算 openapi.yaml 的 SHA-256 作为 sourceChecksumSha256
4. 写入 api-index.json
5. 生成 API-INDEX.md（表格视图）
6. 如果 --touch，运行 ctl-context touch 更新 registry 校验和
```

### 4c. CI 集成（漂移检测）

在项目 CI 流水线中添加验证步骤：

```yaml
# .github/workflows/ci.yml (示例)
- name: Verify API context
  run: |
    # 1. 如果使用代码生成器（成长期/成熟期），先重新生成 OpenAPI
    # npm run generate:openapi  # 取消注释以启用

    # 2. 从 OpenAPI 重新生成 API Index
    node .ai/scripts/ctl-api-index.mjs generate --touch

    # 3. 检查是否有未提交的变更（漂移检测）
    git diff --exit-code docs/context/api/api-index.json \
      || (echo "ERROR: api-index.json is out of date. Run: node .ai/scripts/ctl-api-index.mjs generate --touch" && exit 1)

    # 4. 校验 Context 层一致性
    node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict
```

### 4d. 代码生成器集成（可选，适用于成长期+）

对于使用代码注解的项目，建议集成代码优先的 OpenAPI 生成器：

| 技术栈 | 推荐工具 | 注解方式 |
|--------|---------|---------|
| Express/Koa (JS/TS) | `swagger-jsdoc` + `swagger-ui-express` | JSDoc 注释 |
| NestJS | `@nestjs/swagger` | 装饰器 |
| FastAPI (Python) | 内置 | 类型提示 + Pydantic |
| Spring Boot (Java) | `springdoc-openapi` | 注解 |
| Go (Gin/Echo) | `swaggo/swag` | 注释 |

集成后的数据流：

```
源码注解  ──生成器──▶  openapi.yaml  ──ctl-api-index──▶  api-index.json
                           │                                   │
                           └────── ctl-context touch ──────────┘
                                         │
                                    registry.json
                                    (checksums updated)
```

### 4e. Git Hook（可选，适用于成熟期）

```bash
# .githooks/pre-commit（本仓库使用 .githooks/，非 Husky）
#!/bin/sh
# 检查 OpenAPI 是否变更
if git diff --cached --name-only | grep -q "docs/context/api/openapi.yaml"; then
  echo "[pre-commit] OpenAPI changed — regenerating API Index..."
  node .ai/scripts/ctl-api-index.mjs generate --touch
  git add docs/context/api/api-index.json docs/context/api/API-INDEX.md docs/context/registry.json
fi
```

## 5. 与现有 Context Awareness 的集成

### 5a. Registry 注册

生成后，`api-index.json` 需注册到 `docs/context/registry.json`：

```bash
node .ai/skills/features/context-awareness/scripts/ctl-context.mjs add-artifact \
  --id api-index \
  --type json \
  --path docs/context/api/api-index.json \
  --mode generated \
  --format api-index-v1 \
  --tags api,index,llm
```

最终 registry 中将包含两个 API 制品：

| id | type | 用途 |
|----|------|-----|
| `api-openapi` | openapi | 完整 API 定义（权威） |
| `api-index` | json | LLM 速查摘要（衍生） |

### 5b. INDEX.md 更新

在 `docs/context/INDEX.md` 中追加 API Index 说明：

```markdown
## What lives here

- API contract: `docs/context/api/openapi.yaml`
- **API index (LLM summary): `docs/context/api/api-index.json`** ← 新增
- Database schema contract: `docs/context/db/schema.json`
```

### 5c. LLM 加载协议（更新）

```
1. 读取 docs/context/registry.json         → 获取制品列表
2. 读取 docs/context/api/api-index.json     → 获取 API 全貌（1 次读取）
3. [按需] 读取 docs/context/api/openapi.yaml → 获取具体端点完整定义
4. [按需] 读取源码目录（参照 x-source-mapping）→ 理解实现细节
```

## 6. 文件布局总览

```
docs/context/
├── INDEX.md                          # LLM 入口文件
├── registry.json                     # 制品注册中心（含校验和）
├── api/
│   ├── openapi.yaml                  # Layer 1: 完整 OpenAPI 合约
│   ├── api-index.json                # Layer 2: LLM 速查摘要 (generated)
│   └── API-INDEX.md                  # Layer 2: 人类可读表格 (generated)
├── db/
│   └── schema.json                   # DB schema 合约
└── process/
    └── *.bpmn                        # 业务流程

.ai/scripts/
└── ctl-api-index.mjs                 # API Index 生成脚本 (新增)
```

## 7. 验证清单

| 检查项 | 命令 | 说明 |
|--------|------|------|
| API Index 与 OpenAPI 一致 | `node .ai/scripts/ctl-api-index.mjs verify --strict` | 校验和比对 |
| Context 层整体一致 | `node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict` | 校验 registry |
| OpenAPI 格式合法 | 外部工具 (`swagger-cli validate`) | 格式校验 |
| 无代码 ↔ 合约漂移 | CI `git diff --exit-code` | 重新生成后无差异 |

## 8. 迁移路径（渐进式采纳）

### Phase 0 — 立即可做（无需代码）
1. 将现有 API 端点填入 `docs/context/api/openapi.yaml`
2. 运行 `ctl-context touch`

### Phase 1 — 添加 API Index 生成
1. 实现 `ctl-api-index.mjs` 脚本
2. 首次运行生成 `api-index.json` + `API-INDEX.md`
3. 注册到 registry

### Phase 2 — CI 卡点
1. 添加 CI 步骤：`ctl-api-index.mjs verify --strict`
2. 添加 CI 步骤：`ctl-context verify --strict`

### Phase 3 — 代码优先（可选）
1. 集成 OpenAPI 代码生成器
2. CI 中先生成 OpenAPI，再生成 API Index
3. 添加 pre-commit hook 自动更新

## 9. 边界与约束

- **不存储密钥**：`api-index.json` 中的 curl 示例使用 `<token>` 占位符
- **不替代 OpenAPI**：API Index 是衍生物，不是权威源
- **不自动执行生成器**：`ctl-api-index.mjs` 只处理 OpenAPI → Index 的转换，不调用代码生成器
- **不强制代码优先**：小项目可以一直手动维护 OpenAPI
- **不侵入运行时**：所有机制仅作用于开发/CI 阶段
