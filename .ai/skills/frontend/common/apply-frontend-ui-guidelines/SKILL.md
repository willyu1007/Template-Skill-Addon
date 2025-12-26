---
name: apply-frontend-ui-guidelines
description: Apply consistent frontend UI patterns for modern TypeScript-based apps (components, hooks, routing, data fetching, styling, error states).
---

# Frontend UI Guidelines

## Purpose
Provide a consistent, maintainable baseline for building modern frontend applications with TypeScript: component patterns, data fetching, routing, styling, and UX states.

## When to use
Use this skill when you are:
- Building or refactoring UI components
- Introducing or updating data fetching patterns
- Designing feature/module structure
- Implementing routing and lazy loading
- Standardizing styling and theme usage
- Handling loading, empty, and error states

## Inputs
- Feature requirements and UX expectations
- Data sources (API endpoints, caching needs)
- Existing frontend stack (framework, router, query/cache library, UI kit)

## Outputs
- A consistent implementation plan (component tree + data dependencies)
- Component and hook scaffolds
- A UX-state plan (loading/empty/error)
- A minimal test strategy (where applicable)

## Core rules
- Components MUST have typed props and clear responsibilities.
- Side effects MUST be isolated (prefer hooks or service modules).
- Data fetching MUST have a consistent caching and invalidation strategy.
- UI MUST handle loading, empty, and error states explicitly.
- Styling MUST follow a single primary approach (theme-first where possible).

## Step-by-step workflow
1. Identify the feature boundary and public API (what the feature exports).
2. Design the component tree and state boundaries.
3. Define data dependencies:
   - what is fetched
   - when it is fetched
   - how it is cached and invalidated
4. Implement components using:
   - typed props
   - composition over inheritance
   - small reusable hooks
5. Implement loading/error UX.
6. Add verification:
   - basic render
   - one representative interaction
   - one representative error path

## Included assets
- Templates: `./templates/` provides component and hook scaffolds.
- Examples: `./examples/` provides a feature layout blueprint.
