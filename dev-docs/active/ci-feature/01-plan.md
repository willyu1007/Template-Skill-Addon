# 01 Plan

## Milestones
1. Lock decisions (done): names, Stage C behavior, `ci.provider`, pnpm default, delivery explicit enable (A), no wrappers for feature controllers.
2. Migrate CI skills into `.ai/skills/features/ci/` and update references.
3. Relocate feature-owned controllers (`*ctl.mjs`) into their feature directories; update all script/doc/init references.
4. Add CI as Stage C feature (`features.ci`) using `ci.provider`; update schema, init pipeline, and feature docs.
5. Upgrade CI conventions/templates + add delivery explicit enable command.
6. Verification + docs cleanup.

## Detailed steps
1. Create dev-docs task bundle (this directory) and keep it updated as we implement.
2. Create `.ai/skills/features/ci/`:
   - Add feature-level `SKILL.md`
   - Move skills:
     - `.ai/skills/testing/test-ci-github-actions` → `.ai/skills/features/ci/github-actions-ci`
     - `.ai/skills/testing/test-ci-gitlab-ci` → `.ai/skills/features/ci/gitlab-ci`
   - Update skill front-matter names and internal verification paths.
3. Move feature controllers (no wrappers):
   - `.ai/scripts/cictl.mjs` → `.ai/skills/features/ci/scripts/cictl.mjs`
   - `.ai/scripts/contextctl.mjs` → `.ai/skills/features/context-awareness/scripts/contextctl.mjs`
   - `.ai/scripts/obsctl.mjs` → `.ai/skills/features/observability/scripts/obsctl.mjs`
   - `.ai/scripts/packctl.mjs` → `.ai/skills/features/packaging/scripts/packctl.mjs`
   - `.ai/scripts/deployctl.mjs` → `.ai/skills/features/deployment/scripts/deployctl.mjs`
   - `.ai/scripts/releasectl.mjs` → `.ai/skills/features/release/scripts/releasectl.mjs`
   - Keep cross-cutting controllers in `.ai/scripts/` (e.g., `projectctl.mjs`, `dbssotctl.mjs`, `sync-skills.mjs`, `lint-skills.mjs`).
4. Update all references:
   - Init Stage C controller paths in `init/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs`
   - Feature docs under `init/feature-docs/*.md`
   - Feature SKILLs under `.ai/skills/features/*/SKILL.md`
   - Any scripts that print guidance (e.g., `.ai/skills/features/deployment/scripts/rollback.mjs` referencing deployctl)
   - CI templates comments referencing `cictl`
5. CI feature integration:
   - Update blueprint schema: add `features.ci` and `ci.provider`
   - Update init pipeline:
     - validate: require `ci.provider` when `features.ci=true`
     - suggest-features: recommend `ci` when `ci.enabled` or CI signals exist
     - apply: add `ensureCiFeature` that installs CI based on `ci.provider`
   - Update init feature docs:
     - `init/feature-docs/ci.md` becomes a real feature doc
     - `init/feature-docs/README.md` adds `ci` to the features table and updates control script paths for moved controllers
6. CI "usable" upgrade:
   - Update CI templates to be runnable defaults (pnpm), safe permissions, artifact policy, and clear failure signals
   - Add delivery explicit enable (method A): `cictl add-delivery` (GitHub: copy a workflow file; GitLab: insert a managed block)
7. Verification:
   - `node .ai/scripts/lint-skills.mjs --strict`
   - `node init/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs validate --repo-root .`
   - `node init/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs apply --repo-root . --providers both` (dry-run where appropriate)
   - `node .ai/scripts/sync-skills.mjs --scope current --providers both --mode reset --yes`

## Risks & mitigations
- Risk: Moving controllers breaks init Stage C or docs.
  - Mitigation: Update init pipeline paths first; run `apply` dry-run; run `--verify-features` where available.
- Risk: CI provider selection ambiguous.
  - Mitigation: Enforce `ci.provider` when `features.ci=true`, and provide actionable error message.
- Risk: GitLab “delivery enable” YAML patching is brittle.
  - Mitigation: Use a clearly delimited managed block (idempotent) and fail safe with instructions if file structure is incompatible.
