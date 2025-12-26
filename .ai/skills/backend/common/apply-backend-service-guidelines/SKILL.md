---
name: apply-backend-service-guidelines
description: Apply consistent backend service patterns for HTTP APIs (routing, controllers, services, repositories, validation, config, error handling, testing).
---

# Backend Service Guidelines

## Purpose
Provide a practical, provider-agnostic checklist and working patterns for building and refactoring backend HTTP services with a layered architecture.

## When to use
Use this skill when you are:
- Adding or changing HTTP endpoints (routes, controllers)
- Implementing business logic (services) or data access (repositories)
- Introducing middleware (auth, validation, auditing, rate limits)
- Standardizing error handling, logging, and observability
- Designing configuration loading and validation
- Writing or fixing backend tests (unit and integration)

## Inputs
You SHOULD have:
- The endpoint(s) being added/changed (method + path) and expected request/response shapes
- The business rules (what MUST be enforced, what MAY be optional)
- Data model information (entities, persistence requirements)
- Existing conventions in the codebase (framework, validation library, ORM/query layer)

## Outputs
This skill produces one or more of:
- A clear layering plan: **route → controller → service → repository**
- Implementation scaffolding (controller/service/repository skeletons)
- A validation schema and error contract
- A minimal test plan (unit + integration) with verifiable acceptance criteria

## Architecture rules
These rules prevent “everything everywhere” backends.

1. **Routes MUST only wire HTTP to handlers**
   - Register middleware and delegate to a controller.
   - Routes MUST NOT contain business logic.

2. **Controllers MUST only handle HTTP concerns**
   - Parse/validate inputs, translate errors to HTTP responses, and call services.
   - Controllers SHOULD be thin and testable.

3. **Services MUST contain business logic**
   - Services MUST be free of HTTP concepts (no `req`, `res`).
   - Services SHOULD orchestrate repositories and other services.

4. **Repositories MUST isolate data access**
   - Repositories SHOULD hide ORM/query details from services.
   - If the project is simple, repositories MAY be omitted; once queries become non-trivial, add a repository layer.

## Error handling contract
- You MUST define an error taxonomy (validation, not found, forbidden, conflict, internal).
- You MUST return a consistent error shape across endpoints.
- Unknown errors MUST be logged and mapped to `5xx` without leaking sensitive details.

## Validation
- All external inputs (body, params, query) MUST be validated.
- Validation SHOULD happen at the controller boundary.
- Validation errors MUST map to `4xx` with actionable messages.

## Configuration
- Runtime configuration MUST be centralized and typed.
- Configuration SHOULD be validated at startup.
- Secrets MUST NOT be logged and SHOULD be injected via the runtime environment or a secrets manager.

## Testing expectations
- Services MUST have unit tests for core business rules.
- Endpoints SHOULD have integration tests for request/response + persistence behavior.
- Tests SHOULD cover:
  - Happy path
  - One representative validation failure
  - One representative authorization/permission failure (if applicable)

## Step-by-step workflow
1. **Clarify the API contract**
   - Define request schema and response schema.
   - Decide status codes for success and known failure modes.

2. **Choose the layering**
   - Add/extend: route → controller → service → repository (as needed).

3. **Implement validation**
   - Define a schema for inputs.
   - Convert schema failures to your standard error response.

4. **Implement business logic**
   - Place business rules in the service.
   - Keep functions small; prefer pure helpers for tricky logic.

5. **Implement data access**
   - Use repositories for complex queries and persistence workflows.
   - Add transactions where “all-or-nothing” semantics are required.

6. **Add observability**
   - Add structured logs around boundaries (start/end, key identifiers).
   - Capture exceptions in your error tracker and include correlation IDs if available.

7. **Add tests**
   - Unit tests for service rules.
   - Integration tests for the endpoint behavior.

8. **Verify**
   - Run the service locally or in CI.
   - Validate response shapes and database side effects (if any).

## Boundaries
- You MUST NOT hardcode project-specific paths, scripts, or environment layouts in shared skills.
- You MUST NOT include credentials, secrets, or real tokens in examples.
- You SHOULD NOT introduce new patterns if the codebase already has an established convention unless there is a clear benefit and migration plan.

## Included assets
- Templates: see `./templates/` for controller/service/repository/error scaffolds.
- Examples: see `./examples/` for complete request flows and refactoring patterns.
