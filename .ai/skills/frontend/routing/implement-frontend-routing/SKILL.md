---
name: implement-frontend-routing
description: Implement frontend routing with predictable route definitions, lazy loading, nested layouts, and error/404 handling.
---

# Implement Frontend Routing

## Purpose
Standardize client-side routing so navigation, code-splitting, and error states are predictable and maintainable.

## When to use
Use this skill when you are:
- Adding new pages or routes
- Introducing lazy loading / code splitting
- Implementing nested routes and layouts
- Adding route guards (auth, permissions)
- Debugging routing issues (404s, broken links, chunk loading errors)

## Inputs
- Route list and URL structure
- Authentication/authorization requirements
- Layout and navigation expectations
- Router library and conventions used by the codebase

## Outputs
- Route definitions (paths, components, metadata)
- Lazy-loading strategy (what to split and where)
- Error/404 handling plan

## Rules
- Routes MUST have a single source of truth (central config or feature routes, not both without a clear rule).
- Route guards MUST be explicit and testable.
- Lazy loading SHOULD be used for large feature routes to reduce initial bundle size.
- The app MUST have a 404/not-found route.

## Step-by-step workflow
1. Add a route entry:
   - path
   - component
   - optional metadata (title, required roles)
2. Decide if the route should be lazy-loaded.
3. Add a guard if access is restricted.
4. Ensure there is a not-found fallback.
5. Verify:
   - navigation works
   - direct URL entry works
   - lazy chunk loads successfully
   - unauthorized access is handled gracefully

## Included assets
- Templates: `./templates/` includes lazy route scaffolds.
- Examples: `./examples/` includes route configuration patterns.
