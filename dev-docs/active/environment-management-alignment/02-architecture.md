# 02 Architecture

## Context & current state
- Env SSOT is split between `docs/project/policy.yaml` (new rules) and `env/inventory/*.yaml` (targets).
- `env-cloudctl` already supports an envfile adapter + SSH copy with explicit approval.
- No IaC feature scaffolding exists yet in this repo.
- Template repo must stay provider-agnostic and non-modular.

## Proposed design

### Components / modules
- `docs/project/policy.yaml`: add `env.cloud` targets/defaults and optional `env.secrets.backends` defaults.
- `env-cloudctl`: resolve cloud targets from policy (optional) → inventory fallback.
- `env-contractctl`: scaffold policy with new sections.
- `init` pipeline: optional IaC feature creation based on blueprint (`iac.tool`).
- `iacctl`: minimal scaffold + verification entrypoint (no provider logic).

### Interfaces & contracts
- Policy (SSOT):
  - `policy.env.cloud.targets[]`: `{ env, host, transport?, env_file?, deploy_dir?, compose_dir? }`
  - `policy.env.cloud.defaults`: shared defaults (paths, env file name).
  - `policy.env.secrets.backends`: optional backend defaults (e.g., Bitwarden scope).
- Inventory (compat):
  - `env/inventory/<env>.yaml` remains valid and unchanged.
- Tooling:
  - `env-cloudctl --env <name>` must accept either policy target or inventory entry.
  - `iacctl init --tool <none|ros|terraform>` creates `ops/iac/<tool>/` stub (if tool != none).

### Boundaries & dependency rules
- Allowed dependencies:
  - `env-cloudctl` may read policy + inventory, write `.ai/.tmp/env-cloud/*` only.
  - `init` may generate IaC folders only when feature is enabled.
- Forbidden dependencies:
  - No hard-coded cloud vendors, regions, or paths.
  - No auto-remote execution without explicit approval flag.

## Data migration (if applicable)
- Migration steps: none (additive schema only).
- Backward compatibility strategy: policy targets are optional; inventory stays supported.
- Rollout plan: update docs + run existing tests.

## Non-functional considerations
- Security/auth/permissions: preserve `--approve-remote` gate for SSH execution.
- Performance: policy resolution is small in-memory merges.
- Observability: keep existing logging; add policy resolution messages where helpful.

## Open questions
- Whether to add optional policy-driven compose/healthcheck actions (keep as doc-only for now).
