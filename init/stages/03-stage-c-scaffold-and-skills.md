# Stage C: Scaffold and Skills

## Goal

Apply a **deterministic** transformation from the blueprint into:

- a minimal project scaffold (directories + placeholders only; no destructive overwrites)
- an updated skill selection manifest (`.ai/skills/_meta/sync-manifest.json`)
- regenerated provider wrappers (`.codex/skills/`, `.claude/skills/`)

## Inputs

- Blueprint: `docs/project/project-blueprint.json`
- Skill SSOT: `.ai/skills/`
- Sync script: `.ai/scripts/sync-skills.js`

## Outputs

- Scaffolded directories and placeholder files (idempotent)
- Updated `.ai/skills/_meta/sync-manifest.json` (flat manifest)
- Refreshed provider wrappers under `.codex/skills/` and `.claude/skills/`

## Add-on hook (addon template only)

If the blueprint contains:

```json
{
  "context": { "enabled": true }
}
```

Stage C will:

1. Install the context-awareness payload from `addons/context-awareness/payload/` into the repo (adds `.ai/scripts/contextctl.js`, `docs/context/`, and scaffold skills/packs).
2. Enable the `context-core` pack via `node .ai/scripts/skillsctl.js enable-pack context-core --no-sync`.
3. Continue with wrapper sync using the updated manifest.

This keeps the base template clean and makes context awareness **opt-in**.

## Commands

Dry-run (preview operations):

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js scaffold   --blueprint docs/project/project-blueprint.json   --repo-root .
```

Apply (writes changes + sync wrappers):

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js apply   --blueprint docs/project/project-blueprint.json   --repo-root .   --providers both   --require-stage-a
```

Optional cleanup (removes `init/` only):

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js cleanup-init   --repo-root .   --apply   --i-understand
```
