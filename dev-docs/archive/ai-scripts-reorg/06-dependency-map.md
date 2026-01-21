# Dependency map

## `.ai/scripts/skillsctl.mjs` → `.ai/skills/_meta/skillpacksctl.mjs`

- File: `.ai/skills/_meta/skillpacksctl.mjs`
- Imported by (incoming):
  - `init/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs` (Stage C pack enabling)
  - `.ai/skills/scaffold/packs/manage-skill-packs/*` (docs)
  - `.ai/skills/features/context-awareness/*` (docs)
- Imports (outgoing):
  - Node builtins: `fs`, `path`, `child_process`
  - Executes: `.ai/scripts/sync-skills.mjs` (via `spawn`)
- Notes:
  - Keeps state file name as `.ai/skills/_meta/skillsctl-state.json` (per roadmap "minimal change" strategy).

## `.ai/scripts/dbctl.mjs` → `.ai/skills/features/database/sync-code-schema-from-db/scripts/dbctl.mjs`

- File: `.ai/skills/features/database/sync-code-schema-from-db/scripts/dbctl.mjs`
- Imported by (incoming):
  - `init/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs` (database feature init/verify)
  - `.ai/skills/features/database/sync-code-schema-from-db/*` (docs/templates)
  - `.ai/skills/features/database/db-human-interface/scripts/dbdocctl.mjs` (generated runbook content)
- Imports (outgoing):
  - Node builtins: `fs`, `path`, `child_process`
  - Shared lib: `.ai/scripts/lib/normalized-db-schema.mjs`
  - Executes: `.ai/scripts/dbssotctl.mjs` (via `spawnSync`)

## `.ai/scripts/migrate.mjs` → `.ai/skills/features/database/sync-code-schema-from-db/scripts/migrate.mjs`

- File: `.ai/skills/features/database/sync-code-schema-from-db/scripts/migrate.mjs`
- Imported by (incoming):
  - `.ai/skills/features/database/sync-code-schema-from-db/*` (docs)
- Imports (outgoing):
  - Node builtins: `fs`, `path`

