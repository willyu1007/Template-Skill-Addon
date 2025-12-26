# 模板 Repo 使用说明（Addon 版本）

本文档面向“Addon 版本模板 repo”（它包含 Basic 版本的全部能力）。目标是说明关键机制与关键流程，帮助你在任意项目中以最小成本获得可用的 Skills、可验证的初始化管道，以及可选的“上下文有感知（API/DB/BPMN）”能力。

---

## 1. 核心目标与设计约束

### 1.1 Single Source of Truth（SSOT）与 Provider Wrappers

- **SSOT**：所有技能的“唯一可信来源”放在：
  - `.ai/skills/**/SKILL.md`
- **Provider wrappers**：为了适配不同 provider 的原生 skills 发现机制，维护两个生成目录：
  - `.codex/skills/**/SKILL.md`
  - `.claude/skills/**/SKILL.md`

重要规则：

- **只允许编辑 `.ai/skills/`**（SSOT）。
- **禁止直接编辑 `.codex/skills/` 与 `.claude/skills/`**（这些是可再生成的 wrappers）。

### 1.2 统一同步入口：sync-skills.js

模板约定所有 wrappers 的生成/更新都通过一个脚本完成：

- `node .ai/scripts/sync-skills.js ...`

这样可以避免不同脚本各自实现同步逻辑带来的行为不一致和语义冲突。

---

## 2. Skills 同步与选择（开箱即用）

### 2.1 默认即用

模板 repo 已经包含了生成后的 wrappers（`.codex/skills`、`.claude/skills`），因此**克隆即用**。

### 2.2 手动同步（在你修改 `.ai/skills/` 之后）

```bash
node .ai/scripts/sync-skills.js --scope current --providers both
```

常用参数（以脚本自带帮助为准）：

- `--providers`: `codex` / `claude` / `both`
- `--scope`:
  - `current`: 使用 `.ai/skills/_meta/sync-manifest.json` 的当前选择
  - `minimal` / `all`: 其他预置范围
- `--mode`:
  - `reset`: 先清空目标目录再生成（确定性更强）
  - `update`: 增量更新

### 2.3 Sync Manifest（技能选择 SSOT）

技能启用/禁用通过以下文件表达：

- `.ai/skills/_meta/sync-manifest.json`

当前模板使用**扁平 manifest schema**：

```json
{
  "version": 1,
  "includePrefixes": ["workflows/"],
  "includeSkills": [],
  "excludeSkills": []
}
```

含义：

- `includePrefixes`：按目录前缀批量启用一组 skills（推荐）
- `includeSkills`：按 skill name 精确启用
- `excludeSkills`：按 skill name 精确禁用（用于兜底）

---

## 3. 初始化：可验证的三阶段管道（Stage A/B/C）

初始化被设计为“可验证的三阶段管道”，减少 LLM 与人之间的理解偏差，并将初始化过程变成可审计、可重复执行的工程步骤。

入口脚本：

- `node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js ...`

### 3.1 Stage A：需求文档（Requirements）

输出（建议）：

- `docs/project/requirements.md`
- `docs/project/non-functional-requirements.md`
- `docs/project/domain-glossary.md`
- `docs/project/risk-open-questions.md`

自动验证（建议 CI/本地都跑）：

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js   check-docs --docs-root docs/project --strict
```

Stage A 的核心是让“高质量需求”变成**可验证的 artifact**。

### 3.2 Stage B：蓝图（Blueprint）

输出：

- `docs/project/project-blueprint.json`

验证：

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js   validate --blueprint docs/project/project-blueprint.json
```

Blueprint 的核心是把 Stage A 的自然语言，压缩成可执行的结构化决策（目录结构、语言、模块、能力等）。

### 3.3 Stage C：脚手架 + Skills（Deterministic Apply）

Dry-run（建议先跑）：

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js   scaffold --blueprint docs/project/project-blueprint.json --repo-root .
```

Apply（落盘 + 更新 manifest + 同步 wrappers）：

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js   apply --blueprint docs/project/project-blueprint.json --repo-root . --providers both --require-stage-a
```

Stage C 会做三件事：

1. 生成/补齐项目目录（只做“最小脚手架”，避免破坏性覆盖）
2. 更新 `.ai/skills/_meta/sync-manifest.json`
3. 调用 `sync-skills.js` 同步 `.codex/skills` 与 `.claude/skills`

### 3.4 可选：删除 init 目录（初始化完成后的收敛）

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js   cleanup-init --repo-root . --apply --i-understand
```

该删除被 `init/.init-kit` 保护，避免误删。

---

## 4. Add-on：上下文有感知（API / DB / BPMN）

### 4.1 目标

让 LLM 在工作时对项目的关键上下文“有感知”，且上下文是：

- **稳定目录**：可长期维护（而不是散落在对话里）
- **机器可读**：便于工具/脚本/LLM 消费
- **只能通过脚本更新**：保证一致性与可验证性（避免手工改造成漂移）

### 4.2 最小侵入 Hook 设计

Addon 模板把 add-on 内容放在：

- `addons/context-awareness/payload/`

默认**不落盘到默认路径**（不会默认出现 `docs/context/`、不会默认出现 context 管理脚本）。

当你在 blueprint 中显式声明：

```json
{
  "context": { "enabled": true }
}
```

并执行 Stage C `apply` 后，初始化脚本会：

1. 将 payload 中的内容复制到 repo 根（合并且不覆盖已有文件）：
   - `docs/context/`（上下文 SSOT）
   - `.ai/scripts/contextctl.js`（上下文更新入口）
   - `.ai/scripts/projectctl.js`（项目状态/配置入口）
   - `.ai/scripts/skillsctl.js`（pack 管理入口）
   - `.ai/skills/scaffold/**` 与 `.ai/skills/_meta/packs/**`（上下文相关技能与 packs）
2. 启用 `context-core` pack（更新 manifest，但不立即同步）
3. 最后统一调用 `sync-skills.js` 刷新 wrappers

### 4.3 上下文目录与注册表（Registry）

安装后，你会得到：

- `docs/context/`：上下文 SSOT 目录
- `docs/context/registry.json`：注册表（通常包含校验信息/哈希/元数据等）

约束：

- **不要手工编辑 `docs/context/*`**（除非你同时更新 registry；推荐全部走脚本）
- 让 LLM “只能通过脚本”更新上下文，可以通过：
  - 在 `AGENTS.md` 中加入策略片段（payload 内提供 snippet）
  - 在 CI 中加入校验步骤（payload 内提供 snippet）

### 4.4 三个关键脚本（建议 LLM 强制使用）

安装后，建议把这三条作为“唯一入口”写进策略：

- `node .ai/scripts/contextctl.js ...`：增量更新 API/DB/BPMN 上下文与 registry
- `node .ai/scripts/projectctl.js ...`：维护 `.ai/project/state.json`（例如项目阶段、环境配置、上下文模式等）
- `node .ai/scripts/skillsctl.js ...`：启用/禁用 packs，并在需要时触发同步（或只更新 manifest）

---

## 5. 常见工作流（建议）

### 5.1 新项目（不启用上下文 add-on）

1. 跑 Stage A：产出 docs/project
2. Stage B：产出 project-blueprint.json
3. Stage C：apply（会刷新 skills wrappers）
4. 可选：cleanup-init

### 5.2 新项目（启用上下文 add-on）

1. Stage A + Stage B 同上
2. Blueprint 增加：

```json
{
  "context": { "enabled": true }
}
```

3. Stage C：apply（会安装 payload、启用 pack、同步 wrappers）
4. 之后由 LLM 通过 `contextctl.js` / `projectctl.js` 更新上下文与状态
5. 可选：把 snippet 合并进 AGENTS + 把 CI 校验接入流水线

### 5.3 增加一个 API

推荐流程（启用 add-on 后）：

1. 实现 API（代码）
2. 使用脚本更新上下文（而不是手改）：
   - `node .ai/scripts/contextctl.js ...`（按脚本说明选择 add/update 命令）
3. CI 验证 registry 与上下文一致

### 5.4 数据库表结构变更

1. 迁移/变更落地（migrations 或 schema）
2. 通过 `contextctl.js` 更新 db schema snapshot（或映射输出）
3. CI 校验

### 5.5 业务流程（BPMN）调整

1. 更新流程定义
2. 用 `contextctl.js` 更新 BPMN 文件与 registry
3. CI 校验

---

## 6. 建议的落地原则

- **一切以 docs 为 SSOT**：requirements → blueprint → scaffold → sync wrappers
- **自动化优先**：能脚本化就脚本化；能校验就校验
- **最小侵入**：add-on 默认不污染核心路径；只有在 blueprint 明确声明后才启用
- **可回滚**：通过 manifest/packs 控制 skill 集合；通过 registry 控制上下文一致性

---

## 7. 进一步阅读（Repo 内）

- `AGENTS.md`：对 LLM 的总体工作规范
- `init/README.md`、`init/reference.md`、`init/stages/`：初始化管道细节
- `docs/skill-authoring-guidelines.md`：技能编写标准
- `docs/documentation-guidelines.md`：文档标准
- `addons/context-awareness/ADDON.md`：add-on 设计说明（以及 payload 内容）
