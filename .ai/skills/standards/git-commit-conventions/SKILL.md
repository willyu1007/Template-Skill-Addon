---
name: git-commit-conventions
description: Apply consistent Git conventions for commits, branches, and pull requests - covers commit message format, branch naming, and PR best practices.
---

# Git Commit Conventions

## Purpose

Define standards for Git usage that improve traceability, collaboration, and automation.

Goals:
- **Traceability**: link code changes to requirements and issues
- **Readability**: clear history that tells a story
- **Automation**: enable changelog generation and semantic versioning
- **Collaboration**: consistent patterns across the team

## When to use

Use this skill when:
- Writing commit messages
- Creating branches
- Opening pull requests / merge requests
- Reviewing Git history or changelog

## Inputs

- Changes to commit
- Related issue/ticket (if applicable)
- Type of change (feature, fix, refactor, etc.)

## Outputs

- Well-formatted commit messages
- Properly named branches
- Clear, reviewable pull requests

---


## Steps
1. Identify the artifact you are producing or reviewing (commit message, branch name, or pull request).
2. Apply the MUST rules from the relevant sections below (format, required fields, and naming rules).
3. If any required element is missing, propose a corrected version that preserves the original intent.
4. Run the checklist sections as a final pass to catch omissions (tests, screenshots, links, etc.).
5. Record the final text output in a copy/paste-ready form (commit message block, branch name, or PR description template).

## Commit Message Format (MUST)

Use **Conventional Commits** format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Type (required)

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change that neither fixes nor adds |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks (deps, configs) |
| `ci` | CI/CD changes |
| `revert` | Revert a previous commit |

### Scope (optional)

Module or component affected:
- `feat(auth): add JWT refresh token`
- `fix(api): handle null response`
- `docs(readme): update installation steps`

### Subject (required)

- Use imperative mood: "add feature" not "added feature"
- No capitalization at start
- No period at end
- Max 50 characters

### Body (optional)

- Explain **what** and **why**, not **how**
- Wrap at 72 characters
- Use blank line to separate from subject

### Footer (optional)

- Reference issues: `Fixes #123`, `Closes #456`
- Breaking changes: `BREAKING CHANGE: description`
- Task link: see **Task trailers** below (required when a dev-docs task is active)

### Examples

```
feat(auth): add password reset flow

Implement forgot password and reset password endpoints.
Email service integration for sending reset links.

Closes #42
```

```
fix(api): handle null user in profile endpoint

Previously threw 500 when user not found.
Now returns 404 with proper error message.

Fixes #128
```

```
refactor(db): extract query builder utilities

No functional changes. Improves testability
and reduces duplication across repositories.
```

---

## Task Trailers (MUST)

When the work belongs to a `dev-docs` task bundle, the commit MUST carry a `Task:` trailer.
The trailer is the only machine-readable link between a commit and the task that produced it,
and it is what `ctl-project-governance.mjs commits` reads back to reconstruct progress after a
context reset.

Trailers are standard Git trailers: `Key: value` lines in a block at the end of the message,
separated from the body by a blank line.

| Trailer | Required | Value |
|---------|----------|-------|
| `Task` | MUST when a task bundle is active | Task ID from `.ai-task.yaml`, matching `T-###` |
| `Docs` | SHOULD | Task bundle path, e.g. `dev-docs/active/<task-slug>/` |
| `Phase` | MAY | Free-text hint at the position in `01-plan.md`, e.g. `2/4 hooks` |
| `Verify` | SHOULD when the commit closes a phase | Command run and outcome, e.g. `pnpm test (pass)` |

Only `Task` is validated (by the `commit-msg` hook, when hooks are installed) and only `Task`
is required for recovery to work. `Phase` is an unvalidated convenience hint: readers fall back
to commit subjects and `git show --stat`, so never rely on `Phase` alone to carry information a
reader needs.

### Example

```
feat(governance): validate task trailers in commit-msg hook

Warn when an active task exists but the commit is not linked to it.
Blocking is opt-in via hooks.requireTaskTrailer.

Task: T-012
Docs: dev-docs/active/commit-governance/
Phase: 3/4 hooks
Verify: node .ai/scripts/lint-docs.mjs --path . --check-anchors (pass)
```

### Rules

- `Task` MUST match `^T-\d{3}$`. Issue tracker references belong in `Fixes #123`, not here.
- Trailers MUST sit together in the final block of the message. With `git commit -m`, put all
  trailer lines into one last `-m` argument: each extra `-m` starts a new paragraph, and git
  parses only the final paragraph as trailers (a `Task:` line elsewhere is invisible to
  `git log` and to the hooks).
- One task per commit. If a change serves two tasks, split it.
- `Verify` MUST record a command that actually ran, with its real outcome.
- If Git hooks are installed (`node .githooks/install.mjs`), `.githooks/prepare-commit-msg`
  injects `Task` and `Docs` automatically when exactly one task is `in-progress`. Write them by
  hand when hooks are absent or several tasks are active (the hook refuses to guess).

## Commit Checkpoints (MUST)

Commit frequency is anchored to **task events**, not to elapsed time or diff size. Uncommitted
work is invisible to every recovery mechanism, so a session that ends with a dirty worktree has
effectively lost its progress regardless of how good the task docs are.

### Commit when

| Trigger | Why |
|---------|-----|
| A phase in `01-plan.md` is complete and its verification is recorded in `04-verification.md` | The phase boundary is the unit of recoverable progress |
| Before a risky or wide refactor | Establishes a known-green rollback point |
| Before pausing, handing off, or compacting context | The worktree MUST be clean when a session ends |
| Uncommitted work spans more than one phase | Beyond that, the commit can no longer explain what happened |

### Do not commit

- After every individual file edit within a single phase
- Broken, non-compiling, or non-revertible intermediate states
- Documentation churn split away from the change it describes, unless docs are the deliverable

### Ending a session mid-phase

WIP commits are not allowed: `wip` is not a valid commit type (and the `commit-msg` hook, when
installed, rejects it). When a session ends before a phase is finished:

1. Bring the worktree to a compiling, revertible state.
2. Commit the part that is genuinely done, typed by what it actually is (`feat`, `refactor`, ...).
   The subject MUST describe what actually landed; never describe an unfinished phase as complete.
3. Record the next concrete action in `00-overview.md`. That doc is what the next session reads;
   a `Phase: 2/4 <name> (partial)` trailer may be added on top, but it does not replace step 3.

To read the resulting timeline back (output is oldest -> newest; the last line is the latest
progress):

```bash
node .ai/scripts/ctl-project-governance.mjs commits --task T-012
```

---

## Branch Naming (MUST)

Format: `<type>/<ticket>-<short-description>`

### Examples

- `feat/T-012-commit-governance`
- `feat/AUTH-123-password-reset`
- `fix/API-456-null-handling`
- `docs/update-readme`
- `chore/upgrade-deps`

### Rules

- Use lowercase and hyphens (kebab-case), except for task IDs (`T-012`)
- Keep description short but meaningful
- Include ticket/issue number when applicable
- When the work has a dev-docs task bundle, use the task ID as the ticket
- Avoid special characters

### Protected Branches

- `main` / `master` - production-ready code
- `develop` - integration branch (if using Git Flow)
- `release/*` - release preparation

---

## Pull Request Standards (MUST)

### Title

Follow commit message format:
- `feat(auth): add password reset flow`
- `fix(api): handle null response`

### Description Template

```markdown
## Summary
Brief description of what this PR does.

## Changes
- Change 1
- Change 2

## Related Issues
Fixes #123

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] CI passes

## Screenshots (if UI changes)
[Add screenshots here]

## Checklist
- [ ] Code follows team conventions
- [ ] Self-review completed
- [ ] Documentation updated (if needed)
```

### Size Guidelines

- **Ideal**: < 400 lines changed
- **Maximum**: < 1000 lines (split if larger)
- **Exception**: auto-generated code, migrations

### Review Readiness

Before requesting review:
- [ ] All commits are meaningful (squash WIP commits)
- [ ] Branch is up-to-date with target
- [ ] CI/CD passes
- [ ] Self-review completed

---

## Merge Strategies (SHOULD)

| Strategy | When to use |
|----------|-------------|
| **Squash merge** | Feature branches → keep history clean |
| **Merge commit** | When preserving branch history matters |
| **Rebase** | Keeping linear history in small teams |

### Squash Merge (Recommended)

- Combines all branch commits into one
- Final commit message should follow conventions
- Keeps `main` history clean and readable

---

## Boundaries

- Do NOT force push to protected branches
- Do NOT commit secrets, credentials, or sensitive data
- Do NOT mix unrelated changes in one commit
- Do NOT mix two tasks in one commit
- Do NOT use vague messages like "fix bug" or "update code"
- Do NOT use `wip` as a commit type; see "Ending a session mid-phase"
- Do NOT end a session with uncommitted task work

## Verification

Commit quality checklist:
- Message follows conventional format
- Type accurately describes the change
- Subject is clear and imperative
- Linked issues are referenced
- `Task: T-###` trailer is present when a dev-docs task is active
- `Verify` trailer, if present, records a command that actually ran
- The commit lands on a checkpoint trigger, not mid-phase noise
- No sensitive data included

## Included assets

None.
