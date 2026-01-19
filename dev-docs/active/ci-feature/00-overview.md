# 00 Overview

## Status
- State: done
- Next step: (Optional) archive this bundle to `dev-docs/archive/ci-feature/` once merged.

## Goal
Make CI an init Stage C feature (`features.ci`) with `ci.provider` SSOT, migrate CI skills into `.ai/skills/features/ci/` (remove `test-`), and relocate strongly-owned feature controllers (`*ctl.js`) into their feature directories with all references updated.

## Non-goals
- Implement real project tests or app code (only provide CI contracts/templates/conventions/tools).
- Add automatic “delivery” workflow by default (delivery must be explicitly enabled).
- Build a real CD executor against infrastructure (deployment/release remain human-executed by default).

## Context
- Today, CI-related skills live under `.ai/skills/testing/` and CI is documented as “not a blueprint feature”.
- Several feature controllers live under `.ai/scripts/*ctl.js` (e.g. `contextctl.js`, `packctl.js`, `deployctl.js`), and init Stage C expects them there.
- Goal is to make CI feature-local and on-demand during initialization, and to colocate feature-owned controllers with their feature for retention and clarity.

## Acceptance criteria (high level)
- [x] CI skills are moved to `.ai/skills/features/ci/` and renamed to `github-actions-ci` / `gitlab-ci`
- [x] Blueprint supports `features.ci` + `ci.provider` (`github|gitlab`) and Stage C can materialize CI accordingly
- [x] Delivery workflow is not installed by default; it is enabled explicitly via `cictl` (method A)
- [x] Strongly-owned feature controllers (`cictl/contextctl/obsctl/packctl/deployctl/releasectl`) are moved under their feature directories with no wrappers and all repo references updated
- [x] Repo verification passes (`lint-skills`, `init-pipeline validate (example blueprint)`, `sync-skills reset`, controller smoke checks)
