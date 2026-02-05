# 01 Plan

## Milestones
1. Policy-driven cloud targets with compatibility fallback.
2. IaC feature scaffolding + optional tooling.
3. Docs + skill updates + verification.

## Detailed steps
1. Extend `docs/project/policy.yaml` schema to include cloud targets/defaults and (optional) secrets backend defaults.
2. Update `env-cloudctl` to resolve targets from policy first, then inventory; keep current adapters and approval gate.
3. Add IaC feature docs + `iacctl` scaffold; wire init pipeline to opt-in creation from blueprint.
4. Update environment docs/skill references and examples to match behavior.
5. Run environment suite + lint + sync stubs.

## Risks & mitigations
- Risk: breaking existing inventory-based flows.
  - Mitigation: keep inventory format unchanged and add policy resolution as optional override.
- Risk: IaC scaffolding interpreted as mandatory.
  - Mitigation: default `policy.iac.tool=none` and document opt-in behavior only.
