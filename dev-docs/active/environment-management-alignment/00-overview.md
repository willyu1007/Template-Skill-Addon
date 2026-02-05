# 00 Overview

## Status
- State: done
- Next step: handoff if needed

## Goal
Align environment management with the modular template’s patterns (policy-driven routing + IaC feature), while keeping this repo’s non-modular structure and full backward compatibility.

## Non-goals
- Implement real cloud-provider integrations or production credentials.
- Remove or break existing `env/inventory/*.yaml` workflows.
- Enforce provider-specific paths, toolchains, or runtime assumptions.
- Perform real deployments or remote commands without explicit user approval.

## Context
This repo already added env policy scaffolding and env-cloud/env-local workflows. The modular template adds a policy SSOT and IaC feature conventions that improve routing clarity and LLM guidance. We need to borrow those conventions without introducing module-specific wiring or breaking existing skills/tests.

## Acceptance criteria (high level)
- [x] `env-cloudctl` can resolve cloud targets from `docs/project/policy.yaml` (optional) and falls back to `env/inventory/*.yaml` without regressions.
- [x] IaC feature conventions exist (docs + optional tooling), but do not force a specific provider or module layout.
- [x] Documentation explains the SSOT/flow clearly and matches actual behavior.
- [x] Environment tests and skill linting pass after changes.
