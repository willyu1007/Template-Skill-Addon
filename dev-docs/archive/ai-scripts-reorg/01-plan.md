# Plan

## Phases

1. Create dev-docs bundle (this directory)
2. Script moves/renames
   - Move DB mirror tools into database feature skill
   - Move + rename `skillsctl.js` → `_meta/skillpacksctl.js`
3. Reference updates
   - Update init pipeline + init docs
   - Update `.ai/` skill docs that mention old paths
4. Merge delete into `sync-skills.cjs`
   - Add guarded delete flags
   - Update meta (manifest + packs state) on delete
   - Remove `delete-skills.cjs` and update all references
5. Verification runs (recorded in `04-verification.md`)

## Acceptance Criteria

- `node .ai/scripts/lint-skills.cjs --strict` passes
- `node .ai/scripts/sync-skills.cjs --scope current --providers both --mode reset --yes` succeeds
- Init Stage C scripts reference the new controller/tool paths
- `--help` works for:
  - `node .ai/scripts/cictl.js --help`
  - `node .ai/scripts/dbssotctl.js --help`
  - `node .ai/skills/features/database/sync-code-schema-from-db/scripts/dbctl.js --help`
  - `node .ai/skills/_meta/skillpacksctl.js --help`

