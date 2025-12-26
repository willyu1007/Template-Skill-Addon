---
name: fix-frontend-runtime-errors
description: Fix frontend runtime errors by reproducing the issue, inspecting stacks and network calls, applying minimal fixes, and verifying behavior.
---

# Fix Frontend Runtime Errors

## Purpose
Resolve frontend runtime errors (console exceptions, blank screens, broken interactions) with a structured triage and verification process.

## When to use
Use this skill when:
- The UI shows a runtime exception in the console
- A page renders blank or crashes after navigation
- Data fetching errors are not handled gracefully
- A regression was introduced by recent UI changes

## Inputs
- Error message + stack trace (copy/paste)
- Steps to reproduce (route, clicks, input values)
- Environment details (browser, build, feature flags)
- Relevant network logs (redact secrets)

## Outputs
- Root cause analysis (where and why)
- Minimal code fix (and optional improvement suggestions)
- Verification steps (what to test after the fix)

## Workflow
1. Reproduce the issue reliably.
2. Capture diagnostics:
   - console error + stack trace
   - failing network request(s)
   - UI state at time of failure
3. Classify error:
   - rendering error (null access, undefined field)
   - data contract mismatch (backend response changed)
   - routing error (params missing, route mismatch)
   - async error handling (promise rejection, unhandled errors)
4. Apply a minimal fix:
   - add guards / null checks where appropriate
   - fix type assumptions and data mapping
   - ensure error boundaries or error UI handle failures
5. Verify:
   - reproduce steps no longer fail
   - related flows still work
   - loading/error states render correctly

## Boundaries
- Avoid “fixing” by swallowing errors without visibility.
- Prefer user-safe error UI plus logging/tracking for unexpected failures.

## Included assets
- Templates: `./templates/` includes a bug report capture format.
