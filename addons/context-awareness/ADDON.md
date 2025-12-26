# Context Awareness Add-on (Optional)

## Conclusions (read first)

- This add-on installs a **stable, verifiable project context layer** under `docs/context/` (API, DB schema mapping, BPMN, and additional artifacts).
- It provides **project-level scripts** that MUST be used to change this context:
  - `node .ai/scripts/contextctl.js` (context artifacts + registry)
  - `node .ai/scripts/projectctl.js` (project state/config)
  - `node .ai/scripts/skillsctl.js` (skills pack switching + wrapper sync)
- The goal is to make an LLM “context-aware” without relying on ad-hoc folder scans:
  - The LLM reads `docs/context/INDEX.md` and `docs/context/registry.json` as the entry point.
  - CI can run `contextctl verify --strict` to enforce “changes go through scripts”.

## What this add-on writes (blast radius)

New files/directories (created if missing):

- `docs/context/**`
- `docs/addons/context-awareness/**` (documentation for this add-on)
- `.ai/scripts/{contextctl.js,projectctl.js,skillsctl.js,explain-context-addon.js}`
- `.ai/project/{state.json,state.schema.json}`
- `.ai/skills/scaffold/**` (optional scaffold skills for context/packs/state)
- `.ai/skills/_meta/packs/{context-core.json,scaffold-core.json}` (pack definitions)

## Install

### Option A: Install by unzipping into repo root (recommended)

1. Unzip this add-on into the repository root (so `.ai/` and `docs/` merge).
2. Initialize the context layer (idempotent):
   - `node .ai/scripts/contextctl.js init`
3. (Optional) Enable the scaffold/context skills via packs and sync wrappers:
   - `node .ai/scripts/skillsctl.js enable-pack context-core --providers both`

### Option B: Manual copy

Copy the directories listed in “blast radius” into the target repository.

## Verification

- Context layer exists and is consistent:
  - `node .ai/scripts/contextctl.js verify --strict`
- Project state is valid:
  - `node .ai/scripts/projectctl.js verify`
- Skills wrappers are synced (if you enabled packs):
  - `node .ai/scripts/skillsctl.js sync --providers both`

## Rollback / Uninstall

- Delete these paths (if you want a clean uninstall):
  - `docs/context/`
  - `docs/addons/context-awareness/`
  - `.ai/scripts/contextctl.js`
  - `.ai/scripts/projectctl.js`
  - `.ai/scripts/skillsctl.js`
  - `.ai/scripts/explain-context-addon.js`
  - `.ai/project/`
  - `.ai/skills/scaffold/` (only if you installed this add-on’s scaffold skills)
  - `.ai/skills/_meta/packs/context-core.json`
  - `.ai/skills/_meta/packs/scaffold-core.json`

Then re-sync wrappers:
- `node .ai/scripts/sync-skills.js --scope current --providers both`

