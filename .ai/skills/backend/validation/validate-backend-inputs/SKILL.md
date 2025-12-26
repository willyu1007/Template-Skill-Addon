---
name: validate-backend-inputs
description: Validate backend HTTP inputs (params, query, body) with schemas and return consistent 4xx errors for invalid requests.
---

# Validate Backend Inputs

## Purpose
Standardize how backend services validate untrusted inputs at the HTTP boundary and how they communicate validation failures to clients.

## When to use
Use this skill when you are:
- Adding or modifying endpoint request shapes
- Introducing new query parameters or path params
- Implementing partial update endpoints (PATCH/PUT)
- Debugging validation errors or inconsistent error responses

## Inputs
- The endpoint contract (params/query/body)
- Validation rules (required fields, formats, min/max, allowed enums)
- Desired error response shape for invalid input

## Outputs
- Validation schemas for request inputs
- A consistent validation error response mapping (`400` / `422` depending on your convention)
- Examples of valid and invalid payloads

## Rules
- All external inputs MUST be validated (params, query, body).
- Validation MUST happen before calling the service layer.
- Validation failures MUST return consistent status codes and error shapes.
- Validation logic SHOULD be centralized and reusable to avoid divergence.

## Recommended workflow
1. Define request DTO(s) and choose a schema library (or built-in validation).
2. Implement schemas for:
   - params
   - query
   - body
3. Parse/validate at controller boundary.
4. Convert schema errors to your standard error response.
5. Add:
   - one example valid payload
   - one example invalid payload
6. Verify by hitting the endpoint with both payloads.

## Common patterns
- **Create vs update schemas**
  - Create schemas typically require fields.
  - Update schemas often use `.partial()` or optional fields.

- **Enums**
  - Prefer explicit enums instead of free-form strings.

- **Discriminated unions**
  - Use when request shape varies by a `type` field.

## Included assets
- Templates: `./templates/` includes common schema patterns and a validation error formatter.
- Examples: `./examples/` includes DTO + schema examples with valid/invalid payloads.
