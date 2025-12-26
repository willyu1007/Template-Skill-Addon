---
name: test-backend-services
description: Design and implement backend tests (unit, integration) for services and HTTP endpoints with clear acceptance criteria.
---

# Test Backend Services

## Purpose
Provide a practical testing strategy for backend services that balances confidence, speed, and maintainability.

## When to use
Use this skill when you are:
- Adding a new service method or business rule
- Adding or modifying an endpoint
- Fixing regressions and adding coverage
- Introducing test fixtures, factories, or test data builders

## Inputs
- Business rules and expected outcomes
- Endpoint contract (if testing HTTP)
- Persistence requirements (if integration tests verify DB side effects)
- Existing testing framework and conventions

## Outputs
- A test plan (unit + integration) with acceptance criteria
- Unit tests for service logic (mocked dependencies)
- Integration tests for HTTP behavior (optional but recommended)

## Rules
- Business rules MUST be covered by unit tests at the service layer.
- Integration tests SHOULD cover at least one happy-path request for each new endpoint.
- Tests MUST be deterministic and isolated (no reliance on external shared state).
- Tests MUST NOT require real credentials.

## Recommended test pyramid
1. **Unit tests**
   - fast
   - focus on business logic
   - dependencies mocked

2. **Integration tests**
   - verify wiring and persistence
   - run against an isolated DB (ephemeral or test container)

3. **End-to-end tests**
   - optional
   - use sparingly for critical flows

## Step-by-step workflow
1. Identify critical behaviors and failure modes.
2. Write service unit tests first:
   - success path
   - one representative domain error (e.g., conflict)
3. Add endpoint integration test (when applicable):
   - request validation and response shape
   - database side effects (if any)
4. Add fixtures/builders to reduce boilerplate.
5. Verify tests run reliably in CI.

## Included assets
- Templates: `./templates/` includes unit and integration test scaffolds.
- Examples: `./examples/` includes a service unit test example.
