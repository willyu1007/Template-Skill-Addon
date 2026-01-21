# 04 Verification

## Automated checks
- Skills lint:
  - `node .ai/scripts/lint-skills.mjs --strict` ✅
- Init pipeline:
  - `node init/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs validate --repo-root . --blueprint init/skills/initialize-project-from-requirements/templates/project-blueprint.example.json` ✅
  - Note: `apply` was not run against this template repo (it writes many files under repo root). Run against a scratch copy if you want an end-to-end check.
- Wrapper sync (stubs regeneration):
  - `node .ai/scripts/sync-skills.mjs --scope current --providers both --mode reset --yes` ✅

## Manual smoke checks
- CI feature controller:
  - `node .ai/skills/features/ci/scripts/cictl.mjs init --provider github --repo-root . --dry-run` ✅
  - `node .ai/skills/features/ci/scripts/cictl.mjs init --provider gitlab --repo-root . --dry-run` ✅
- Delivery explicit enable (method A):
  - `node .ai/skills/features/ci/scripts/cictl.mjs add-delivery --provider github --repo-root . --dry-run` ✅
  - `node .ai/skills/features/ci/scripts/cictl.mjs add-delivery --provider gitlab --repo-root . --dry-run` ✅ (expects `.gitlab-ci.yml` to exist; run CI `init` first)
- Relocated controller entrypoints (help output):
  - `node .ai/skills/features/context-awareness/scripts/contextctl.mjs --help` ✅
  - `node .ai/skills/features/observability/scripts/obsctl.mjs --help` ✅
  - `node .ai/skills/features/packaging/scripts/packctl.mjs --help` ✅
  - `node .ai/skills/features/deployment/scripts/deployctl.mjs --help` ✅
  - `node .ai/skills/features/deployment/scripts/rollback.mjs --help` ✅
  - `node .ai/skills/features/release/scripts/releasectl.mjs --help` ✅

## Rollout / Backout (if applicable)
- Rollout:
  - Land file moves + reference updates first, then schema/init integration, then CI template upgrades.
- Backout:
  - Revert the commit(s) that move controllers/skills; restore init pipeline controller paths.
