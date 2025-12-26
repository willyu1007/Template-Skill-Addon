# Dev Docs Pattern

Persistent task documentation to preserve context across AI sessions and handoffs.

## When to use
Use: complex tasks (multi-module, multi-session, >2 hours).
Skip: small fixes, single-file changes, trivial updates.

## Layout (standard)
Each task lives under `dev/active/<task-name>/` and uses a fixed set of files:

| File | Purpose |
|------|---------|
| `00-overview.md` | Goal, non-goals, current status |
| `01-plan.md` | Phases, steps, acceptance criteria |
| `02-architecture.md` | Boundaries, interfaces/contracts, key risks |
| `03-implementation-notes.md` | What changed and why |
| `04-verification.md` | Checks run and results |

Directory example:

```
dev/
  active/
    <task-name>/
      00-overview.md
      01-plan.md
      02-architecture.md
      03-implementation-notes.md
      04-verification.md
  archive/
```

## For AI assistants
On context reset:
1. Read `dev/active/<task-name>/00-overview.md`.
2. Read `01-plan.md`.
3. Consult `02-architecture.md`, `03-implementation-notes.md`, and `04-verification.md` as needed.

During work:
- Keep `00-overview.md` status current.
- Append to `03-implementation-notes.md` after each milestone.
- Record every check run in `04-verification.md`.
