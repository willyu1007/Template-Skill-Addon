# AGENTS (Project Governance)

Entry point for AI agents working with **project-level** governance in the repository.

## Quick start

1) Initialize the project hub (idempotent; creates `.ai/project/main/` from templates):
```bash
node .ai/scripts/ctl-project-governance.mjs init --project main
```

2) Query tasks (LLM-friendly JSON lines; works even if hub is missing):
```bash
node .ai/scripts/ctl-project-governance.mjs query --project main --text "sync"
node .ai/scripts/ctl-project-governance.mjs query --project main --status in-progress
node .ai/scripts/ctl-project-governance.mjs query --project main --id T-001
```

3) Run lint (CI-friendly; warnings do not fail the job):
```bash
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
```

4) Sync/fix drift (manual):
```bash
node .ai/scripts/ctl-project-governance.mjs sync --apply --project main
```

Optional: append sync-detected events to changelog (append-only):
```bash
node .ai/scripts/ctl-project-governance.mjs sync --apply --project main --changelog
```

5) Resume existing task work (read-only):
```bash
node .ai/scripts/ctl-project-governance.mjs resume --json
```

Pass `--task T-###` when the request identifies a task. The JSON packet contains bounded task,
commit, branch, and worktree state plus progressive-read suggestions. For lower-level inspection:

```bash
node .ai/scripts/ctl-project-governance.mjs current-task --format id
node .ai/scripts/ctl-project-governance.mjs commits --task T-001
```

6) (Optional) Install Git hooks for automatic sync and commit/task linking:
```bash
node .githooks/install.mjs
```

Installed hooks:
- `pre-commit`: Auto-runs governance `sync` when `dev-docs/` files are staged
- `prepare-commit-msg`: Injects `Task:` when the branch contains one valid task ID
- `commit-msg`: Validates conventional commit format and any `Task: T-###` trailer

The trailer check warns by default. To block instead: `git config hooks.requireTaskTrailer true`.
To skip the trailer hooks once:
- sh/bash: `SKIP_TASK_TRAILER=1 git commit -m "..."`
- PowerShell: `$env:SKIP_TASK_TRAILER="1"; git commit -m "..."; Remove-Item Env:SKIP_TASK_TRAILER`

To check status or uninstall:
```bash
node .githooks/install.mjs --check
node .githooks/install.mjs --uninstall
```

## Key principles
- Task execution progress is maintained in `dev-docs/**` (task bundle is the SoT for status).
- Task identity is anchored by `.ai-task.yaml` (`task_id`).
- Project semantic mapping lives in `.ai/project/main/registry.yaml`.
- Derived views are not authoritative; regenerate them instead of editing AUTO sections.

## Migration note
Missing `.ai-task.yaml` is allowed (warning) during migration, but any existing meta file must be valid, unique, and consistent with the registry.

## Contract
All behavior MUST follow `.ai/project/CONTRACT.md`.
