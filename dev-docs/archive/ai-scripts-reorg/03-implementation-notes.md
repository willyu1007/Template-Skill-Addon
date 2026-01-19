# Implementation Notes

Append-only log of decisions and changes made while applying the roadmap.

## 2026-01-19 — Script moves/rename

- Moved DB mirror tools:
  - `.ai/scripts/dbctl.js` → `.ai/skills/features/database/sync-code-schema-from-db/scripts/dbctl.js`
  - `.ai/scripts/migrate.js` → `.ai/skills/features/database/sync-code-schema-from-db/scripts/migrate.js`
- Moved + renamed pack controller:
  - `.ai/scripts/skillsctl.js` → `.ai/skills/_meta/skillpacksctl.js`
- Updated the moved scripts’ internal help text / references to match their new paths.

## 2026-01-19 — Reference updates

- Updated init docs + Stage C pipeline to use new tool/controller paths.
- Updated `.ai/skills/**` docs/templates to remove legacy `.ai/scripts/{dbctl.js,migrate.js,skillsctl.js}` references.

## 2026-01-19 — Delete-skills merge

- Merged SSOT+wrapper skill deletion into `node .ai/scripts/sync-skills.cjs --delete-skills "<csv>" ...`.
- Removed the legacy `.ai/scripts/delete-skills.cjs` entrypoint and updated docs/init references.
