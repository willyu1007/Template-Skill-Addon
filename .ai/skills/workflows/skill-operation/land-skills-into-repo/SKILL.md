---
name: land-skills-into-repo
description: Install or update an Agent Skills bundle into a repository and optionally sync it to one or more provider skill roots (e.g., .codex/skills, .claude/skills).
---

# Land Skills Into a Repository

## Purpose
Standardize the **"landing"** process for Agent Skills so a skills bundle can be applied to **any repository** and consumed by **any LLM/agent runtime** that implements the folder-based `SKILL.md` convention.

This skill provides:
- A repeatable workflow (manual + scripted).
- A script (`./scripts/land_skills.py`) that performs a safe, auditable install/update with dry-run by default.
- Optional syncing from an internal SSOT to provider-specific skill roots.

## When to use
Use this skill when:
- You have a **skills bundle** (folder or `.zip`) and need to **install** it into a target repo.
- You need to **update** an existing skills install and want a **diff-aware** process.
- You want a **single SSOT** (recommended) and need to **sync** it to multiple skill roots (per-provider or per-tooling).

Do **not** use this skill when:
- You only need to author one new skill from scratch (use a skill-creator workflow instead).
- You are not allowed to modify the target repository (run in `--plan` mode only).

## Inputs
You MUST obtain:
- `repo_root`: Path to the target repository root (default: current working directory).
- `source`: Path to a skills bundle:
  - a directory containing one or more skill folders, **or**
  - a directory containing an SSOT tree (for example a folder that contains `.ai/skills/`), **or**
  - a `.zip` file containing either of the above.

You MAY additionally provide:
- `ssot_dir`: Destination SSOT directory inside the repo (default: `.ai/skills`).
- `provider_roots`: One or more provider skill roots to sync to (optional).
- `config`: A JSON config file (see `./templates/landing-config.*`).

## Outputs
Depending on options, this skill writes:
- SSOT install/update:
  - `repo_root/.ai/skills/**` (default) or your chosen `ssot_dir`.
- Provider sync (optional):
  - One folder per skill under each provider root (flattened by skill `name`).
- Backups (optional, only when overwriting):
  - `repo_root/.ai/.backups/skills-landing/<timestamp>/...` (default).

The script always produces a plan/report to stdout; it can also emit JSON via `--json-report`.

## Workflow
### Step 0: Decide the landing model
Choose ONE model for the repo:

1. **Direct install (no SSOT)** (simplest):
   - Install skills directly into the runtime's skill root (e.g., `.codex/skills` or `.claude/skills`).
   - Good for small repos and single-runtime usage.

2. **SSOT + sync (recommended for "any LLM")**:
   - Keep a provider-agnostic SSOT under `.ai/skills/`.
   - Sync to one or more provider roots when needed.
   - Avoids drift and keeps the authoring surface consistent.

### Step 1: Dry-run (MUST)
From the directory that contains this `SKILL.md` (the "skill root"), run:

```bash
python ./scripts/land_skills.py   --repo-root /path/to/repo   --source /path/to/skills-bundle.zip   --plan
```

Rules:
- You MUST start with `--plan` for a new repo or unknown state.
- Do not overwrite files unless you explicitly enable it (see Step 2).

### Step 2: Apply (only after review)
After reviewing the plan output, apply changes:

```bash
python ./scripts/land_skills.py   --repo-root /path/to/repo   --source /path/to/skills-bundle.zip   --apply   --overwrite=changed   --backup
```

Recommended defaults:
- `--overwrite=changed` (overwrite only if content differs)
- `--backup` (capture overwritten files)

### Step 3: Optional: Sync to provider skill roots
If you maintain an SSOT (default `.ai/skills`), you can sync it to provider roots:

```bash
python ./scripts/land_skills.py   --repo-root /path/to/repo   --sync codex,claude   --apply
```

You can also use custom roots:

```bash
python ./scripts/land_skills.py   --repo-root /path/to/repo   --provider-root /absolute/or/relative/path/to/skills-root   --apply
```

### Step 4: Verify (MUST)
Run verification after applying:

```bash
python ./scripts/land_skills.py   --repo-root /path/to/repo   --verify
```

The verifier checks:
- Every installed skill has a `SKILL.md` with YAML frontmatter.
- `name` is present and matches the folder name (for flattened provider roots).
- Skill names are unique.
- No forbidden/accidental copy targets (configurable).

## Boundaries
- The script MUST NOT delete or prune anything unless `--prune` is explicitly set.
- The script MUST default to a non-destructive mode (`--plan`) when `--apply` is not provided.
- The script SHOULD create backups before overwriting if `--backup` is set.
- The script MUST treat provider sync as a derived artifact (safe to regenerate).

## Included assets
- `./scripts/land_skills.py`: installer/sync/verifier (stdlib-only Python).
- `./templates/landing-config.schema.json`: optional config schema.
- `./templates/landing-config.example.json`: optional config example.
- `./examples/`: minimal runnable scenarios.
