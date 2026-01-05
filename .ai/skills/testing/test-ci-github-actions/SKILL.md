---
name: test-ci-github-actions
description: GitHub Actions CI skill: integrate automated tests (web/api/mobile/perf) with optional ci-templates add-on (cictl.js) and consistent artifacts.
---

# GitHub Actions CI Integration (workflow)

## Operating mode (token-efficient)
- Treat this skill as a **router + governor**.
- Do **not** load multiple procedures. Select exactly **one** procedure below and follow the chosen procedure end-to-end.
- Prefer the CI add-on (`cictl.js`) when available to reduce drift.

## Routing (pick one procedure)

| Task | Open this procedure | Optional templates |
|---|---|---|
| Initialize GitHub Actions via ci-templates add-on (recommended) | `reference/procedures/init-with-addon.md` | `reference/templates/github-actions/ci.yml` |
| Enable/adjust test jobs (web/api/mobile/perf) | `reference/procedures/enable-test-jobs.md` | `reference/templates/github-actions/ci.yml` |
| Standardize artifacts + reporting | `reference/procedures/artifacts-and-reporting.md` | — |
| Troubleshoot CI failures | `reference/procedures/troubleshoot.md` | — |

## Shared non-negotiables (apply to all procedures)
1) **Prefer add-on generation when available**
   - Default path: if `addons/ci-templates/payload/.ai/scripts/cictl.js` exists, prefer `node addons/ci-templates/payload/.ai/scripts/cictl.js`.
   - If the path does not exist, see `addons/ci-templates/ADDON.md` for installation/restoration.
   - Avoid hand-editing generated files without updating the source templates/config.

2) **Test command contract**
   - Each suite must have a single, deterministic command runnable in CI (examples):
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
     - `artifacts/` (or a well-defined subset)
   - Avoid writing artifacts outside the workspace.

4) **Secrets management**
   - All credentials must use GitHub Actions secrets.
   - Never echo secrets in logs.
   - Prefer OIDC + short-lived tokens if your org supports OIDC.

5) **Gating policy**
   - PR gating should run only fast, stable suites (typically API + 1 web suite + perf smoke).
   - Heavy suites (mobile, load/stress) should be scheduled or manually dispatched.

## Minimal inputs you should capture before changing CI
- Which workflows exist today and whether they are generated
- Which suites are PR-gated vs scheduled
- Required secrets and how they map to env vars
- Node version and OS runners required (ubuntu vs macOS)
- Artifact retention needs and size constraints

## Verification
- If you changed **skills**:
  - Prefer host-repo tooling if present:
    - `node .ai/scripts/lint-skills.cjs --strict`
  - Always run the local validator:
    - `node .ai/skills/testing/test-ci-github-actions/scripts/validate-skill.cjs`

- If you changed **CI config** (add-on present):
  - Default: `node addons/ci-templates/payload/.ai/scripts/cictl.js verify` and `node addons/ci-templates/payload/.ai/scripts/cictl.js status`
  - Fallback (installed copy): use `node .ai/scripts/cictl.js verify` and `node .ai/scripts/cictl.js status`

- If you changed **workflow YAML directly**:
  - Run a PR test run (or use `workflow_dispatch`) and confirm:
    - correct suite execution
    - artifacts uploaded
    - failures show clear signals

## Boundaries
- Do not hardcode secrets or base URLs in workflow YAML.
- Do not add third-party actions without reviewing supply-chain risk.
- Do not make PR gating flaky; move unstable suites to scheduled runs.
