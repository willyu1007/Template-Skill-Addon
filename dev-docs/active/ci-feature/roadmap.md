# CI Feature（GitHub Actions / GitLab CI）— Roadmap

## Goal
- 将现有 CI 相关 skills 从 `.ai/skills/testing/` 迁移到 `.ai/skills/features/ci/`，完成去除 `test-` 的重命名，并把 CI 纳入 init Stage C 的 blueprint feature（`features.ci`）可选安装；同时升级为“可落地使用”的 CI 运行策略与规范（模板 + 控制脚本 + 约定 + 验证）。

## Non-goals
- 不为具体业务仓库实现真实测试用例/应用代码（只提供 CI 运行契约、模板、规范与验证工具）。
- 不在本次改动中支持除 GitHub Actions / GitLab CI 之外的 CI 平台（Jenkins 等只留扩展点）。
- 不自动创建/配置真实 secrets（仅定义需要的变量/映射与安全规范）。
- 不试图“卸载”既有 CI 文件（Stage C 保持非破坏性 copy-if-missing；清理由使用者自行决定）。

## Open questions and assumptions
### Resolved decisions (aligned)
- D1 (Q1): 命名采用方案 B：`github-actions-ci` / `gitlab-ci`
- D2 (Q2): init Stage C 在 `features.ci=true` 时 **自动落地** CI 工作流文件（copy-if-missing；必要时可用 `--force-features` 覆盖）
- D3 (Q3): 新增 `ci.provider`（`github|gitlab`）作为更直接的 SSOT；`ci.platform` 仅作为可选兼容/提示字段
- D4 (Q4): 默认 pnpm（`corepack enable` + `pnpm install --frozen-lockfile`），并在模板中提供清晰“替换点”（npm/yarn）
- D5: Stage C 仅落地 `ci.yml`；delivery 相关工作流/链路由用户显式启用（不在 `features.ci` 默认安装）
- D6: 不保留 `.ai/scripts/*ctl.mjs` 的 wrapper；强归属的 `*ctl.mjs` 移动到对应的 `features/<feature>/scripts/`，并同步所有引用路径

### Remaining open questions
- Q5: delivery 的“显式启用”方式采用哪种（至少选一种即可）？
  - A：CI feature 的 `cictl` 提供命令（例如 `add-delivery`）复制模板
  - B：只提供 skill procedure + 模板路径，用户手动复制/编辑工作流文件
  - C：作为独立 feature（例如 `features.delivery`）或独立可选开关（例如 `ci.deliveryEnabled`）

## Scope and impact
- Affected areas/modules:
  - skills：`.ai/skills/testing/test-ci-github-actions/`、`.ai/skills/testing/test-ci-gitlab-ci/` → `.ai/skills/features/ci/**`
  - controllers（强归属迁移）：`cictl/contextctl/obsctl/packctl/deployctl/releasectl` 从 `.ai/scripts/` 移动到对应 `features/<feature>/scripts/`（同步更新所有引用路径）
  - init：`init/feature-docs/ci.md`、`init/feature-docs/README.md`、`init/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs`、`init/skills/initialize-project-from-requirements/templates/project-blueprint.schema.json`、`init/skills/initialize-project-from-requirements/templates/project-blueprint.min.example.json`
- External interfaces/APIs:
  - CLI：`node .ai/skills/features/ci/scripts/cictl.mjs <init|verify|status>`（CI feature controller；不保留 `.ai/scripts` wrapper）
  - Blueprint：新增 `features.ci` 与 `ci.provider`；并与现有 `ci.*` 保持兼容
- Data/storage impact: 无（仅模板/文档/脚本）
- Backward compatibility:
  - 需要处理对旧 skill 名称与模板路径的引用（例如 `.ai/scripts/cictl.mjs` 当前指向 `.ai/skills/testing/test-ci-*`）

## Milestones
1. **Milestone 1**: 需求与命名/开关对齐
   - Deliverable: 迁移命名方案、blueprint 字段选择、Stage C 行为（自动/手动落地）定案
   - Acceptance criteria: open questions 全部有答案或写入明确假设 + 风险
2. **Milestone 2**: CI skills 迁移 + 重命名完成
   - Deliverable: 新目录 `.ai/skills/features/ci/` 下的两个 skills（去除 `test-`），以及所有引用更新
   - Acceptance criteria: `node .ai/scripts/lint-skills.mjs --strict` 通过；CI 模板/文档引用无旧路径残留
3. **Milestone 3**: 强归属 controllers 迁移完成（去 `.ai/scripts/*ctl.mjs`）
   - Deliverable: `cictl/packctl/deployctl/releasectl/obsctl/contextctl` 等移动到对应 feature 的 `scripts/` 下，并更新所有引用路径
   - Acceptance criteria: init Stage C `apply` 能在新路径下正常运行各 feature controller；相关 feature-docs/skills 文档命令全部更新
4. **Milestone 4**: CI 成为 Stage C 可选 feature
   - Deliverable: blueprint schema + example 更新；`init-pipeline apply` 可基于 `features.ci` 安装 CI（含可选 verify）
   - Acceptance criteria: `node init/.../init-pipeline.mjs validate` 接受包含 `features.ci` 的 blueprint；Stage C dry-run 输出包含 CI 安装动作
5. **Milestone 5**: CI “可用策略与规范”升级落地
   - Deliverable: CI 模板（GitHub/GitLab）升级、约定文档、最小验证策略（本地/CI）与失败排障指引
   - Acceptance criteria: `cictl init --provider <...>` 可生成可运行的工作流；`cictl verify` 能给出可执行的修复建议
6. **Milestone 6**: 全链路回归与文档更新
   - Deliverable: 所有相关 docs/索引更新；旧路径/旧命名处理完成（重定向或迁移说明）
   - Acceptance criteria: `sync-skills` reset（providers both）通过；init feature docs 列表包含 `ci`

## Step-by-step plan (phased)
> Keep each step small, verifiable, and reversible.

### Phase 0 — Discovery
- Objective: 确认迁移影响面与“CI feature”应承担的职责边界
- Deliverables:
  - 现状清单：CI skills、模板路径（当前由 `.ai/scripts/cictl.mjs` 引用）、init 文档/脚本中与 CI 相关的触点
  - 决策点：命名、blueprint 字段、Stage C 行为（自动/手动落地）
- Verification:
  - 运行 `rg`/人工检查确认没有遗漏的引用（重点：`.ai/scripts/cictl.mjs`、init pipeline、feature-docs）
- Rollback:
  - N/A（无代码变更）

### Phase 1 — 迁移与重命名（skills）
- Objective: 将 CI skills 强归属到 `features/ci`，并完成去 `test-` 的重命名
- Deliverables:
  - 新路径：
    - `.ai/skills/features/ci/github-actions-ci/...`
    - `.ai/skills/features/ci/gitlab-ci/...`
  - 更新 skill front-matter 的 `name:` 与文档标题/引用
  - 修复所有引用（包括 `.ai/scripts/cictl.mjs` 模板路径）
- Verification:
  - `node .ai/scripts/lint-skills.mjs --strict`
  - 分别运行两个 skill 的 `scripts/validate-skill.mjs`（迁移后路径）
- Rollback:
  - git revert（或保留旧目录为薄“转发 skill”，但需权衡维护成本）

### Phase 1.5 — 强归属 controllers 迁移（去 `.ai/scripts/*ctl.mjs`）
- Objective: 将 feature 强归属的 controllers 移动到对应 feature 目录，并同步所有引用路径
- Deliverables:
  - CI：`.ai/scripts/cictl.mjs` → `.ai/skills/features/ci/scripts/cictl.mjs`
  - Context awareness：`.ai/scripts/contextctl.mjs` → `.ai/skills/features/context-awareness/scripts/contextctl.mjs`
  - Observability：`.ai/scripts/obsctl.mjs` → `.ai/skills/features/observability/scripts/obsctl.mjs`
  - Packaging：`.ai/scripts/packctl.mjs` → `.ai/skills/features/packaging/scripts/packctl.mjs`
  - Deployment：`.ai/scripts/deployctl.mjs` → `.ai/skills/features/deployment/scripts/deployctl.mjs`
  - Release：`.ai/scripts/releasectl.mjs` → `.ai/skills/features/release/scripts/releasectl.mjs`
  - 更新所有引用路径：
    - init pipeline（Stage C controller 路径）
    - init feature docs（命令示例）
    - skills 文档与模板注释（例如 workflow YAML 中的 `cictl` 提示）
- Verification:
  - `node init/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs apply --repo-root . --providers both`（dry-run + apply 视情况）
  - `node .ai/scripts/lint-skills.mjs --strict`
- Rollback:
  - revert 文件移动与路径改动

### Phase 2 — Stage C 集成（CI 作为 feature）
- Objective: `features.ci` 能驱动 Stage C 安装 CI 资产，并记录到 `.ai/project/state.json`
- Deliverables:
  - blueprint schema：`init/skills/initialize-project-from-requirements/templates/project-blueprint.schema.json` 增加 `features.ci`
  - blueprint schema：增加 `ci.provider`（`github|gitlab`），并与现有 `ci.platform` 共存（兼容）
  - blueprint example：`init/skills/initialize-project-from-requirements/templates/project-blueprint.min.example.json` 增加 `features.ci`（以及必要的 `ci.provider` 示例）
  - init pipeline：`init/skills/.../scripts/init-pipeline.mjs`
    - 增加 `isCiEnabled()`、`ensureCiFeature()`（自定义安装逻辑，按 `ci.provider` 决定 provider；可选 fallback 到 `ci.platform`）
    - Stage C `apply` 中在合适位置调用 CI feature 安装（支持 `--verify-features`）
  - feature docs：
    - `init/feature-docs/ci.md` 从“非 feature”改为“feature 文档”（新增 toggle、DoD、verify）
    - `init/feature-docs/README.md` 将 `ci` 加入 Available features 表格，并移除 “Related tooling” 中的 CI 例外描述
- Verification:
  - `node init/.../init-pipeline.mjs validate --repo-root . --blueprint <...>`（含 `features.ci`）
  - `node init/.../init-pipeline.mjs apply --repo-root . --providers both`（dry-run / apply 按需）
- Rollback:
  - 恢复 schema/pipeline/doc 的增量修改；CI skills 仍可独立使用 `cictl` 手动安装

### Phase 3 — CI 策略与规范升级（“可用”）
- Objective: 从“指导型 skill”提升到“能直接跑起来”的 CI 策略与规范（模板 + 约定 + 验证）
- Deliverables:
  - 模板升级（仍保持 starter 语义）：
    - GitHub Actions：明确 Node 版本策略、cache、并发取消、最小权限、artifact 规范、失败信号清晰
    - GitLab CI：cache/runner 假设、stages、artifacts/reports、rules、失败信号清晰
  - 约定文档（建议落在 `ci/workdocs/` 或 `ops/ci/`，待 Phase 0 定案）：
    - secrets/variables 映射表
    - PR/MR gating 策略（快慢分层、手动/定时触发）
    - suites 命名与 `artifacts/<suite>/` 规范
  - `cictl` 增强（与迁移同步）：
    - `verify` 增强：检查 provider 文件存在、提示必要 secrets/变量、提示缺失的 package scripts（如果可判断）
- Verification:
  - `node .ai/skills/features/ci/scripts/cictl.mjs init --provider <github|gitlab> --repo-root .`（或 dry-run）能生成预期文件
  - `node .ai/skills/features/ci/scripts/cictl.mjs verify --repo-root .` 输出可执行的建议（warnings/errors 分类）
- Rollback:
  - 保留旧模板为备选（或在 git 历史中可回退）；`cictl` 改动保持向后兼容

### Phase 4 — 迁移收尾与回归
- Objective: 确保所有入口可用、文档一致、初始化流程可复现
- Deliverables:
  - 更新任何引用旧 skill 名称的文档/脚本/索引
  - 如需要：在旧路径保留短期“迁移提示”或自动转发（带 deprecation）
- Verification:
  - `node .ai/scripts/sync-skills.mjs --scope current --providers both --mode reset --yes`
  - `node .ai/scripts/lint-skills.mjs --strict`
  - Stage C `apply`（非破坏性）在 CI feature 开关开/关两种情况下都能工作
- Rollback:
  - revert 迁移提交；或先恢复 `.ai/scripts/cictl.mjs` 兼容旧路径以降低风险

## Verification and acceptance criteria
- Build/typecheck:
  - `node -c` 不适用；以脚本运行与 lint 为主
- Automated tests / checks:
  - `node .ai/scripts/lint-skills.mjs --strict`
  - `node .ai/scripts/sync-skills.mjs --scope current --providers both --mode reset --yes`
  - `node init/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs validate --repo-root .`
- Manual checks:
  - `node .ai/skills/features/ci/scripts/cictl.mjs init --provider github --repo-root .`（或 gitlab）
  - 检查 `.github/workflows/ci.yml` 或 `.gitlab-ci.yml` 是否按预期生成（copy-if-missing）
- Acceptance criteria:
  - CI skills 位于 `.ai/skills/features/ci/` 且名称去除 `test-`
  - `features.ci` 可在 Stage C 安装 CI（含可选 verify）
  - CI 模板与规范文档能指导用户在不泄露 secrets 的前提下跑通最小 CI
  - `cictl verify` 给出可执行的修复建议（而不是仅提示“失败”）

## Risks and mitigations
| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| 重命名导致引用断裂（模板路径/文档/验证脚本） | med | high | Phase 0 做引用清单；Phase 1 全量搜索替换；必要时短期兼容旧路径 | `cictl init` / `lint-skills` / `sync-skills` 报错 | revert 或临时兼容层 |
| Stage C 自动落地工作流与用户已有 CI 冲突 | low~med | med | 默认 copy-if-missing；提供 `--force-features`；文档明确策略 | Stage C apply 输出 / verify warnings | 不使用 `--force-features` 或 revert |
| 包管理器/命令契约与真实项目不一致 | med | med | 模板提供清晰替换点；可选基于 `repo.packageManager` 的分支生成 | CI 运行失败/缺脚本提示 | 回退模板或禁用某些 jobs |
| 把 CI 从 testing 分类挪到 feature 后语义争议 | low | low~med | 文档解释：CI 是“交付能力/DevOps”而非“测试方法论”；testing skills 仍覆盖测试套件 | 评审反馈 | 重新分类（不建议） |

## Optional detailed documentation layout (convention)
If you maintain a detailed dev documentation bundle for the task, the repository convention is:

```
dev-docs/active/ci-feature/
  roadmap.md              # Macro-level planning (plan-maker)
  00-overview.md
  01-plan.md
  02-architecture.md
  03-implementation-notes.md
  04-verification.md
  05-pitfalls.md
```

The roadmap document can be used as the macro-level input for the other files. The plan-maker skill does not create or update those files.

Suggested mapping:
- The roadmap's **Goal/Non-goals/Scope** → `00-overview.md`
- The roadmap's **Milestones/Phases** → `01-plan.md`
- The roadmap's **Architecture direction (high level)** → `02-architecture.md`
- Decisions/deviations during execution → `03-implementation-notes.md`
- The roadmap's **Verification** → `04-verification.md`

## To-dos
- [ ] Confirm open questions（命名 / blueprint 字段 / Stage C 行为 / 包管理器策略）
- [ ] Confirm milestone ordering and DoD
- [ ] Confirm verification/acceptance criteria
- [ ] Confirm rollout/rollback strategy
