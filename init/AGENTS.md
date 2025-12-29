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
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs <command> [options]
```

---

## Stage flow (validation + approval)

### Stage A (requirements docs)
1) Validate docs structure:
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs check-docs --repo-root . --docs-root docs/project --strict
```

2) After user approval:
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs approve --stage A --repo-root .
```

### Stage B (blueprint)
1) Validate blueprint:
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs validate --repo-root . --blueprint docs/project/project-blueprint.json
```

2) After user approval:
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs approve --stage B --repo-root .
```

### Stage C (apply)
Apply scaffold/configs/skill packs/wrapper sync:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs apply --repo-root . --blueprint docs/project/project-blueprint.json --providers both
```

After user approval:
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs approve --stage C --repo-root .
```

---

## Add-on notes (context awareness)

If the blueprint enables context awareness (`addons.contextAwareness: true`), `apply` will:
- install missing files from `addons/context-awareness/payload/` (copy-if-missing; non-destructive)
- run `.ai/scripts/contextctl.js init`
- run `.ai/scripts/projectctl.js init` and `set-context-mode` (if projectctl exists)

`context.*` is configuration only and does not trigger installation.

See `ADDON_CONTEXT_AWARENESS.md` for details.

---

## Cleanup

Only after completion and user confirmation:

**Option A: Remove `init/` only**

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs cleanup-init --repo-root . --apply --i-understand
```

**Option B: Remove `init/` + prune unused add-ons** (recommended)

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs cleanup-init \
  --repo-root . \
  --apply \
  --i-understand \
  --cleanup-addons \
  --blueprint docs/project/project-blueprint.json
```

Option B removes unused add-on source directories under `addons/` based on the blueprint, resulting in a cleaner final repository.
