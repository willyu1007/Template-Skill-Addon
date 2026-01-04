---
name: create-dev-docs-plan
description: Create a structured dev-docs task bundle (overview/plan/architecture/notes/verification/pitfalls) with clear scope, acceptance criteria, and handoff-ready artifacts.
---

# Create Dev Docs Plan

## Purpose
Generate a structured, repeatable “task documentation bundle” so implementation work has clear scope, steps, and verification, and can be handed off cleanly.

## When to use
Use this skill when:
- Starting a non-trivial task or project
- Work spans multiple modules/services
- You need a shared plan for multiple contributors
- You want a consistent handoff artifact for later context recovery

## Inputs
- Task name (short, kebab-case recommended)
- High-level goal and success criteria
- Constraints (deadline, non-goals, areas that must not change)
- Known dependencies (APIs, data models, infra)

## Outputs
A new task directory with a standard set of docs, e.g.:

```
dev/
  active/
    <task-name>/
      00-overview.md
      01-plan.md
      02-architecture.md
      03-implementation-notes.md
      04-verification.md
      05-pitfalls.md
```

(Adjust directory naming to match your repository conventions if different.)

## Rules
- The overview MUST state the goal and non-goals.
- The plan MUST include milestones and acceptance criteria.
- The architecture doc MUST capture boundaries and contracts.
- Verification MUST be concrete (commands/checks, expected results).
- The task bundle MUST include `05-pitfalls.md` and it MUST be updated when failures are resolved (historical lessons, append-only).
- Avoid embedding secrets or real credentials.

## Steps
1. Create `dev/active/<task-name>/`.
2. Write `00-overview.md`:
   - problem statement
   - goal
   - non-goals
   - high-level acceptance criteria
3. Write `01-plan.md`:
   - milestones
   - step order
   - risks and mitigations
4. Write `02-architecture.md`:
   - boundaries
   - interfaces/contracts
   - data migrations (if any)
5. Write `03-implementation-notes.md`:
   - decisions made
   - deviations from plan (with rationale)
   - open issues requiring follow-up action (current state, actionable TODOs)
6. Write `04-verification.md`:
   - automated checks
   - manual smoke checks
   - rollout/backout notes (if needed)
7. Write `05-pitfalls.md`:
   - a short `do-not-repeat` summary (fast scan for future contributors)
   - an append-only log of resolved failures and dead ends (historical lessons, not current issues)

## Verification
- [ ] Task directory follows the standard layout (`00-overview.md`, `01-plan.md`, etc.)
- [ ] Overview clearly states goals and non-goals
- [ ] Plan includes milestones with acceptance criteria
- [ ] Architecture captures boundaries and contracts
- [ ] Verification has concrete commands/checks and expected results
- [ ] `05-pitfalls.md` exists and is structured for fast scanning + append-only updates
- [ ] No secrets or real credentials are embedded
- [ ] Documentation is sufficient for handoff to another contributor

## Boundaries
- MUST NOT embed secrets or real credentials in docs
- MUST NOT skip verification section (must be concrete and testable)
- MUST NOT create plans without acceptance criteria
- SHOULD NOT deviate from the standard directory layout without justification
- SHOULD keep overview high-level (implementation detail belongs elsewhere)

## Included assets
- Templates:
  - `./templates/00-overview.md`
  - `./templates/01-plan.md`
  - `./templates/02-architecture.md`
  - `./templates/03-implementation-notes.md`
  - `./templates/04-verification.md`
  - `./templates/05-pitfalls.md`
- Examples: `./examples/` includes a minimal task bundle layout.
