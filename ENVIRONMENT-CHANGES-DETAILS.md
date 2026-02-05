# 环境配置能力变更说明（动机 / 方案 / 细节）

日期：2026-02-05  
范围：环境能力（`env-contractctl` / `env-localctl` / `env-cloudctl` / init / skills stubs / tests）

## 结论摘要（先读）

- **秘密值 SSOT（云端）**：secret 值以外部系统（Bitwarden Secrets Manager，`bws`）为 SSOT；repo 只保存契约/引用，不保存值。
- **策略/路由 SSOT**：优先使用 `docs/project/policy.yaml` 的 `policy.env.cloud.targets` 做云端路由；`env/inventory/*` 作为兼容回退。
- **IaC SSOT + feature**：`ops/iac/<tool>/` 为 IaC SSOT；新增 `iacctl` 与 init pipeline 支持（`iac.tool` 选择 `none|ros|terraform`）。
- **注入范式（默认最无脑）**：云端注入默认走 **env-file 注入**（部署机生成 env-file → 本地复制或 SSH 推送到远程主机）。
- **远程执行可用但必须显式确认**：所有会执行远程命令的操作都要求额外的 `--approve-remote`。

## 背景与动机

- **安全边界**：避免 secret 值进入 Git、`.env.*`、IaC state/outputs；运行时 workload 不直接持有 Bitwarden token。
- **可预测性**：通过契约（`env/contract.yaml`）+ 策略（`docs/project/policy.yaml`）把“允许什么/禁止什么/如何失败”写死并可校验。
- **一致性**：本地与部署注入共享同一套契约/策略与生成逻辑，减少“本地能跑、上线不一致”。
- **模板 repo 约束**：不绑定具体云厂商 API/目标平台路径；提供的是 **范式与协作约定**（LLM + 人类）。

## 目标与边界

### 目标（本轮已落地）

- **本地注入**：`env_localctl` 支持 `bws` secrets backend；工具/证据不输出 secret 值。
- **策略 SSOT**：`env_contractctl init` 会 scaffold `docs/project/policy.yaml`（默认不覆盖），并由 `env_localctl` 执行 preflight。
- **部署机注入**：`env_cloudctl` 新增 `envfile` 适配器（legacy alias：`ecs-envfile`，仅为兼容）：
  - `transport: local`：部署机本地复制到目标路径
  - `transport: ssh`：部署机通过 `ssh/scp` 推送到远程主机，并做远程哈希校验
- **显式审批门槛**：
  - `apply` 必须 `--approve`
  - 任何远程命令（SSH/SCP）必须额外 `--approve-remote`

### 边界（刻意不做/仍需后续补齐）

- **vendor-specific 平台集成**：模板 repo 不提供对象存储上传、平台任务定义更新、服务滚动等实现；如项目需要，按 `env_cloudctl` adapter 模型新增 provider。
- **运行时内 preflight**：当前 preflight 发生在“生成配置时”；容器/主机启动前的运行时探测（容器内）未实现。

## 方案概览（SSOT 分层）

- **配置契约 SSOT**：`env/contract.yaml`
- **非密值 SSOT**：`env/values/<env>.yaml`
- **密值引用 SSOT**：`env/secrets/<env>.ref.yaml`（仅引用，无值）
- **策略 SSOT**：`docs/project/policy.yaml`（`auth_mode` / `preflight` 规则、`env.cloud.targets` 路由与 `bws` 默认约束）
- **IaC SSOT**：`ops/iac/<tool>/`（`iac.tool` 选择；与 env 工具解耦）

## 兼容性策略（不破坏既有用法）

- `policy.env.cloud.targets` 为**可选增强**；若无匹配目标，仍使用 `env/inventory/<env>.yaml`。
- 如需消除双 SSOT，可在 `policy.env.cloud.require_target: true` 下强制 **policy-only** 路由。
- `env/secrets/<env>.ref.yaml` 仍兼容 `ref` URI 写法（含 `bws://...`）。
- `ecs-envfile` 保留为 `envfile` 的 legacy alias（仅兼容，不作为推荐写法）。

## 关键变更（按组件）

### 1) `env-contractctl`：初始化与策略骨架

- `init` 现在会 scaffold：
  - `docs/project/env-ssot.json`（SSOT gate：`repo-env-contract`）
  - `docs/project/policy.yaml`（v1 skeleton；默认不覆盖已有文件）
- `policy.yaml` 包含：
  - `policy.env.*`：确定性合并策略、默认 `auth_mode/preflight`、规则列表
  - `policy.env.cloud.*`：云端路由与注入默认值（`targets` 可选；有则优先）
  - `policy.env.secrets.backends.bws`：可选 `project_name/project_id/key_prefix` 默认约束
  - `policy.iac.*`：IaC 运营占位（默认 `tool: none`，由 `iac.tool` 显式启用）

### 2) `env-localctl`：本地注入 + 策略 preflight + 部署机编译

- 新增 `bws` backend（详见 `BITWARDEN-SECRETS-BACKEND.md`）：
  - 通过 `BWS_ACCESS_TOKEN` 调用 `bws` CLI 拉取 secret 值
  - **禁止**在日志/证据中输出 secret 值
  - 支持从 `policy.env.secrets.backends.bws` 读取默认 `project_name/project_id/key_prefix`（可选）
- 引入策略 preflight：
  - 读取 `docs/project/policy.yaml`
  - 通过 `--runtime-target <local|remote>` 与 `--workload <api|worker|...>` 选择规则
  - 对“AK 污染/凭证链信号”做 `warn/fail/off` 执行
- 支持部署机编译：
  - `compile --env-file <path> --no-context`：生成目标 env-file，但不写入 repo 的 LLM context

### 3) `env-cloudctl`：env-file 注入适配器（vendor-neutral）

#### 3.0 policy 路由（优先，兼容 inventory）

- 读取 `docs/project/policy.yaml` 的 `policy.env.cloud.targets` 作为优先路由入口。
- `match` 支持 `env/runtime_target/workload`；通过 `--runtime-target/--workload` 选择。
- 若无匹配目标，则自动回退 `env/inventory/<env>.yaml`（兼容既有实现）。
- 可选 `policy.env.cloud.require_target: true` 禁用回退（policy-only）。
- 支持 `provider: ssh` 作为 `envfile + transport=ssh` 的别名。

#### 3.1 provider：`envfile`（legacy alias：`ecs-envfile`）

- 输入：`env/inventory/<env>.yaml` 的 `injection.*`
- `plan`：计算 env-file 的 `sha256/size/mtime`，与 deployed state 对比生成 diff（不含 secret 值）
- `apply`（写操作）：
  - 需要 `--approve`
  - 若 `injection.transport=ssh`，还需要 `--approve-remote`
  - 路由来源与 `plan` 一致（policy targets 优先，inventory 为回退）
- `verify`：
  - 默认仅验证“desired vs deployed state”（不触达远程主机）
  - 可选 `verify --remote --approve-remote`：对 `transport=ssh` 做远程文件哈希校验

#### 3.2 transport：`local | ssh`

- `local`（默认）：部署机本地复制到 `injection.target`
- `ssh`：对每个 host 执行：
  1) `scp` 上传到远程临时路径（`injection.write.remote_tmp_dir`）
  2) （可选）`sudo -n` 原子落盘：`cp → chmod → mv`
  3) 远程哈希校验（`sha256sum/shasum/openssl` 之一）
  4) （可选）执行 `pre_commands` / `post_commands`（**MUST NOT** 输出 secret 值）

#### 3.3 inventory schema 与示例

- 规范：`.ai/skills/features/environment/env-cloudctl/references/inventory-format.md`（含 policy targets 说明）
- 示例：
  - `.ai/skills/features/environment/env-cloudctl/examples/inventory.envfile.sample.yaml`
  - `.ai/skills/features/environment/env-cloudctl/examples/inventory.envfile.ssh.sample.yaml`
- 主机来源：
  - 手写 `ssh.hosts`
  - 或 `ssh.hosts_file`（来自 IaC outputs；支持 JSON/YAML/纯文本）

#### 3.4 secret refs 校验（不含值）

- `env_cloudctl` 只处理 secret 引用，不解析值；但会对引用结构做强校验：
  - 禁止 `value` 字段（防止把 secret 值写进 repo）
  - `bws` ref 支持 `ref` 或 `(project_id|project_name)+key` 两种写法
  - 可选 `scope` 与 `policy.env.secrets.backends.bws` 默认值配合使用

#### 3.5 deployed state 存放（避免误提交基础设施细节）

- `mockcloud`：`.ai/mock-cloud/<env>/state.json`（测试依赖）
- 其他 provider（含 `envfile`）：`.ai/.tmp/env-cloud/<env>/state.json`（已 gitignore）

### 4) init 文档、测试与 stubs

- init 文档同步：`init/_tools/feature-docs/environment.md` 补齐 `policy.yaml` 产出与远程执行门槛说明。
- init 新增 IaC feature 文档：`init/_tools/feature-docs/iac.md`（`iac.tool` 触发）
- 环境系统测试修复：`.env.example` 校验路径改为 `env/.env.example`。
- skills stubs（生成物）：
  - `.ai/` 是 SSOT；`.codex/skills/` 与 `.claude/skills/` 为生成物且 **建议提交**（便于 clone 即用）
  - 生成命令：`node .ai/scripts/sync-skills.mjs --scope current --providers both --mode reset --yes`

### 5) IaC feature（SSOT + init）

- 新增 `iacctl`：生成 `ops/iac/<tool>/` 与 `docs/context/iac/overview.json`（无敏）。
- 若启用 Context Awareness 且存在 registry，`iacctl` 会尝试登记 `iac-overview`（失败不阻断）。
- init pipeline 支持 `iac.tool`（`none|ros|terraform`），并在 `--verify-features` 时运行 `iacctl verify`。
- 不执行真实 `plan/apply`；IaC 仍由人/CI 执行与审计。

## 典型流程（范式）

### dev 本地（本地注入）

1. `env-localctl doctor` 检查缺失项（含 policy preflight）
2. `env-localctl compile` 生成 `.env.local` 与 redacted context
3. 启动本地服务

### 部署机（env-file 生成 + 注入）

1. 部署机生成 env-file（从 `bws` 拉取值，但不写入 context）：
   - `env-localctl compile --runtime-target remote --workload api --env-file ops/deploy/env-files/<env>.env --no-context`
2. 配置云端路由：
   - 优先：`docs/project/policy.yaml` → `policy.env.cloud.targets`
   - 兼容：`env/inventory/<env>.yaml`（`provider: envfile`，或 legacy `ecs-envfile`）
3. `env-cloudctl plan` → 人审 → `env-cloudctl apply --approve`（`ssh` 时加 `--approve-remote`）
4. 可选：`env-cloudctl verify --remote --approve-remote` 做远程哈希核验

## 风险与待办

- **policy 执行面仍可加强**：补齐 role/STS 链路可用性验证与运行时启动前探测。
- **inventory 与 IaC outputs 的职责收敛**：推荐把主机清单放 IaC outputs（`ssh.hosts_file`），inventory 保持极薄（routing + 注入 spec）。
- **vendor-specific provider**：如项目需要对象存储/平台更新，按 adapter 边界扩展，并保持“不落 secret 值”的不变量。

## 验证命令（本仓库）

- `node .ai/scripts/lint-skills.mjs --strict`
- `node .ai/scripts/sync-skills.mjs --scope current --providers both --mode reset --yes`
- `node .ai/tests/run.mjs --suite environment`
- `node .ai/tests/run.mjs --suite iac`
