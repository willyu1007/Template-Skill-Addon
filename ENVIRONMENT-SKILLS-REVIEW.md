# 环境管理能力评审报告（skills + init）

日期：2026-02-05  
范围：`BITWARDEN-SECRETS-BACKEND.md`、`ENVIRONMENT-STRATEGY.md`、`init/_tools/feature-docs/environment.md`、`.ai/skills/features/environment/*`

## 结论摘要

- **本地注入**：`env_localctl` 支持 Bitwarden Secrets Manager（`bws`）且不输出 secret 值；支持从 `policy.env.secrets.backends.bws` 读取默认约束（可选）。
- **云端注入（范式）**：`envfile` 适配器（legacy alias：`ecs-envfile`）以**最易维护**方式做 env-file 注入（部署机本机复制 + `ssh/scp` 推送远程主机 + 哈希校验）；路由优先来自 `policy.env.cloud.targets`，inventory 作为兼容回退。
- **policy-only 可选**：新增 `policy.env.cloud.require_target: true` 可禁用 inventory 回退，消除双 SSOT。
- **策略 SSOT**：`docs/project/policy.yaml` 在 `env_contractctl init` 中生成骨架并被 `env_localctl` 用于 preflight；新增 `policy.env.cloud` 与 `policy.env.secrets.backends.bws` 约束入口。
- **IaC feature**：新增 `iacctl` 与 init pipeline 支持（`iac.tool` 选择 `none|ros|terraform`），生成 `ops/iac/<tool>/` 与 `docs/context/iac/overview.json`。

## 已执行修正（本轮改动）

- **修复路径引用错误**：环境测试原先检查根目录 `.env.example`，实际生成路径为 `env/.env.example`，已对齐测试。
- **补齐策略 SSOT 产出**：`env_contractctl init` 现在会 scaffold `docs/project/policy.yaml`（默认不覆盖），并新增 `policy.env.cloud` 与 `policy.env.secrets.backends.bws` 骨架。
- **对齐 bws 配置格式**：`env_cloudctl`/`env_localctl` 支持 `bws` 的两种 ref 写法（`ref` 或 `project_name/project_id + key`），并支持 policy 默认值与 `scope`（可选）。
- **policy preflight 落地**：`env_localctl` 读取 `docs/project/policy.yaml` 并执行 `auth_mode/preflight` 检测；`runtime_target/workload` 与 `--env-file/--no-context` 支持部署机注入。
- **云端注入 adapter**：`env_cloudctl` 支持 `envfile` 适配器（legacy alias：`ecs-envfile`），`transport: local|ssh`；`ssh` 执行需 `--approve-remote`；非 mockcloud 的 deployed state 默认写入 `.ai/.tmp/env-cloud/` 以避免误提交。
- **policy 路由**：`env_cloudctl` 优先使用 `policy.env.cloud.targets`，无匹配时回退 `env/inventory/<env>.yaml`；支持 `--runtime-target/--workload` 精确匹配。
- **apply 路由一致性**：`env_cloudctl apply` 与 `plan/verify` 使用相同的 policy 路由（避免 policy-only 场景仍读取 inventory）。
- **IaC feature**：新增 `iacctl` + init pipeline 支持（`iac.tool` 选择），并补齐 `init/_tools/feature-docs/iac.md`。

## 需求覆盖核对（摘要）

### ✅ 已覆盖
- **本地 secrets 注入（Bitwarden）**：`env_localctl` 支持 `bws`，并避免在日志/报告输出 secret 值。
- **契约驱动**：`env/contract.yaml` + `env/values/<env>.yaml` + `env/secrets/<env>.ref.yaml` 的 SSOT 流程可用。
- **生成非敏感 artifacts**：`env/.env.example`、`docs/env.md`、`docs/context/env/contract.json`。
- **策略 preflight**：`env_localctl` 已读取 `policy.yaml` 并执行 `auth_mode/preflight` 检测（默认不输出 secrets）。
- **云端路由策略**：`policy.env.cloud.targets` 已可用于路由，inventory 作为兼容回退。
- **IaC feature**：`iacctl` 与 init pipeline 可生成 `ops/iac/<tool>/` + `docs/context/iac/overview.json`。

### ⚠️ 仍缺口/不完全
- **云厂商特定注入**：模板 repo 刻意不提供“云对象存储上传 + 平台引用更新”等 vendor-specific 实现；如项目需要，建议以 `env_cloudctl` 的 adapter 模型为边界新增自定义 provider。
- **策略执行仍不完整**：`policy.env` 的 role 链路“可用性验证”（如 metadata/STS 探测）与启动前 preflight 仍需补齐。
- **policy 路由与 inventory 并存**：当前仍保留 `env/inventory/<env>.yaml` 作为兼容回退；若项目希望消除双 SSOT，需要在落地项目里做强约束/治理。

## 发现的问题与阻断点

### 已修复
- **路径引用错误**：环境测试错误检查 `.env.example`（根目录） → 已改为 `env/.env.example`。
- **bws ref 兼容性**：`env_cloudctl` 之前强制要求 `ref`，与推荐写法冲突 → 已放宽并支持 `project_name/project_id + key`。
- **策略文件缺失**：`docs/project/policy.yaml` 未生成 → 已在 `env_contractctl init` 中自动 scaffold。
- **policy 路由缺口**：`env_cloudctl` 现已支持 `policy.env.cloud.targets`（无匹配时回退 inventory）。

### 仍需处理
- **策略执行仍不完整**：`policy.env` 的 role 链路可用性验证与“启动前” preflight 未实现（当前仅在 `env_localctl` 生成时做检测）。
- **policy 路由治理**：当前仍保留 inventory 作为兼容回退；如需消除双 SSOT，应在项目侧强制只使用 policy targets 或 IaC outputs。
- **policy-only 开关**：已提供 `policy.env.cloud.require_target`，但仍需在落地项目中明确启用与治理。

## init/ 目录是否需要同步调整？

**结论：需要。**  
已在 `init/_tools/feature-docs/environment.md` 中补充 `policy.yaml` 产出与路由说明，并新增 `init/_tools/feature-docs/iac.md`。

## 验证与工具

- `node .ai/tests/run.mjs --suite environment`（PASS）
- `node .ai/tests/run.mjs --suite iac`（PASS）
- `node .ai/scripts/lint-skills.mjs --strict`（PASS）
- `node .ai/scripts/sync-skills.mjs --scope current --providers both --mode reset --yes`（PASS，已刷新 `.codex/` / `.claude/` stubs）

## 下一步建议（按优先级）

1. **强化 policy 执行**：补齐 role 链路可用性验证（metadata/STS 探测）与启动前 preflight。
2. **收敛 inventory 职责**：将 `env/inventory` 明确为“routing + 注入 spec”，主机清单优先来自 IaC outputs（`ssh.hosts_file`）。
3. **如需 vendor-specific**：在 adapter 模型边界新增 provider（例如对象存储上传/平台引用更新），并保持 secrets 值不落库/不进 Git。
