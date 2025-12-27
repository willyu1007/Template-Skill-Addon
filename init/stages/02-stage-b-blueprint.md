# Stage B: Project blueprint

Stage B produces and validates a **project blueprint** that will drive Stage C scaffolding, config generation, and skill pack selection.

Blueprint location:
- `docs/project/project-blueprint.json`

Reference templates:
- `init/skills/initialize-project-from-requirements/templates/project-blueprint.example.json`
- `init/skills/initialize-project-from-requirements/templates/project-blueprint.schema.json`

---

## What must be true before leaving Stage B

1. `docs/project/project-blueprint.json` exists
2. The blueprint passes validation:
   - schema-level sanity checks
   - pack selection recommendation report (optional, but strongly recommended)
3. The user explicitly approves the blueprint (checkpoint)

---

## Validate blueprint

From repo root:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js validate \
  --repo-root . \
  --blueprint docs/project/project-blueprint.json
```

Optional: show recommended packs and whether they are installed:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js suggest-packs \
  --repo-root . \
  --blueprint docs/project/project-blueprint.json
```

---

## Add-on flags (optional)

If you want to enable the context-awareness add-on, set either:
- `addons.contextAwareness: true` **or**
- `context.enabled: true`

Optional:
- `context.mode: "contract" | "snapshot"` (default: `contract`)

Note: Stage C `apply` will attempt to install the add-on payload from:
- `addons/context-awareness/payload/` (default; can be overridden via `apply --addons-root`)

---

## User approval checkpoint (advance to Stage C)

After the user explicitly approves the blueprint, record approval and advance:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js approve --stage B --repo-root .
```

