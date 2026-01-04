# <Task Title> - Implementation Plan

## Goal
- <One-sentence goal statement>

## Non-goals
- <Explicitly list what is out of scope>

## Open questions and assumptions
### Open questions (answer before execution)
- Q1: <...>
- Q2: <...>

### Assumptions (if unanswered)
- A1: <assumption> (risk: <low|medium|high>)

## Scope and impact
- Affected areas/modules: <...>
- External interfaces/APIs: <...>
- Data/storage impact: <...>
- Backward compatibility: <...>

## Milestones
1. **Milestone 1**: <name>
   - Deliverable: <what exists when done>
   - Acceptance criteria: <how to know it is done>
2. **Milestone 2**: <name>
   - Deliverable: <...>
   - Acceptance criteria: <...>

## Step-by-step plan (phased)
> Keep each step small, verifiable, and reversible.

### Phase 0 - Discovery (if needed)
- Objective: <what you need to learn/confirm>
- Deliverables:
  - <notes, diagrams, list of files>
- Verification:
  - <how you confirm discovery is complete>
- Rollback:
  - N/A (no code changes)

### Phase 1 - <name>
- Objective:
- Deliverables:
  - <...>
- Verification:
  - <tests/checks/acceptance criteria>
- Rollback:
  - <how to revert if this phase causes issues>

### Phase 2 - <name>
- Objective:
- Deliverables:
- Verification:
- Rollback:

## Verification and acceptance criteria
- Build/typecheck:
  - <command(s) or CI job(s)>
- Automated tests:
  - <unit/integration/e2e>
- Manual checks:
  - <smoke test steps>
- Acceptance criteria:
  - <bullet list>

## Risks and mitigations
| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| <risk> | <low/med/high> | <low/med/high> | <...> | <...> | <...> |

## Optional detailed documentation layout (convention)
If you maintain a detailed dev documentation bundle for this task, the repository convention is:

```
dev/active/<task>/dev-docs/
  00-overview.md
  01-plan.md
  02-architecture.md
  03-implementation-notes.md
  04-verification.md
```

This plan document can be used as the macro-level input for that bundle. This skill does not create or update those files.

Suggested mapping:
- This plan's **Goal/Non-goals/Scope** → `00-overview.md`
- This plan's **Milestones/Phases** → `01-plan.md`
- This plan's **Architecture direction (high level)** → `02-architecture.md`
- Decisions/deviations during execution → `03-implementation-notes.md`
- This plan's **Verification** → `04-verification.md`

## To-dos
- [ ] Confirm open questions
- [ ] Confirm milestone ordering and DoD
- [ ] Confirm verification/acceptance criteria
- [ ] Confirm rollout/rollback strategy
