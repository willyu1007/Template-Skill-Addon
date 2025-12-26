---
name: manage-backend-configuration
description: Manage backend configuration safely with typed, validated settings and clear separation between defaults and secrets.
---

# Manage Backend Configuration

## Purpose
Make backend services reliable across environments by centralizing configuration, validating it at startup, and preventing secret leakage.

## When to use
Use this skill when you are:
- Adding a new config parameter
- Debugging environment-specific bugs
- Introducing new integrations (databases, queues, third-party APIs)
- Refactoring scattered `process.env` usage into a typed config module

## Inputs
- Required config values and their intended defaults
- Which values are secrets (tokens, passwords, private keys)
- Environment matrix (dev/test/staging/prod) and overrides

## Outputs
- A typed config module
- Startup validation and fail-fast behavior
- A documented config contract (required, optional, defaults)

## Rules
- Configuration MUST be centralized and typed.
- Configuration SHOULD be validated at startup.
- Secrets MUST NOT be logged and MUST NOT be checked into version control.
- Defaults SHOULD be explicit and environment-specific overrides SHOULD be documented.

## Recommended workflow
1. Enumerate required settings (include type, required/optional, default).
2. Implement schema validation and parsing.
3. Expose a stable `config` object to the rest of the codebase.
4. Ensure failure is immediate when required config is missing/invalid.
5. Add a small verification:
   - “fails fast” when missing
   - “loads” with a valid example

## Included assets
- Templates: `./templates/` includes a typed config module and schema validation.
- Examples: `./examples/` includes a sample config contract and redaction guidance.
