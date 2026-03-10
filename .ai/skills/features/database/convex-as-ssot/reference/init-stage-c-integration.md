# Init / Stage C Integration Notes

This file documents how this skill package should be wired into the template repository.

## 1. Blueprint schema

Add `convex` to the allowed database workflow choices.

Recommended changes:

- `db.ssot`: add `convex`
- `db.kind`: add `convex`
- validation: `features.database=true` still required when `db.ssot=convex`
- validation: `features.contextAwareness=true` is also required when `db.ssot=convex`

## 2. Stage C materialization

When `db.ssot=convex`, Stage C should:

1. copy `.ai/skills/features/database/convex-as-ssot/templates/` into the repo root
2. run:

```bash
node .ai/skills/features/database/convex-as-ssot/scripts/ctl-convex.mjs init --repo-root .
```

3. write `docs/project/db-ssot.json`, update the root AGENTS DB-SSOT block, and refresh contracts through the public entrypoint:

```bash
node .ai/scripts/ctl-db-ssot.mjs sync-to-context --repo-root .
```

4. optionally verify:

```bash
node .ai/skills/features/database/convex-as-ssot/scripts/ctl-convex.mjs verify --repo-root .
```

## 3. `docs/project/db-ssot.json`

In Convex mode, the generated config should point at `convex/schema.ts` and the function contract.

Example shape:

```json
{
  "db": {
    "ssot": "convex",
    "source": {
      "kind": "convex-schema",
      "path": "convex/schema.ts"
    },
    "contracts": {
      "dbSchema": "docs/context/db/schema.json",
      "convexFunctions": "docs/context/convex/functions.json"
    }
  }
}
```

## 4. Central DB SSOT controller

Either:

- extend `.ai/scripts/ctl-db-ssot.mjs` to understand `convex`, or
- delegate from it to `ctl-convex.mjs`

The second option keeps Convex-specific parsing logic inside the Convex skill package.

## 5. Human interface and context-awareness

The following components need light adaptation, not replacement:

- `db-human-interface`
- `context-awareness`
- `init/_tools/feature-docs/database.md`
- `init/_tools/feature-docs/context-awareness.md`
