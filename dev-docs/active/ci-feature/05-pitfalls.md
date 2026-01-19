# 05 Pitfalls (do not repeat)

This file exists to prevent repeating mistakes within this task.

## Do-not-repeat summary (keep current)
- When moving controllers, update init Stage C script paths first, then update docs and templates, then run `init-pipeline apply` dry-run.
- GitLab CI YAML edits must be idempotent; use explicit managed markers to avoid corrupting existing pipelines.
- Do not touch `.codex/` or `.claude/` directly; only regenerate via `node .ai/scripts/sync-skills.cjs ...`.

## Pitfall log (append-only)

