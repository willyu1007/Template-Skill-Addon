# Next Action Report

Use when user asks what to do next, needs guidance on priorities, or is picking up work.

## Data Source

```bash
node .ai/scripts/ctl-project-governance.mjs query --json
```

For the task being picked up, also read its commit timeline; the documented status can be stale:

```bash
node .ai/scripts/ctl-project-governance.mjs commits --task T-xxx
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
- Derive what actually landed from the last entry of the `commits` output (its `subject`, plus
  `git show --stat <sha>` if needed); use the `Phase` trailer only as a hint when present
- Report an empty timeline as unknown progress, not as zero progress: commits without a `Task:`
  trailer do not appear. Surface the command's warnings instead of overriding the overview
- If `commits` warns about uncommitted changes, make inspecting `git status` the first step
