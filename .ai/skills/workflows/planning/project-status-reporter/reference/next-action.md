# Next Action Report

Use when user asks what to do next, needs guidance on priorities, or is picking up work.

## Data Source

```bash
node .ai/scripts/ctl-project-governance.mjs query --json
```

For the selected task, read its bounded recovery packet:

```bash
node .ai/scripts/ctl-project-governance.mjs resume --task T-xxx --json
```

## Priority Rules

| Priority | Condition |
|----------|-----------|
| 1 | Has `in-progress` task → continue that task |
| 2 | Has `blocked` task → attempt to unblock |
| 3 | Has `planned` task → start next planned task |
| 4 | All `done` → report completion or suggest new work |

## Output Template

```markdown
## Recommended Next Steps

**Priority 1**: <action>
- Task: T-xxx <slug>
- Current status: <status>
- Action: <what to do>
- Command: `<executable command>`

**Priority 2** (optional): <action>
- ...

**Alternatives**:
- Start new task: <if any planned tasks>
- Unblock: <if any blocked tasks>
```

## Rules
- Always provide at least one actionable command
- If continuing in-progress task, suggest reading its overview first
- For blocked tasks, suggest investigation steps
- Use `timeline.commits` for landed work and `overview` for task intent.
- Report an empty timeline as unknown progress, not zero progress.
- If `worktree.clean` is false, inspect the returned `suggested_commands` first.
- Surface packet warnings instead of silently overriding task documentation.
