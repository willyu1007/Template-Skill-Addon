# Implementation Notes

Append-only log of decisions and changes made while applying the roadmap.

## 2026-01-19 — Script moves/rename

- Moved DB mirror tools:
  - `.ai/scripts/dbctl.mjs` → `.ai/skills/features/database/sync-code-schema-from-db/scripts/dbctl.mjs`
  - `.ai/scripts/migrate.mjs` → `.ai/skills/features/database/sync-code-schema-from-db/scripts/migrate.mjs`
- Moved + renamed pack controller:
  - `.ai/scripts/skillsctl.mjs` → `.ai/skills/_meta/skillpacksctl.mjs`
- Updated the moved scripts’ internal help text / references to match their new paths.

## 2026-01-19 — Reference updates

- Updated init docs + Stage C pipeline to use new tool/controller paths.
- Updated `.ai/skills/**` docs/templates to remove legacy `.ai/scripts/{dbctl.mjs,migrate.mjs,skillsctl.mjs}` references.

## 2026-01-19 — Delete-skills merge

- Merged SSOT+wrapper skill deletion into `node .ai/scripts/sync-skills.mjs --delete-skills "<csv>" ...`.
- Removed the legacy `.ai/scripts/delete-skills.mjs` entrypoint and updated docs/init references.
