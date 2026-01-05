---
name: test-ci-gitlab-ci
description: GitLab CI skill: integrate automated tests (web/api/mobile/perf) with optional ci-templates add-on (cictl.js) and consistent artifacts.
---

# GitLab CI Integration (workflow)

## Operating mode (token-efficient)
- Treat this skill as a **router + governor**.
- Do **not** load multiple procedures. Select exactly **one** procedure below and follow the chosen procedure end-to-end.
- Prefer the CI add-on (`cictl.js`) when available to reduce drift.

## Routing (pick one procedure)

| Task | Open this procedure | Optional templates |
|---|---|---|
| Initialize GitLab CI via ci-templates add-on (recommended) | `reference/procedures/init-with-addon.md` | `reference/templates/gitlab-ci/` |
| Enable/adjust test jobs (web/api/mobile/perf) | `reference/procedures/enable-test-jobs.md` | `reference/templates/gitlab-ci/` |
| Standardize artifacts + reporting | `reference/procedures/artifacts-and-reporting.md` | — |
| Troubleshoot CI failures | `reference/procedures/troubleshoot.md` | — |

## Shared non-negotiables (apply to all procedures)
1) **Prefer add-on generation when available**
   - Default path: if `addons/ci-templates/payload/.ai/scripts/cictl.js` exists, prefer `node addons/ci-templates/payload/.ai/scripts/cictl.js`.
   - If the path does not exist, see `addons/ci-templates/ADDON.md` for installation/restoration.
   - Avoid hand-editing generated files without updating the source templates/config.

2) **Test command contract**
   - Each suite must have a single deterministic command runnable in CI (examples):
     - API (Newman): `pnpm test:api`
     - Web (Playwright): `pnpm test:e2e:playwright`
     - Web (Cypress): `pnpm test:e2e:cypress`
     - Perf (k6): `pnpm test:perf:k6` (preferred if you wrap k6/Docker) **or** a direct runner command (`k6 run ...` / `docker run grafana/k6 ...`)
     - Mobile: `pnpm test:mobile:<detox|maestro|appium>`
   - Commands must:
     - exit non-zero on test failures
     - write artifacts to `artifacts/<suite>/`

3) **Artifacts are mandatory**
   - Always upload artifacts even on failure:
     - `artifacts/` (or `artifacts/<suite>/`)
   - Keep artifacts size-bounded (videos/traces on failure only when possible).

4) **Secrets management**
   - Use GitLab CI variables (masked/protected).
   - Never echo secrets in logs.

5) **Gating policy**
   - MR gating should run only fast, stable suites.
   - Heavy suites (mobile, load/stress) should be scheduled or manually triggered.

## Minimal inputs you should capture before changing CI
- Whether `.gitlab-ci.yml` already exists and how the file is structured (includes, stages)
- Whether `addons/ci-templates/payload/.ai/scripts/cictl.js` exists (default) or `.ai/scripts/cictl.js` exists (installed copy)
- Which suites are MR-gated vs scheduled
- Required CI variables and how they map to env vars
- Runner constraints (Docker executor, macOS runners for iOS, etc.)

## Verification
- If you changed **skills**:
  - Prefer host-repo tooling if present:
    - `node .ai/scripts/lint-skills.cjs --strict`
  - Always run the local validator:
    - `node .ai/skills/testing/test-ci-gitlab-ci/scripts/validate-skill.cjs`

- If you changed **CI config** (add-on present):
  - Default: `node addons/ci-templates/payload/.ai/scripts/cictl.js verify`
  - Fallback (installed copy): `node .ai/scripts/cictl.js verify`

- If you changed **.gitlab-ci.yml** directly:
  - Trigger a pipeline and confirm:
    - correct suite execution
    - artifacts retained
    - failures show clear signals

## Boundaries
- Do not hardcode secrets or base URLs in `.gitlab-ci.yml`.
- Do not make MR gating flaky; move unstable suites to scheduled runs.
