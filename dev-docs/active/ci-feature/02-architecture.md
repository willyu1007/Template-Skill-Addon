# 02 Architecture

## Context & current state
- CI skills currently live under `.ai/skills/testing/` and are named `test-ci-*`.
- CI helper controller `cictl.mjs` lives under `.ai/skills/features/ci/scripts/` and copies templates from `.ai/skills/features/ci/*`.
- Several blueprint features historically relied on `.ai/scripts/*ctl.mjs` paths (context-awareness, packaging, deployment, release, observability); controllers are now feature-local under `.ai/skills/features/<feature>/scripts/`.

## Proposed design

### Components / modules
- **CI feature**
  - Feature root: `.ai/skills/features/ci/`
  - Provider skills:
    - `.ai/skills/features/ci/github-actions-ci/`
    - `.ai/skills/features/ci/gitlab-ci/`
  - Feature controller:
    - `.ai/skills/features/ci/scripts/cictl.mjs`
- **Feature-owned controllers relocation (no wrappers)**
  - context-awareness: `.ai/skills/features/context-awareness/scripts/contextctl.mjs`
  - observability: `.ai/skills/features/observability/scripts/obsctl.mjs`
  - packaging: `.ai/skills/features/packaging/scripts/packctl.mjs`
  - deployment: `.ai/skills/features/deployment/scripts/deployctl.mjs`
  - release: `.ai/skills/features/release/scripts/releasectl.mjs`
- **Cross-cutting controllers remain in `.ai/scripts/`**
  - `.ai/scripts/projectctl.mjs` (project state + feature flags)
  - `.ai/scripts/dbssotctl.mjs` (DB schema context generator; depends on `.ai/scripts/lib/*`)
  - sync/lint tools

### Interfaces & contracts
- **Blueprint**
  - `features.ci: boolean`
  - `ci.provider: "github" | "gitlab"` (SSOT for CI provider)
  - Optional compatibility: keep `ci.platform` as informational (not SSOT).
- **Stage C behavior**
  - When `features.ci=true`, Stage C installs only CI workflow (`ci.yml` or `.gitlab-ci.yml`) and CI metadata directory (via `cictl init`).
  - Delivery workflow is *never* installed by default; it is enabled explicitly via `cictl` (method A).
- **Delivery explicit enable (method A)**
  - `cictl add-delivery --provider <...>` copies/patches templates:
    - GitHub Actions: creates `.github/workflows/delivery.yml` (copy-if-missing)
    - GitLab CI: inserts a managed block into `.gitlab-ci.yml` (idempotent)

### Boundaries & dependency rules
- No `.ai/scripts/*ctl.mjs` wrappers: feature controllers are invoked via their feature-local paths.
- Init Stage C must reference the new controller paths explicitly.
- CI templates must be safe-by-default (no secrets in repo; minimal permissions).

## Data migration (if applicable)
- None (file moves + template updates only).

## Non-functional considerations
- Security/auth/permissions:
  - CI templates follow least privilege (GitHub permissions) and avoid printing secrets.
  - Delivery remains human-executed unless user configures credentials and tooling explicitly.
- Performance:
  - Keep CI gating fast; heavy suites are optional.
- Observability:
  - N/A (this task changes scaffolding and tooling; runtime instrumentation is out of scope).

## Open questions
- None (delivery explicit enable is confirmed as method A; CI provider and naming are confirmed).
