# 04 Verification

## Automated checks
- 2026-02-05: `node .ai/scripts/lint-skills.mjs --strict` (PASS)
- 2026-02-05: `node .ai/tests/run.mjs --suite environment` (PASS)
- 2026-02-05: `node .ai/scripts/sync-skills.mjs --scope current --providers both --mode reset --yes` (PASS)
- 2026-02-05 (earlier run): `node .ai/tests/run.mjs --suite iac` (PASS)

## Manual smoke checks
- Not run (template-only changes; automated suites cover core behavior).

## Rollout / Backout (if applicable)
- Rollout: N/A (template changes only).
- Backout: revert commits/patches.
