# Dependency map

## `.ai/scripts/skillsctl.js` → `.ai/skills/_meta/skillpacksctl.js`

- File: `.ai/skills/_meta/skillpacksctl.js`
- Imported by (incoming):
  - `init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs` (Stage C pack enabling)
  - `.ai/skills/scaffold/packs/manage-skill-packs/*` (docs)
  - `.ai/skills/features/context-awareness/*` (docs)
- Imports (outgoing):
  - Node builtins: `fs`, `path`, `child_process`
  - Executes: `.ai/scripts/sync-skills.cjs` (via `spawn`)
- Notes:
  - Keeps state file name as `.ai/skills/_meta/skillsctl-state.json` (per roadmap “minimal change” strategy).

## `.ai/scripts/dbctl.js` → `.ai/skills/features/database/sync-code-schema-from-db/scripts/dbctl.js`

- File: `.ai/skills/features/database/sync-code-schema-from-db/scripts/dbctl.js`
- Imported by (incoming):
  - `init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs` (database feature init/verify)
  - `.ai/skills/features/database/sync-code-schema-from-db/*` (docs/templates)
  - `.ai/skills/features/database/db-human-interface/scripts/dbdocctl.cjs` (generated runbook content)
- Imports (outgoing):
  - Node builtins: `fs`, `path`, `child_process`
  - Shared lib: `.ai/scripts/lib/normalized-db-schema.js`
  - Executes: `.ai/scripts/dbssotctl.js` (via `spawnSync`)

## `.ai/scripts/migrate.js` → `.ai/skills/features/database/sync-code-schema-from-db/scripts/migrate.js`

- File: `.ai/skills/features/database/sync-code-schema-from-db/scripts/migrate.js`
- Imported by (incoming):
  - `.ai/skills/features/database/sync-code-schema-from-db/*` (docs)
- Imports (outgoing):
  - Node builtins: `fs`, `path`

