---
name: initialize-project-from-requirements
description: Use this only in repos that still include the init/ bootstrap kit to produce Stage A/B/C artifacts, update skill pack selection, and sync provider skill wrappers.
---

# Initialize a Project From Requirements

## Purpose

Turn an early project idea into **verifiable, file-based** outputs:

- **Stage A (Requirements)**: four requirement documents under `docs/project/`
- **Stage B (Blueprint)**: a machine-readable `docs/project/project-blueprint.json`
- **Stage C (Scaffold + Skills)**: a minimal scaffold + skill pack manifest update + wrapper sync via `node .ai/scripts/sync-skills.js`

This skill is designed to be **bootstrap-only**. After initialization, you may remove the `init/` kit.

## When to use

Use this when:

- The repo still contains an `init/` directory (bootstrap kit present).
- The user needs a clear, reviewable project description before implementation starts.
- You want deterministic initialization outputs (docs + blueprint + minimal scaffold + skills enabled).

Do NOT use this when:

- The repo has already been initialized and `docs/project/project-blueprint.json` is stable.
- The user is asking for implementation work unrelated to initialization.
- You do not have permission to generate or modify repo files.

## Inputs

- Repo root path (or run from repo root).
- Stage A docs root: `docs/project/` (created from templates in `templates/`)
- Stage B blueprint: `docs/project/project-blueprint.json`

Optional inputs:

- Provider set for wrapper sync: `both` (default), or `codex`, `claude`, `codex,claude`.

## Outputs

- Stage A docs (created/updated by the authoring process):
  - `docs/project/requirements.md`
  - `docs/project/non-functional-requirements.md`
  - `docs/project/domain-glossary.md`
  - `docs/project/risk-open-questions.md`
- Stage B blueprint:
  - `docs/project/project-blueprint.json`
- Stage C scaffold (directories only; no framework code):
  - `src/` or (`apps/`, `packages/`) depending on `repo.layout`
- Skills enabled (SSOT):
  - `.ai/skills/_meta/sync-manifest.json` updated (flat manifest)
- Provider wrappers regenerated:
  - via `node .ai/scripts/sync-skills.js`

## Steps

### Stage A: interview → requirement docs (verifiable)

1. Use `templates/conversation-prompts.md` to run a structured requirements interview.
2. Draft the four Stage A documents using templates under `templates/`.
3. Validate Stage A docs:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js check-docs --docs-root docs/project
```

Use strict mode when you need a hard gate (CI / regulated workflows):

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js check-docs --docs-root docs/project --strict
```

### Stage B: requirements → blueprint (machine-readable)

1. Create `docs/project/project-blueprint.json` based on the Stage A docs.
2. Validate the blueprint:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js validate   --blueprint docs/project/project-blueprint.json
```

3. Reconcile packs with capabilities (warn-only by default):

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js suggest-packs   --blueprint docs/project/project-blueprint.json   --repo-root .
```

If you want to **add missing recommended packs** into the blueprint (safe-add only):

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js suggest-packs   --blueprint docs/project/project-blueprint.json   --repo-root .   --write
```

### Stage C: scaffold + enable packs + sync wrappers

1. Dry-run the scaffold plan:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js scaffold   --blueprint docs/project/project-blueprint.json   --repo-root .
```

2. Apply scaffold + manifest update + wrapper sync:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js apply   --blueprint docs/project/project-blueprint.json   --repo-root .   --providers codex,claude   --require-stage-a
```

3. (Optional) Remove the bootstrap kit after success:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js apply   --blueprint docs/project/project-blueprint.json   --repo-root .   --providers codex,claude   --require-stage-a   --cleanup-init   --i-understand
```

## Boundaries

- Do not invent requirements. Resolve ambiguity with the user, or record it as TBD in `docs/project/risk-open-questions.md`.
- Do not add provider-specific assumptions into Stage A docs or the blueprint.
- Do not edit `.codex/skills/` or `.claude/skills/` directly. Only update SSOT in `.ai/skills/` and run `node .ai/scripts/sync-skills.js`. (This repo’s SSOT rule applies.) 
- Scaffolding MUST NOT overwrite existing files; it should only create missing directories and small placeholder `README.md` files.

## Included assets

- Templates: `templates/`
- Examples: `examples/`
- Script: `scripts/init-pipeline.js`

