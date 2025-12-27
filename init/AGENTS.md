# Agent guidance for this init kit

This repository includes an `init/` bootstrap kit that is intended to be executed in a **checkpointed** manner.

Key principles:

- Do not skip stages.
- Do not advance stages without explicit user approval.
- Do not hand-edit `init/.init-state.json` to change stages; use the pipeline commands.

---

## Canonical command entry point

Run from repo root:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js <command> [options]
```

---

## Stage flow (validation + approval)

### Stage A (requirements docs)
1) Validate docs structure:
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js check-docs --repo-root . --docs-root docs/project --strict
```

2) After user approval:
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js approve --stage A --repo-root .
```

### Stage B (blueprint)
1) Validate blueprint:
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js validate --repo-root . --blueprint docs/project/project-blueprint.json
```

2) After user approval:
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js approve --stage B --repo-root .
```

### Stage C (apply)
Apply scaffold/configs/skill packs/wrapper sync:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js apply --repo-root . --blueprint docs/project/project-blueprint.json --providers both
```

After user approval:
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js approve --stage C --repo-root .
```

---

## Add-on notes (context awareness)

If the blueprint enables context awareness (`addons.contextAwareness: true` or `context.enabled: true`), `apply` will:
- install missing files from `addons/context-awareness/payload/` (copy-if-missing; non-destructive)
- run `.ai/scripts/contextctl.js init`
- run `.ai/scripts/projectctl.js init` and `set-context-mode` (if projectctl exists)

See `ADDON_CONTEXT_AWARENESS.md` for details.

---

## Cleanup

Only after completion and user confirmation:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js cleanup-init --repo-root . --apply --i-understand
```

