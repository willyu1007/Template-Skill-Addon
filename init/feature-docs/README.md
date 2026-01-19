# Feature Documentation

This directory contains human-facing docs for optional **features** that can be materialized during init **Stage C** (`apply`).

This template does **not** ship an `addons/` directory. Feature assets are integrated under `.ai/`:

- Templates: usually `.ai/skills/features/<feature-id>/templates/` (some features source templates from nested skills; for database: `.ai/skills/features/database/sync-code-schema-from-db/templates/`)
- Control scripts:
  - Repo-level Node controllers: `.ai/scripts/*ctl.js` (and other repo controllers like `sync-skills.cjs`)
  - Feature-local tools: `.ai/skills/features/**/scripts/*` (Node `.js`/`.cjs` and/or Python `.py`)
- Feature flags/state: `.ai/project/state.json` (via `.ai/scripts/projectctl.js`)

## Available features

| Feature ID | Blueprint toggle | Control script | Documentation |
|------------|------------------|----------------|---------------|
| `context-awareness` | `features.contextAwareness` | `contextctl.js` | [context-awareness.md](context-awareness.md) |
| `database` | `features.database` (requires `db.ssot != none`) | `.ai/skills/features/database/sync-code-schema-from-db/scripts/dbctl.js` (when `db.ssot=database`) | [database.md](database.md) |
| `ui` | `features.ui` | `ui_specctl.py` | [ui.md](ui.md) |
| `environment` | `features.environment` | `env_contractctl.py` | [environment.md](environment.md) |
| `packaging` | `features.packaging` | `packctl.js` | [packaging.md](packaging.md) |
| `deployment` | `features.deployment` | `deployctl.js` | [deployment.md](deployment.md) |
| `release` | `features.release` | `releasectl.js` | [release.md](release.md) |
| `observability` | `features.observability` (requires `features.contextAwareness=true`) | `obsctl.js` | [observability.md](observability.md) |

## Related tooling (not blueprint features)

- CI templates controller: [ci.md](ci.md) (`node .ai/scripts/cictl.js ...`)

## How to decide (Stage B)

- You MUST set `features.<id>: true` to install a feature during Stage C.
- Blueprint config sections (`db.*`, `deploy.*`, `packaging.*`, `release.*`, `observability.*`, `context.*`) influence recommendations but do not install by themselves.
- Use the pipeline to compute recommendations:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs suggest-features --repo-root .
```

Common dependency checks (enforced by `validate`):

- `features.database=true` requires `db.ssot != none`.
- `features.observability=true` requires `features.contextAwareness=true`.

## Enabling features

In `init/project-blueprint.json`:

```json
{
  "db": { "enabled": true, "ssot": "database", "kind": "postgres", "environments": ["dev", "staging", "prod"] },
  "features": {
    "contextAwareness": true,
    "database": true,
    "ui": true,
    "environment": true,
    "packaging": true,
    "deployment": true,
    "release": true,
    "observability": true
  }
}
```

Then run Stage C apply:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs apply --repo-root . --providers both
```

## Materialization semantics (Stage C)

By default, Stage C is **non-destructive**:

- Templates are copied into the repo using **copy-if-missing** (existing files are kept).
- Each enabled feature runs its control scripts (Node and/or Python, depending on the feature).
- Disabling a feature later does NOT uninstall previously created files (manual removal only).

Useful flags:

- `--force-features`: overwrite existing files when copying templates
- `--verify-features`: run the feature verify step after init (when available)
- `--non-blocking-features`: continue despite feature errors (default is fail-fast)
