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
- Refresh context contracts after schema or function-signature changes:

```bash
node .ai/scripts/ctl-db-ssot.mjs sync-to-context --repo-root .
```
