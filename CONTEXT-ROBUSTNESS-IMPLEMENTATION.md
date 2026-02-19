# Context Robustness Enhancement — Implementation Log

> Implementation record for [CONTEXT-ROBUSTNESS-DESIGN.md](CONTEXT-ROBUSTNESS-DESIGN.md).

> **Template repo state**: Running these scripts in the template repo (before Context Awareness is materialized) operates on template files only. Full pipeline verification requires a materialized repo with `contextAwareness=true`.

## Status

| # | Task | Status | Key Files |
|---|------|--------|-----------|
| 1 | Design document | Done | `CONTEXT-ROBUSTNESS-DESIGN.md` |
| 2 | Context templates (AGENTS.md, glossary, principles) | Done | `templates/docs/context/{AGENTS.md,glossary.json,glossary.schema.json,architecture-principles.md}` |
| 3 | INDEX.md + registry.json updates | Done | `templates/docs/context/{INDEX.md,registry.json}` |
| 4 | OpenAPI quality gate script | Done | `.ai/scripts/ctl-openapi-quality.mjs` |
| 5 | Glossary management commands | Done | `ctl-context.mjs` (add-term, remove-term, list-terms) |
| 6 | Verify extension (glossary schema) | Done | `ctl-context.mjs` (cmdVerify + validateGlossarySchema) |
| 7 | CI integration (api-context suite) | Done | `ci-verify.mjs`, GitHub/GitLab workflow templates |
| 8 | Pre-commit strengthening | Done | `.githooks/pre-commit` |
| 9 | Init pipeline integration | Done | init SKILL.md, `computeNextStepsForStartHere()` |
| 10 | Skill/feature/reference docs | Done | SKILL.md, feature-docs, operating-guide, feature-mechanism |
| 11 | Tests | Done | `quality-gate-tests.mjs` (18 checks) |
| 12 | Provider stub sync | Done | `sync-skills.mjs --mode reset` |

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Quality gate dependency strategy | Zero-dep default + optional `@apidevtools/swagger-parser` for OpenAPI | Keeps template dependency-free; users who need full spec compliance can install |
| Glossary schema validation strategy | Ajv-first with built-in fallback | Ajv tried first for full draft-07; if unavailable, `_validateNode()` runs with info log; `--strict` only means warnings→errors, does NOT require Ajv; schema evolves in `glossary.schema.json` only |
| CI suite precondition handling | Approach A: step-level file check, skip if absent | Minimal change to existing suite mechanism, no new conditional framework needed |
| Glossary materialization | Unified Stage C apply (not separate scaffold) | Consistent with all other `docs/context/` artifacts |
| Post-init glossary migration | LLM-driven (instructions in SKILL.md) | Domain glossary is semi-structured Markdown; LLM excels at Markdown → JSON extraction |
| Empty glossary terms validity | Passes verify | Freshly materialized state is a valid empty state |

## Issues & Resolutions

### Initial Implementation

| Issue | Resolution |
|-------|-----------|
| Test harness returns `code` not `exitCode` | Fixed test assertions to use `r.code` matching `exec.mjs` return contract |

### Post-Review Round

| Issue | Severity | Resolution |
|-------|----------|-----------|
| `validateGlossarySchema()` used normalized data from `loadGlossary()` — missing `version`/`terms` silently filled with defaults | High | Rewrote to validate raw JSON directly (`readJson()`) before normalization |
| `validateGlossarySchema()` hand-coded rules didn't match `glossary.schema.json` constraints (`const: 1`, `additionalProperties: false`) | Medium | Replaced ad-hoc checks with schema-driven approach extracting constraints from schema file |
| AGENTS.md vs INDEX.md entry point conflict (operating-guide, feature-mechanism, agents-snippet still said INDEX.md) | Medium | Updated all three reference docs to cite `AGENTS.md` as authoritative entry |
| AGENTS.md progressive loading order put source code (Step 4) before glossary/principles | Medium | Reordered: glossary → principles → source code (Steps 4-5-6) matching design goal |
| `architecture-principles.md` lacked explicit "Rejected Approaches" section | Low | Added `## Rejected Approaches` section and maintenance instruction |
| Test comment said "missing term" but tested missing definition; no tests for schema constraint violations | Low | Fixed comment; added 5 new glossary tests (missing version, missing terms, wrong version, extra root prop, extra item prop); refactored glossary fixtures to include `glossary.schema.json` |
| Hand-coded validation still didn't cover `type`/`items.type`/`format`/`minLength`; `aliases:[123]` and `updatedAt:123` passed | Medium | Replaced entire `validateGlossarySchema()` with recursive `_validateNode()` JSON Schema validator covering: `type`, `const`, `required`, `properties`, `additionalProperties`, `items`, `minLength`, `format` (advisory). Now semantically equivalent to `glossary.schema.json` |
| Corrupt `glossary.schema.json` silently degraded to lenient validation | Medium | Schema parse failure now returns hard error (exit 1); missing schema file returns warning |
| Tests lacked coverage for `items.type`, `updatedAt` type, schema corruption | Low | Added 3 new tests: `glossary-aliases-item-type`, `glossary-updatedAt-wrong-type`, `glossary-corrupt-schema` |
| Self-maintained `_validateNode()` as sole validator — schema evolution requires code sync | Medium | Restructured to Ajv-first: tries `ajv`+`ajv-formats` for full draft-07 compliance; falls back to `_validateNode()` with info log when unavailable. Future schema changes require no code updates when Ajv is installed |
| Fail-closed `--strict` without Ajv blocked CI and created environment-dependent test | Medium | Decoupled Ajv availability from `--strict` semantics. `--strict` only means warnings→errors (original meaning). Ajv absence produces non-blocking info log + built-in fallback. Test changed to verify strict catches errors via fallback |
| Error message claimed `ajv-formats` required but code treated it as optional | Low | `ajv-formats` consistently treated as optional enhancement (format checks); info log says "pnpm add -D ajv ajv-formats" as recommendation, not requirement |
| Stage C didn't run `touch` after template copy — registry checksums stale, CI verify fails on fresh materialization | High | Added `ctl-context touch` after `ctl-context init` in `ensureContextAwarenessFeature()` |
| Stage C didn't generate api-index from template openapi.yaml — `api-index.json` kept placeholders, CI drift check fails | High | Added conditional `ctl-api-index generate --touch` (runs when openapi.yaml exists) before `ctl-context touch` in init pipeline |
| Stage C passed absolute path to `ctl-api-index generate --source` — `sourceOpenapi` field mismatched CI's relative path → drift check fails | High | Changed to relative path `docs/context/api/openapi.yaml` matching CI convention |
| Feature doc `context-awareness.md` Stage C description didn't mention `generate + touch` steps | Medium | Updated to include steps 4 (api-index generate + touch) and renumbered verify to step 5 |

## Verification Results

### Full Test Suite

```
$ node .ai/tests/run.mjs --suite api-index
[tests] suite=api-index
[tests][api-index] start: api-index-smoke → PASS
[tests][api-index] start: api-index-focused → PASS (9/9 checks)
[tests][api-index] start: quality-gate-tests → PASS (18/18 checks)
```

Quality gate checks verified:
1. Valid OpenAPI passes
2. Missing operationId detected (exit 1)
3. Duplicate operationId detected (exit 1)
4. Undeclared path param detected (exit 1)
5. Missing security scheme ref detected (exit 1)
6. Empty paths exits 0
7. File not found exits 0 with skip message
8. Glossary verify: valid empty glossary passes
9. Glossary verify: term missing definition fails
10. Glossary verify: missing `version` field fails
11. Glossary verify: missing `terms` field fails
12. Glossary verify: `version != 1` fails (const constraint)
13. Glossary verify: extra root property fails (additionalProperties)
14. Glossary verify: extra item property fails (additionalProperties)
15. Glossary verify: `aliases` with non-string items fails (items.type)
16. Glossary verify: `updatedAt` with wrong type fails (type: string)
17. Glossary verify: corrupt schema file fails hard (not silent degrade)
18. Glossary verify: `--strict` works with built-in fallback and catches errors

## File Changes

| Action | File |
|--------|------|
| NEW | `CONTEXT-ROBUSTNESS-DESIGN.md` |
| NEW | `CONTEXT-ROBUSTNESS-IMPLEMENTATION.md` |
| NEW | `.ai/scripts/ctl-openapi-quality.mjs` |
| NEW | `.ai/skills/features/context-awareness/templates/docs/context/AGENTS.md` |
| NEW | `.ai/skills/features/context-awareness/templates/docs/context/glossary.json` |
| NEW | `.ai/skills/features/context-awareness/templates/docs/context/glossary.schema.json` |
| NEW | `.ai/skills/features/context-awareness/templates/docs/context/architecture-principles.md` |
| NEW | `.ai/tests/suites/api-index/quality-gate-tests.mjs` |
| UPDATE | `.ai/skills/features/context-awareness/templates/docs/context/INDEX.md` |
| UPDATE | `.ai/skills/features/context-awareness/templates/docs/context/registry.json` |
| UPDATE | `.ai/skills/features/context-awareness/scripts/ctl-context.mjs` |
| UPDATE | `.ai/skills/features/ci/scripts/ci-verify.mjs` |
| UPDATE | `.ai/skills/features/ci/github-actions-ci/reference/templates/github-actions/ci.yml` |
| UPDATE | `.ai/skills/features/ci/gitlab-ci/reference/templates/gitlab-ci/.gitlab-ci.yml` |
| UPDATE | `.githooks/pre-commit` |
| UPDATE | `init/_tools/skills/initialize-project-from-requirements/SKILL.md` |
| UPDATE | `init/_tools/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs` |
| UPDATE | `.ai/skills/features/context-awareness/SKILL.md` |
| UPDATE | `init/_tools/feature-docs/context-awareness.md` |
| UPDATE | `.ai/skills/features/context-awareness/reference/operating-guide.md` |
| UPDATE | `.ai/skills/features/context-awareness/reference/feature-mechanism.md` |
| UPDATE | `.ai/skills/features/context-awareness/reference/agents-snippet.md` |
| UPDATE | `.ai/tests/suites/api-index/index.mjs` |
| UPDATE | `.ai/tests/AGENTS.md` |
| SYNC | `.codex/skills/` + `.claude/skills/` (provider stubs reset) |
