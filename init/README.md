# Project Initialization

This template uses a **3-stage, verifiable** initialization pipeline.

## Conclusions

- Stage A produces **human-readable SSOT** under `docs/project/`.
- Stage B produces a **machine-readable blueprint** at `docs/project/project-blueprint.json`.
- Stage C is deterministic:
  - scaffolds minimal directories/placeholders (no destructive overwrites)
  - updates `.ai/skills/_meta/sync-manifest.json`
  - regenerates provider wrappers via `node .ai/scripts/sync-skills.js`
- The init kit is bootstrap-only. After success, you may remove `init/` (guarded by `init/.init-kit`).

### Add-on hook (addon template)

This repo also contains optional add-ons under `addons/`.

For context awareness, set:

```json
{
  "context": { "enabled": true }
}
```

in the blueprint. Stage C will then install the add-on payload and enable the `context-core` pack automatically.

## Quick start (AI-assisted)

1. Ask your LLM to follow `init/AGENTS.md`.
2. Complete Stage A docs under `docs/project/`.
3. Create `docs/project/project-blueprint.json` (Stage B).
4. Run Stage C:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js apply   --blueprint docs/project/project-blueprint.json   --repo-root .   --providers both   --require-stage-a
```

## Cleanup (optional)

After initialization succeeds, you may remove the bootstrap kit:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js cleanup-init   --repo-root .   --apply   --i-understand
```

This is guarded by the marker file: `init/.init-kit`.

## Where to read next

- AI-driven workflow: `init/AGENTS.md`
- Deep details and rubrics: `init/reference.md`
- Stage checklists: `init/stages/`
- Skill implementation: `init/skills/initialize-project-from-requirements/`
