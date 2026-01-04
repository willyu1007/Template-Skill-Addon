# Optional detailed documentation convention

This reference describes an optional file layout convention for maintaining task-level development documentation alongside the plan produced by this skill.

## Convention
When a task requires detailed documentation (architecture notes, implementation notes, verification logs), the repository convention is to create a `dev-docs/` subfolder under the task directory:

```
dev/active/<task>/
  plan.md
  dev-docs/
    00-overview.md
    01-plan.md
    02-architecture.md
    03-implementation-notes.md
    04-verification.md
```

Notes:
- This skill (plan-maker) **only** produces `plan.md`. It does not create or update `dev-docs/` files.
- The detailed bundle is intended to be a long-lived, high-fidelity record for collaboration and handoff.

## Suggested mapping
Use this mapping to avoid duplicating information:

- `plan.md` (macro plan) → source for:
  - `00-overview.md`: goal, non-goals, scope, impact
  - `01-plan.md`: milestones, phases, step sequencing, DoD
  - `02-architecture.md`: high-level architecture direction and interfaces (details added during execution)
  - `03-implementation-notes.md`: decisions, deviations, trade-offs, runbooks, links to PRs/commits
  - `04-verification.md`: verification strategy, commands, expected outcomes, evidence

## Guidance
- Keep `plan.md` macro-level and executable: phases, deliverables, verification, rollback.
- Push deep technical detail (API signatures, schema evolution, edge cases) into the detailed bundle.
- Record unresolved questions early; update assumptions as soon as they are answered.
