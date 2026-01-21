# 03 Implementation Notes

## Status
- Current status: `done`
- Last updated: 2026-01-19

## What changed
- Migrated CI provider skills:
  - `.ai/skills/testing/test-ci-github-actions` → `.ai/skills/features/ci/github-actions-ci`
  - `.ai/skills/testing/test-ci-gitlab-ci` → `.ai/skills/features/ci/gitlab-ci`
- Added CI feature entry: `.ai/skills/features/ci/SKILL.md`
- Added CI controller: `.ai/skills/features/ci/scripts/cictl.mjs`
  - Includes `init`, `verify`, and delivery opt-in via `add-delivery`
  - Added provider delivery templates under each provider skill
- Relocated strongly-owned controllers into feature directories (no `.ai/scripts/*ctl.mjs` wrappers):
  - CI: `.ai/skills/features/ci/scripts/cictl.mjs`
  - Context awareness: `.ai/skills/features/context-awareness/scripts/contextctl.mjs`
  - Observability: `.ai/skills/features/observability/scripts/obsctl.mjs`
  - Packaging: `.ai/skills/features/packaging/scripts/packctl.mjs`
  - Deployment: `.ai/skills/features/deployment/scripts/deployctl.mjs`
  - Release: `.ai/skills/features/release/scripts/releasectl.mjs`
- Moved deployment rollback helper (no wrapper): `.ai/skills/features/deployment/scripts/rollback.mjs`
- Updated docs/templates/packs to reference the new controller paths (including `.ai/skills/_meta/packs/context-core.json`)
- Integrated CI into init Stage C:
  - Blueprint: `features.ci` + `ci.provider` (`github|gitlab`)
  - Init pipeline: `ensureCiFeature()` runs `cictl init` and records feature flag via `projectctl`

## Files/modules touched (high level)
- `dev-docs/active/ci-feature/*`
- `.ai/skills/features/ci/**`
- `.ai/skills/features/*/scripts/*ctl.mjs` (relocated controllers)
- `init/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs`
- `init/skills/initialize-project-from-requirements/templates/project-blueprint.*.json`

## Decisions & tradeoffs
- Decision: delivery workflow is not installed by default.
  - Rationale: keep Stage C “safe + minimal”; delivery is repo/pipeline-specific and should be opt-in.
  - Alternatives considered: auto-install delivery when other features enabled; rejected by requirement.
- Decision: move feature `*ctl.mjs` into feature directories with no wrapper.
  - Rationale: makes retention and feature ownership explicit; supports init “keep only what you need”.
  - Tradeoff: paths become longer; must update all references carefully.

## Deviations from plan
- None yet.

## Known issues / follow-ups
- `init-pipeline apply` was not executed against this template repo (it writes many files). If needed, run it against a scratch copy to validate end-to-end.

## Pitfalls / dead ends (do not repeat)
- Keep the detailed log in `05-pitfalls.md` (append-only).
