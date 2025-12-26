---
name: test-authenticated-routes
description: Test and review authenticated API routes end-to-end by executing real requests, checking responses, and verifying database side effects.
---

# Test Authenticated Routes

## Purpose
Validate that protected API endpoints work end-to-end after changes, including authentication, authorization, request validation, business logic, and persistence side effects.

## When to use
Use this skill when:
- You added or changed a protected endpoint
- You refactored controller/service/repository code for an endpoint
- You added new permission checks
- You suspect a regression in route wiring or middleware order

## Inputs
- A list of changed endpoints (method + path)
- Expected request/response shapes
- Test identities:
  - at least one authorized user
  - optionally one unauthorized user for negative testing
- Expected persistence side effects for write endpoints

## Outputs
- A per-endpoint smoke test record:
  - valid request + response
  - one representative invalid request + response
  - side-effect verification notes (if applicable)
- A lightweight implementation review:
  - correctness risks
  - maintainability concerns
  - missing tests/validation

## Testing protocol

### 1. Inventory endpoints to test
- Prefer using version control diffs, commit messages, or task notes to list changed routes.
- Include:
  - method
  - path
  - whether it is protected
  - whether it writes data

### 2. Understand the contract
For each endpoint:
- Required inputs (params/query/body)
- Expected success status + response shape
- Expected failure codes for common failures

### 3. Execute the happy path
- Call the endpoint using a real authenticated request.
- Record:
  - status code
  - response shape
  - any IDs returned

### 4. Verify persistence side effects (write endpoints)
- Verify that expected records were created/updated/deleted.
- Verify derived effects (queues, audit logs) if the endpoint is supposed to trigger them.

### 5. Execute one negative case
Choose one:
- missing required field
- invalid enum/value range
- insufficient permission (if you can test safely)

### 6. Implementation review (lightweight)
Check:
- route delegates to controller (no business logic in route)
- controller validates inputs
- service contains business rules
- repository isolates persistence
- errors map consistently to status codes and error shapes

## Verification checklist
- [ ] Endpoint returns the expected status code on success.
- [ ] Response shape matches the contract.
- [ ] Validation failures return consistent error shape.
- [ ] Permission failures return `403` (or your convention) with stable code.
- [ ] Database side effects match expectations.
- [ ] No secrets or tokens are logged or recorded.

## Included assets
- Templates: `./templates/` includes a per-endpoint test worksheet.
- Examples: `./examples/` includes a sample test record.
