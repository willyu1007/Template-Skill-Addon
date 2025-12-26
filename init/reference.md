# Initialization Reference

This template uses a **verifiable, 3-stage pipeline** so that initialization is observable, repeatable, and auditable.

## Conclusions

- **Stage A (Requirements)** produces **human-readable SSOT** under `docs/project/`.
- **Stage B (Blueprint)** produces **machine-readable SSOT**: `docs/project/project-blueprint.json`.
- **Stage C (Scaffold + Skills)** is deterministic and scriptable:
  - scaffolds directories from the blueprint
  - updates `.ai/skills/_meta/sync-manifest.json` (flat manifest used by `sync-skills.js`)
  - regenerates provider wrappers via `node .ai/scripts/sync-skills.js`
- In the **add-on template**, Stage C also supports an opt-in hook:
  - if `blueprint.context.enabled === true`, it installs the **context-awareness add-on** from `addons/context-awareness/payload/`
  - then enables the `context-core` pack using `node .ai/scripts/skillsctl.js enable-pack context-core --no-sync`

The init kit is bootstrap-only. You may remove `init/` after success (guarded by `init/.init-kit`).

## Stage A

Required outputs (recommended):

- `docs/project/requirements.md`
- `docs/project/non-functional-requirements.md`
- `docs/project/domain-glossary.md`
- `docs/project/risk-open-questions.md`

Automation:

- `node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js check-docs --docs-root docs/project --strict`

## Stage B

Required output:

- `docs/project/project-blueprint.json`

Validation:

- `node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js validate --blueprint docs/project/project-blueprint.json`

Blueprint notes:

- `blueprint.skills.packs` drives which skill families are enabled (by updating `includePrefixes` in the sync manifest).
- Add-on only: set `blueprint.context.enabled = true` to install the context layer and context-management scripts.

## Stage C

Dry-run scaffold preview:

- `node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js scaffold --blueprint docs/project/project-blueprint.json`

Apply scaffold + skills (and sync wrappers):

- `node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js apply --blueprint docs/project/project-blueprint.json --providers codex,claude --require-stage-a`

## Cleanup

After initialization succeeds, you may remove the init kit:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js cleanup-init --repo-root . --apply --i-understand
```

This deletion is guarded by `init/.init-kit`.
