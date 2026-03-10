---
name: convex-as-ssot
description: Treat convex/schema.ts as the database Single Source of Truth, initialize Convex scaffolding, regenerate docs/context/db/schema.json and docs/context/convex/functions.json, and verify the repository stays aligned with Convex mode.
---
# Convex as SSOT

## Purpose

Use `convex-as-ssot` when the repository chooses **Convex** as the database and backend-function source of truth.

`convex-as-ssot` defines the workflow for:

- initializing a repo-local Convex skeleton
- treating `convex/schema.ts` as the schema SSOT
- generating `docs/context/db/schema.json` for LLM-readable database structure
- generating `docs/context/convex/functions.json` for LLM-readable Convex function structure
- verifying that the repository remains consistent with Convex mode

## Hard precondition

Use `convex-as-ssot` only when one of the following is true:

- `docs/project/db-ssot.json` already indicates Convex mode, or
- the task is to bootstrap the repository so it can enter Convex mode
- `features.contextAwareness=true` is enabled or will be enabled as part of initialization

When the project uses:

- `db.ssot = repo-prisma` -> use `sync-db-schema-from-code`
- `db.ssot = database` -> use `sync-code-schema-from-db`

## Canonical inputs

Read these inputs in order:

1. `docs/project/db-ssot.json`
2. `docs/context/db/schema.json`
3. `docs/context/convex/functions.json`
4. `convex/schema.ts`
5. `convex/**/*.ts` (excluding `convex/_generated/**`)

## Outputs

The workflow manages these generated or initialized artifacts:

- `convex/**` (scaffold + source of truth)
- `docs/context/db/schema.json` (generated)
- `docs/context/convex/functions.json` (generated)
- `docs/context/convex/functions.schema.json` (template / contract schema)
- optional supporting docs under `docs/context/convex/**`

## Controller commands

```bash
node .ai/scripts/ctl-db-ssot.mjs status --repo-root .
node .ai/scripts/ctl-db-ssot.mjs sync-to-context --repo-root .
node .ai/skills/features/database/convex-as-ssot/scripts/ctl-convex.mjs init --repo-root .
node .ai/skills/features/database/convex-as-ssot/scripts/ctl-convex.mjs verify --repo-root .
```

`ctl-convex.mjs` is limited to implementation-layer scaffold/init/verify work. Contract refresh subcommands are internal-only and manual callers should use `ctl-db-ssot.mjs`.

## Workflow

### Phase 0 — Confirm the mode

1. Read `docs/project/db-ssot.json`.
2. Confirm the project is in Convex mode or is being migrated there.
3. Confirm `convex/schema.ts` is the intended persistence SSOT.

### Phase A — Initialize scaffold

4. If the Convex skeleton is missing, initialize the Convex scaffold:

```bash
node .ai/skills/features/database/convex-as-ssot/scripts/ctl-convex.mjs init --repo-root .
```

5. If the project is not yet configured with Convex locally, a human should run:

```bash
npx convex dev
```

The `npx convex dev` step creates or refreshes local Convex configuration and generated code.

### Phase B — Change the SSOT

6. Apply persistence changes in `convex/schema.ts`.
7. Apply behavioral changes in `convex/**/*.ts`.

### Phase C — Refresh contracts

8. Generate the normalized DB contract and Convex function contract:

```bash
node .ai/scripts/ctl-db-ssot.mjs sync-to-context --repo-root .
```

9. `ctl-db-ssot.mjs sync-to-context` refreshes context checksums best-effort. Re-run `ctl-context touch` only if you edited other context artifacts manually:

```bash
node .ai/skills/features/context-awareness/scripts/ctl-context.mjs touch --repo-root .
```

### Phase D — Verify

10. Verify the feature state:

```bash
node .ai/skills/features/database/convex-as-ssot/scripts/ctl-convex.mjs verify --repo-root .
```

## Parser-safe coding shape

The current contract generator is intentionally lightweight. To keep extraction deterministic in v1:

- define schema as `export default defineSchema({ ... })`
- define functions as `export const name = query|mutation|action|httpAction|internalQuery|internalMutation|internalAction({ ... })`
- define indexes directly on `defineTable(...)` via chained `.index(...)`, `.searchIndex(...)`, `.vectorIndex(...)`

Do NOT rely on v1 contract extraction for:

- wrapper constructors around `query(...)` / `mutation(...)` / `action(...)`
- dynamic schema composition or helper-generated table definitions
- heavily abstracted validator builders where the final literal shape is not directly visible

## Verification

- [ ] `docs/project/db-ssot.json` resolves to Convex mode
- [ ] `convex/schema.ts` exists
- [ ] `docs/context/db/schema.json` was generated from `convex/schema.ts`
- [ ] `docs/context/convex/functions.json` was generated from `convex/**/*.ts`
- [ ] `package.json` includes the `convex` dependency when a package manifest exists
- [ ] public functions are visible in the function contract
- [ ] generated artifacts were not hand-edited after regeneration
- [ ] `convex/_generated/**` is refreshed when signatures changed

## References

- `reference/feature-overview.md`
- `reference/convex-ssot-mechanism.md`
- `reference/context-contracts.md`
- `reference/init-stage-c-integration.md`
- `reference/parser-notes.md`
- `reference/db-ssot.sample.json`

## Boundaries

- Do NOT treat `docs/context/db/schema.json` as the SSOT in Convex mode.
- Do NOT bypass `convex/schema.ts` when stored data shape changes.
- Do NOT assume `convex-as-ssot` rewires `init-pipeline.mjs` by itself; repository integration must still be implemented.
- Do NOT hand-edit `convex/_generated/**`.
