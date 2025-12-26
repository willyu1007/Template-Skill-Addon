---
name: build-react-components
description: Build maintainable React components with TypeScript using clear props, composition, and explicit UI states.
---

# Build React Components

## Purpose
Provide patterns for building reusable, testable React components with clear responsibilities and predictable behavior.

## When to use
Use this skill when you are:
- Creating new components (pages, feature components, shared UI)
- Refactoring large components into smaller units
- Implementing modals/dialogs and forms
- Building lists with filtering, pagination, and empty states

## Inputs
- Component responsibilities and expected interactions
- Data dependencies (what inputs come via props vs fetched)
- Styling approach (UI kit, CSS modules, styled components, etc.)

## Outputs
- Typed component props and public API
- Component structure (container vs presentational as needed)
- Explicit handling for loading/empty/error states
- Example usage and acceptance criteria

## Rules
- Components MUST have typed props (no implicit `any`).
- Components SHOULD be small and composable.
- Components MUST render explicit loading/empty/error states when dependent on async data.
- Components SHOULD avoid hidden side effects; prefer hooks.

## Step-by-step workflow
1. Define the component contract (props, callbacks, UI states).
2. Decide whether it is:
   - presentational (props in, UI out)
   - container (fetching/orchestration + composition)
3. Implement rendering logic:
   - default state
   - loading/empty/error
4. Implement interactions:
   - event handlers
   - accessibility considerations
5. Add a minimal verification:
   - renders
   - primary interaction works
   - error state renders

## Included assets
- Templates: `./templates/` includes component scaffolds (presentational, container, list, modal).
- Examples: `./examples/` includes a complete “profile-style” component example.
