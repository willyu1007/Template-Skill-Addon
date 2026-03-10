# Convex Backend

This directory contains the Convex schema and backend functions.

## First-time local setup

If the repository already has a root `package.json`, init should inject the `convex` dependency and helper scripts automatically.

If it does not, install Convex manually:

```bash
npm install convex
npx convex dev
```

The first interactive `npx convex dev` run creates:

- the local Convex project configuration
- `.env.local` with `CONVEX_DEPLOYMENT`
- generated types under `convex/_generated/**`

## Repository conventions

- Treat `schema.ts` as the persistence SSOT.
- Keep backend logic under `convex/**/*.ts`.
- Convex v1 assumes this repository uses a root-level `convex/` directory and root `package.json`.
- Refresh context contracts after schema or function-signature changes:

```bash
npx convex codegen
node .ai/scripts/ctl-db-ssot.mjs sync-to-context --repo-root .
node .ai/skills/features/database/convex-as-ssot/scripts/ctl-convex.mjs verify --repo-root . --strict
```

If other `docs/context/**` artifacts were hand-edited separately:

```bash
node .ai/skills/features/context-awareness/scripts/ctl-context.mjs touch --repo-root .
```
