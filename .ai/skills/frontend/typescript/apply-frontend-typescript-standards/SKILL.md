---
name: apply-frontend-typescript-standards
description: Apply frontend TypeScript standards for safety and maintainability (strict typing, props DTOs, safe utilities, no implicit any).
---

# Apply Frontend TypeScript Standards

## Purpose
Prevent runtime UI bugs by enforcing consistent TypeScript patterns and avoiding unsafe shortcuts.

## When to use
Use this skill when you are:
- Adding new components, hooks, or API clients
- Fixing type errors and improving type safety
- Introducing new feature modules with public exports
- Reviewing PRs for TypeScript quality

## Inputs
- Existing TypeScript configuration and lint rules
- Feature types/DTOs and API shapes
- Known type pain points (implicit `any`, unions, nullability)

## Outputs
- Typed props and module public APIs
- Safe utility types and helper functions
- Reduced reliance on `any` and type assertions

## Rules
- `any` SHOULD be avoided; prefer `unknown` + refinement when needed.
- Public module APIs MUST be typed and stable.
- Narrowing MUST be explicit for `unknown` values.
- Prefer discriminated unions for complex state machines.

## Step-by-step workflow
1. Define types at the boundary:
   - API DTOs
   - component props
2. Prefer inference where safe; add annotations at boundaries.
3. Replace unsafe casts with:
   - runtime checks
   - schema validation (if available)
4. Use discriminated unions for complex UI state.
5. Verify:
   - TypeScript build passes
   - no new unsafe escapes introduced

## Included assets
- Examples: `./examples/` includes safe patterns for `unknown` and discriminated unions.
