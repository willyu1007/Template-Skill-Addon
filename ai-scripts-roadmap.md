# AI 脚本整理与职责收敛：改进思路与方案（Roadmap）

## Purpose

在不牺牲安全性/可维护性的前提下，降低脚本入口噪音、明确职责边界，并让“脚本在哪里/该用哪个”对人和 LLM 都更可发现、更可验证。

本 Roadmap **只做规划**：不包含代码修改。

---

## Agreed Decisions（已对齐）

1. **保留** `cictl.js`（CI 模板落地 glue 有独立价值）。
2. `dbctl.js` 属于 **DB mirror 专属工具**：从 `.ai/scripts/` 迁移到 `.ai/skills/features/database/sync-code-schema-from-db/scripts/`，并通过文档/初始化流程明确其边界。
3. `skillsctl.js` 属于 **skills/_meta 管理工具**：迁移到 `.ai/skills/_meta/`，不保留薄入口；同时更名为更明确的脚本名，并更新所有引用。
4. 删除技能能力 **并入** `sync-skills.cjs`：使用显式开关 + 强保护栏，并在删除后同步更新 `.ai/skills/_meta/sync-manifest.json` 与 packs state。

---

## Scope / Non-goals

### In scope
- 调整脚本归属与入口路径：将“repo 级 controller”与“feature/skill 专属工具”分层放置。
- 统一删除技能的入口与语义（SSOT + stubs 默认），减少重复脚本。
- 更新所有文档与 init pipeline 的引用，保持可发现与可验证。

### Out of scope（本轮不做）
- 不修改业务代码、应用配置、DB 状态。
- 不调整 skill pack 的内容划分策略（仅调整管理工具位置/入口/命名）。

---

## Target End-state（目标形态）

### Directory ownership（目录职责）

| 位置 | 归属 | 放什么 | 示例 |
|---|---|---|---|
| `.ai/scripts/` | Repo-level controllers | 面向“仓库/初始化/跨 feature”的控制脚本与通用 gate | `contextctl.js`, `projectctl.js`, `dbssotctl.js`, `sync-skills.cjs`, `lint-*.cjs`, `cictl.js` |
| `.ai/skills/features/**/scripts/` | Feature-local tools | 只对某个 feature/workflow 有意义的工具链 | DB mirror：`dbctl.js`, `migrate.js`（迁移后） |
| `.ai/skills/_meta/` | Skills selection metadata | manifest/packs/state + 相关管理脚本 | `sync-manifest.json`, packs json, （迁移后）skill packs 控制脚本 |

---

## Change Set A — 保留并“显式化” cictl.js

### Why keep
`test-ci-github-actions` / `test-ci-gitlab-ci` skills 解决“怎么设计 CI”；`cictl.js` 解决“把模板一键落到仓库正确位置并写最小骨架配置”，两者不是重复。

### Planned doc updates（让它可发现）
- 在 `init/feature-docs/README.md` 或新增 `init/feature-docs/ci.md` 中增加入口说明：
  - `node .ai/scripts/cictl.js init --provider github|gitlab --repo-root .`
  - `node .ai/scripts/cictl.js verify --repo-root .`

### Acceptance criteria
- 文档中能找到 `cictl.js` 的用途与命令入口。
- `cictl.js --help` 输出覆盖 init/verify/status 的使用路径。

---

## Change Set B — DB mirror 工具迁移到 database feature skill

### Responsibility split（职责边界明确）

- `dbssotctl.js`（保留在 `.ai/scripts/`）
  - MUST：只负责“SSOT-aware 的 DB contract 生成/更新”
  - 输出：`docs/context/db/schema.json`
  - CI-safe：不需要 DB 连接

- DB mirror 工具（迁移到 `.ai/skills/features/database/sync-code-schema-from-db/scripts/`）
  - MUST：只负责“mirror 侧”的 init/import/verify/list/migration tracking
  - 输入：`prisma/schema.prisma`（当需要从 Prisma 导入 mirror 时）/ `db/schema/tables.json`
  - 输出：`db/schema/tables.json`、`db/migrations/*`、`db/config/*`

### Proposed file moves（建议迁移清单）

| From | To |
|---|---|
| `.ai/scripts/dbctl.js` | `.ai/skills/features/database/sync-code-schema-from-db/scripts/dbctl.js` |
| `.ai/scripts/migrate.js` | `.ai/skills/features/database/sync-code-schema-from-db/scripts/migrate.js` |

> 可选（若希望减少跨目录 import 深度）：将 `.ai/scripts/lib/normalized-db-schema.js` 上移为共享库（例如 `.ai/lib/normalized-db-schema.js`），并调整 `dbssotctl.js` 与 DB mirror 工具的 import 路径。

### Required reference updates（必须改引用的地方）
- `init/README.md`：Database feature 的 control script 路径
- `init/feature-docs/database.md`：示例命令路径
- `init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs`：Stage C 执行/检测 DB 工具路径（原本假设 `.ai/scripts/dbctl.js`）
- 其他 repo 文档中出现的 `node .ai/scripts/dbctl.js ...` 引用（需全量替换）

### Compatibility note
此变更是**硬 breaking**（旧命令路径失效），因此文档与 init pipeline 必须一次性同步更新。

### Verification
- `node .ai/scripts/dbssotctl.js status`
- `node .ai/scripts/dbssotctl.js sync-to-context --repo-root .`
- `node .ai/skills/features/database/sync-code-schema-from-db/scripts/dbctl.js help`
- `node .ai/skills/features/database/sync-code-schema-from-db/scripts/migrate.js --help`

---

## Change Set C — skillsctl.js 迁移到 _meta 并更名

### Why
`skillsctl.js` 的核心职责是“packs 状态机 + 更新 `.ai/skills/_meta/*` + 触发 wrapper sync”，天然属于 `_meta`。

### Proposed rename（需要你确认最终命名）

候选名（按“更明确”的原则）：
- ✅ `skillpacksctl.js`（推荐：一眼可知是 skill packs controller）
- `packsctl.js`（不推荐：与 packaging 的 `packctl.js` 混淆）

### Proposed move
- From: `.ai/scripts/skillsctl.js`
- To: `.ai/skills/_meta/skillpacksctl.js`（以推荐名为例）

### Required reference updates
- `.ai/AGENTS.md`：所有提到 `.ai/scripts/skillsctl.js` 的位置
- `.ai/skills/scaffold/packs/manage-skill-packs/SKILL.md`（以及其 reference/模板如有）：命令入口替换为新路径
- `init/stages/03-stage-c-scaffold-and-skills.md`：scheme A 描述中的路径
- `init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs`：Stage C 对 skillsctl 的探测/调用路径

### Packs state file（state 命名）
当前 state 文件为 `skillsctl-state.json`。迁移后有两种策略：
- A（最小改动）：继续使用 `skillsctl-state.json`
- B（语义一致）：改名为 `skillpacksctl-state.json`，并同步所有读写逻辑与文档

本 Roadmap 默认采用 **A**（最小改动），除非你明确要求更名 state 文件。

---

## Change Set D — delete-skills.cjs 合并进 sync-skills.cjs

### Goal
删除技能（SSOT + stubs）与 wrapper 同步统一由 `sync-skills.cjs` 管理，避免两套“skill 发现/解析/安全确认”逻辑并存。

### Proposed CLI shape（建议）

在 `sync-skills.cjs` 中新增显式开关（示例）：
- `--delete-skills <csv>`：删除 SSOT + stubs（默认 scope=all）
- `--scope <all|ssot|providers>`：可选覆盖（默认 `all`）
- `--clean-empty`：清理空目录（与现有 delete-skills 行为对齐）
- `--update-meta`：删除后更新 `_meta`（默认开启；可保留为显式 flag，但仍受 `--yes` 保护）
- `--dry-run`：预览
- `--yes`：强制要求（无论 dry-run 与否的策略需明确；推荐：dry-run 不要求 yes，真正删除必须 yes）

并将现有 `--delete <csv>` 语义明确为 wrappers-only（可考虑更名为 `--delete-wrappers`，但属于 breaking；需评估兼容性）。

### Meta updates（顺带更新）
删除 SSOT skill 后：
- MUST：从 `.ai/skills/_meta/sync-manifest.json` 的 `includeSkills` / `excludeSkills` 中移除被删除 skill 的 name（若存在）
- SHOULD：若存在 packs state 文件（例如 `skillsctl-state.json`），在删除后执行一致性修复：
  - enabled pack 文件缺失：警告或在 `--fix-meta` 下自动剔除
  - manifest 引用缺失 skill：自动剔除（同 MUST）

### Required reference updates
- `init/AGENTS.md`：删除技能的命令入口（替换 `delete-skills.cjs`）
- `init/skills/initialize-project-from-requirements/SKILL.md`：删除技能示例命令
- 仓库中任何 `delete-skills.cjs` 路径引用

### Verification
- `node .ai/scripts/sync-skills.cjs --dry-run --delete-skills "<csv>"`（仅预览）
- `node .ai/scripts/sync-skills.cjs --delete-skills "<csv>" --yes`（真删，需在安全场景验证）
- 删除后：`node .ai/scripts/sync-skills.cjs --scope current --providers both --mode reset --yes`

---

## Execution Order（建议落地顺序）

1. 迁移并更名 `skillsctl.js`（因为它影响 init pipeline 的 scheme A 逻辑与 pack 管理入口）
2. 更新所有引用（docs + init pipeline）
3. DB mirror 工具迁移（`dbctl.js` / `migrate.js`）并更新引用
4. `delete-skills` 合并到 `sync-skills`，删除旧脚本并更新引用
5. 全量验证（见下）

---

## Verification Checklist（落地后验收）

- [ ] `node .ai/scripts/lint-skills.cjs --strict` 通过
- [ ] `node .ai/scripts/sync-skills.cjs --scope current --providers both --mode reset --yes` 正常生成 wrappers
- [ ] init pipeline 的 Stage C `apply` 能在启用相关 feature 时找到并运行正确的 controller（尤其 database / packs）
- [ ] 新路径的 `cictl` / DB mirror 工具 / skill packs controller 的 `--help` 可用且文档有入口
- [ ] 删除技能后：manifest/packs state 无悬挂引用（或有清晰 warning + 修复路径）

---

## Risks & Mitigations

- 风险：大量硬路径引用导致“命令失效”
  - 缓解：先全量替换引用，再移动脚本；或在同一变更集中完成并用 `rg` 验证零遗留
- 风险：删除技能操作误用导致不可逆损失
  - 缓解：强制 `--yes` + 必须提供目标列表 + 默认 dry-run 教程 + 删除后自动重新 sync wrappers
- 风险：init pipeline 的“脚本位置假设”需要修改
  - 缓解：在 init pipeline 中将 controller 路径从“固定 `.ai/scripts/`”调整为“可配置/可映射”，并对缺失给出可操作错误信息

---

## Rollback Strategy

- 使用 `git revert` 或 `git checkout -- <paths>` 回滚脚本迁移与引用变更。
- 若已发生 skill 删除：从备份/上游重新同步 `.ai/skills/`（删除操作本质不可自动恢复）。

---

## Open Confirmation（执行前最后需要确认的点）

1. `skillsctl.js` 新名字最终采用：`skillpacksctl.js`（推荐）是否确认？
2. packs state 文件是否需要同步更名（默认不更名）？
3. `sync-skills.cjs` 中 wrappers-only 的删除 flag 是否要保留 `--delete` 旧语义（兼容）还是显式改名（更清晰但 breaking）？

