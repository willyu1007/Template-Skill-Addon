# 03 Implementation Notes

## Status
- Current status: `done`
- Last updated: 2026-02-05

## What changed
- Added policy-driven cloud routing in `env-cloudctl` with inventory fallback, plus `--runtime-target/--workload`.
- Added optional policy-only routing (`policy.env.cloud.require_target`) and documented the fallback gate.
- Fixed `env-cloudctl apply` to use policy routing (match `plan/verify`) instead of always loading inventory.
- Added policy-backed `bws` defaults and optional `scope` handling for secrets.
- Updated policy scaffold to include `policy.env.cloud` + `policy.env.secrets.backends.bws`, and set `policy.iac.tool` default to `none`.
- Added IaC feature (`iacctl` + init pipeline + feature docs) and a new IaC test suite.
- Refreshed environment/Bitwarden docs to match the updated routing and defaults behavior.
- Added a template note in `ENVIRONMENT-STRATEGY.md` to avoid treating vendor-specific terms as normative.

## Files/modules touched (high level)
- `.ai/skills/features/environment/**`
- `.ai/skills/features/iac/**`
- `init/_tools/feature-docs/**`
- `init/_tools/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs`
- `.ai/tests/suites/iac/**`, `.ai/tests/run.mjs`
- `ENVIRONMENT-CHANGES-DETAILS.md`, `ENVIRONMENT-SKILLS-REVIEW.md`, `BITWARDEN-SECRETS-BACKEND.md`

## Decisions & tradeoffs
- Decision: keep inventory as a fallback even after policy targets.
  - Rationale: preserve backward compatibility and avoid breaking tests.
  - Alternatives considered: migrate inventory into policy-only (rejected).
- Decision: allow policy-only routing via `policy.env.cloud.require_target` rather than hard-removing inventory.
  - Rationale: align with policy-SSOT intent while keeping compatibility for existing repos.

## Deviations from plan
- None yet.

## Known issues / follow-ups
- None.

## Pitfalls / dead ends (do not repeat)
- Keep the detailed log in `05-pitfalls.md` (append-only).
