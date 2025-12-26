---
name: update-dev-docs-for-handoff
description: Update an existing dev-docs task bundle with progress, decisions, and verification notes to support handoff or context recovery.
---

# Update Dev Docs for Handoff

## Purpose
Keep task documentation current so another engineer (or future you) can understand what was done, why, and how to verify or continue work.

## When to use
Use this skill when:
- A task is paused and will be resumed later
- You are handing off work to another contributor
- You are about to compress context or close a long-running thread
- A refactor changed the plan and decisions must be recorded

## Inputs
- Task directory (e.g., `dev/active/<task-name>/`)
- Current progress summary
- Key decisions and tradeoffs
- What remains to be done
- Verification status (what was run, what passed/failed)

## Outputs
- Updated task docs:
  - progress summary
  - “what changed” notes
  - updated plan (if needed)
  - verification checklist and current status

## Workflow
1. Update `00-overview.md`:
   - current status (in progress / blocked / done)
   - any scope changes
2. Update `01-plan.md`:
   - mark completed milestones
   - re-sequence remaining tasks if needed
3. Update `02-architecture.md`:
   - record new interfaces and decisions
4. Update `03-implementation-notes.md`:
   - what files/modules changed (high level)
   - non-obvious decisions and rationale
   - known issues and follow-ups
5. Update `04-verification.md`:
   - record what checks were run
   - record failures and next steps to resolve

## Included assets
- Templates: `./templates/` provides a handoff checklist.
