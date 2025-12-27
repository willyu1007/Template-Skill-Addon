# Init kit (robust 3-stage pipeline)

This `init/` package provides a 3-stage, checkpointed workflow to bootstrap a repository from requirements:

- **Stage A**: Requirements docs (`docs/project/*`)
- **Stage B**: Blueprint (`docs/project/project-blueprint.json`)
- **Stage C**: Scaffold + configs + skill packs + add-ons + wrapper sync

It is designed for **robustness and auditability**:
- Each stage has a **validation step** (written into `init/.init-state.json`)
- Stage transitions require **explicit user approval** (`approve` command)
- Optional add-ons are installed **only when enabled in the blueprint**

---

## Quick start (run from repo root)

### 0) Initialize state
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js start --repo-root .
```

### 1) Stage A: validate docs → approve
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js check-docs \
  --repo-root . \
  --docs-root docs/project \
  --strict

# After the user explicitly approves Stage A:
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js approve --stage A --repo-root .
```

### 2) Stage B: validate blueprint → approve
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js validate \
  --repo-root . \
  --blueprint docs/project/project-blueprint.json

# After the user explicitly approves Stage B:
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js approve --stage B --repo-root .
```

### 3) Stage C: apply scaffold/configs/packs/addons/wrappers → approve
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js apply \
  --repo-root . \
  --blueprint docs/project/project-blueprint.json \
  --providers both

# After the user explicitly approves Stage C:
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js approve --stage C --repo-root .
```

### 4) Optional: remove `init/` once finished
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js cleanup-init \
  --repo-root . \
  --apply \
  --i-understand
```

---

## Available Add-ons

This init kit supports multiple optional add-ons:

| Add-on | Blueprint Toggle | Purpose |
|--------|-----------------|---------|
| Context Awareness | `addons.contextAwareness` | API/DB/BPMN contracts for LLM |
| DB Mirror | `addons.dbMirror` | Database schema mirroring |
| CI Templates | `addons.ciTemplates` | CI/CD configuration |
| Packaging | `addons.packaging` | Container/artifact packaging |
| Deployment | `addons.deployment` | Multi-environment deployment |
| Release | `addons.release` | Version/changelog management |
| Observability | `addons.observability` | Metrics/logs/traces contracts |

### Enabling Add-ons

In `project-blueprint.json`:

```json
{
  "addons": {
    "contextAwareness": true,
    "dbMirror": true,
    "ciTemplates": true,
    "packaging": true,
    "deployment": true,
    "release": true,
    "observability": true
  }
}
```

Or via capability configuration:

```json
{
  "db": { "enabled": true },
  "ci": { "enabled": true, "platform": "github-actions" },
  "packaging": { "enabled": true, "containerize": true },
  "deploy": { "enabled": true, "model": "k8s" },
  "release": { "enabled": true, "strategy": "semantic" },
  "observability": { "enabled": true, "metrics": true }
}
```

See:
- `ADDONS_DIRECTORY.md` - Add-on conventions
- `ADDON_*.md` files - Individual add-on documentation
- `addons/CONVENTION.md` - Full convention specification

---

## DevOps scaffold (optional)

If the blueprint indicates CI/DevOps needs, Stage C scaffolding can create an `ops/` convention folder:

- `ops/packaging/{services,jobs,apps,scripts,workdocs}/`
- `ops/deploy/{http_services,workloads,clients,scripts,workdocs}/`

When add-ons are enabled, they provide more complete implementations with management scripts.

---

## Files in this init kit

- `stages/` – stage guidance docs
- `skills/initialize-project-from-requirements/` – the skill definition and scripts
- `reference.md` – end-to-end reference
- `ADDON_*.md` – individual add-on documentation
- `ADDONS_DIRECTORY.md` – add-on conventions
- `.init-kit` – marker file
