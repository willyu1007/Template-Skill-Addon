# API Context Implementation Log

> Implementation record for [API-CONTEXT-DESIGN.md](API-CONTEXT-DESIGN.md).

> **Template repo status**: Scripts and templates are integrated. Actual `docs/context/` directory only exists after a project enables the Context Awareness feature and runs `init Stage C apply`. Running `ctl-api-index.mjs` directly in the template repo (before Context Awareness is materialized) will fail because `docs/context/api/openapi.yaml` does not exist yet. See `init/AGENTS.md` for setup.

## Status

| # | Task | Status | Key Files |
|---|------|--------|-----------|
| 1 | Implementation log | done | `API-CONTEXT-IMPLEMENTATION.md` |
| 2 | YAML subset parser | done | `.ai/scripts/lib/yaml-lite.mjs` |
| 3 | `ctl-api-index.mjs` script | done | `.ai/scripts/ctl-api-index.mjs` |
| 4 | OpenAPI template enhancement | done | `.ai/skills/features/context-awareness/templates/docs/context/api/openapi.yaml` |
| 5 | Context Awareness template updates | done | `INDEX.md`, `registry.json`, `api-index.json` placeholder |
| 6 | Git hook integration | done | `.githooks/pre-commit` |
| 7 | Smoke test suite | done | `.ai/tests/suites/api-index/` |
| 8 | End-to-end verification | done | Fixture-level smoke tests pass (repo-level requires materialized `docs/context/`) |
| 9 | Round 1 review fixes | done | See [Round 1 Issues](#round-1-review-fixes) |
| 10 | Round 2 review fixes | done | See [Round 2 Issues](#round-2-review-fixes) |
| 11 | Round 3 edge-case fixes | done | See [Round 3 Issues](#round-3-edge-case-fixes) |
| 12 | Round 4 robustness fixes | done | See [Round 4 Issues](#round-4-robustness-fixes) |
| 13 | Round 5 auth semantics fixes | done | See [Round 5 Issues](#round-5-auth-semantics-fixes) |

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| YAML parsing | Added `parseYaml()` to existing `yaml-lite.mjs` (~170 LOC) | Reuses existing module; keeps dependency-free pattern; covers OpenAPI subset (maps, sequences, flow syntax, block scalars, quoted keys) |
| Unsupported YAML features | Anchors (`&`), aliases (`*`), tags (`!!`), merge keys (`<<`) — detected and fail-fast. Complex keys (`? key`) are not detected (extremely rare in OpenAPI) | Not used in standard OpenAPI files; detected features throw clear error with line number on encounter |
| `$ref` resolution | Single-document, 1-level depth via `resolveRef()` + `resolveSchema()` | Sufficient for field-name extraction; handles `allOf` merge |
| API Index format | JSON (`api-index-v1`) + Markdown table | JSON for LLM consumption, Markdown for human review |
| Curl examples | Auto-generated with `<token>` and `<field>` placeholders, auth-type-aware via `components.securitySchemes` lookup | No real credentials; type-specific headers (Bearer, Basic, apiKey with custom name) |
| Sequence item continuation indent | `baseIndent + 2` (fixed) | Standard YAML 2-space convention; matches all OpenAPI tooling output |
| Registry entry mode | `generated` with `source.kind: command` | Communicates that `api-index.json` should be regenerated, not hand-edited |
| Auth detection strategy | Look up `components.securitySchemes[name]` for `type/scheme/in/name`; fall back to name-regex if scheme not found | Accurate even when scheme names are non-conventional (e.g., `customAuth` → `type: apiKey`) |

## Issues & Resolutions

### Initial Implementation

| Issue | Resolution |
|-------|-----------|
| Existing `yaml-lite.mjs` only had flat key-value helpers | Extended the existing module with `parseYaml()` and internal helpers, preserving backward compatibility of all existing exports |
| Block scalar blank lines skipped by tokenizer | `_parseBlockScalar()` reads from `rawLines` directly (bypasses tokenizer) to preserve blank lines within `\|` and `>` blocks |
| OpenAPI status code keys are quoted (`'200'`) | `_findKeyColon()` tracks quote state; `_unquoteScalar()` strips surrounding quotes |

### Round 1 Review Fixes

Based on [API-LLM-FRIENDLINESS-REVIEW.md](API-LLM-FRIENDLINESS-REVIEW.md) (historical).

| ID | Issue | Resolution |
|----|-------|-----------|
| R1-P0-1 | `generatedAt` caused non-deterministic output | `stableStringify()` compares content ignoring `generatedAt`; timestamp only updates when semantic content changes |
| R1-P0-2 | `docs/context/` not materialized in template repo | Added template status banner to `API-CONTEXT-IMPLEMENTATION.md`; clarified scope in status table |
| R1-P1-1 | YAML anchors/aliases silently produce wrong output | `_detectUnsupportedSyntax()` scans for `&`, `*`, `!!`, `<<` and throws with line number |
| R1-P1-2 | `diff` missed `operationId`/`tag`/`example` changes | Extended comparison in `cmdDiff` to cover all endpoint fields |
| R1-P1-3 | Path-level parameters ignored | `buildParams()` now merges `pathItem.parameters` with `operation.parameters` (op-level overrides via `Map` keyed by `in:name`) |
| R1-P1-4 | Curl example hardcoded Bearer for all auth types | `buildCurlExample()` generates type-specific headers: Bearer, Basic, API-Key |
| R1-P2-1 | Implementation log wording: "end-to-end" too broad | Changed to "Fixture-level smoke tests pass" |
| R1-P2-3 | `.ai/tests/AGENTS.md` missing `api-index` suite | Added `api-index` to quick reference, commands, and structure sections |

### Round 2 Review Fixes

Based on [API-LLM-FRIENDLINESS-REVIEW-ROUND2.md](API-LLM-FRIENDLINESS-REVIEW-ROUND2.md).

| ID | Issue | Resolution |
|----|-------|-----------|
| R2-P1-1 | Pre-commit hook triggered by template path changes | Changed grep to `^docs/context/api/openapi\.ya?ml$` + added `[ -f docs/context/api/openapi.yaml ]` existence guard |
| R2-P2-1 | Auth inferred from scheme name only, not `securitySchemes` definition | `inferAuth()` now accepts full doc, looks up `components.securitySchemes[name]` for actual `type/scheme/in/name`; falls back to name-regex |
| R2-P2-2 | Registry template: empty `checksumSha256` violates schema pattern; db-schema `source.kind: "generated"` not in enum | Removed `checksumSha256`/`lastUpdated` from api-index entry (optional fields); changed db-schema `source.kind` to `"command"` |
| R2-P2-3 | Documentation claimed "complex keys" fail-fast but not implemented | Corrected to explicitly list detected features; noted complex keys are not detected |
| R2-P3-1 | New fix points lacked automated test coverage | Added `api-index-focused.mjs` with 4 focused tests: idempotent output, securitySchemes lookup, anchor fail-fast, path-level params |
| R2-P3-2 | First review doc marked open issues that are now closed | Added "SUPERSEDED" header to `API-LLM-FRIENDLINESS-REVIEW.md` |

### Round 3 Edge-Case Fixes

| ID | Issue | Resolution |
|----|-------|-----------|
| R3-1 | YAML `*`/`&` detection false positives: Markdown emphasis (`*all*`) and HTML entities (`&amp;`) in descriptions rejected as aliases/anchors | `_detectUnsupportedSyntax()` now checks `&`/`*` only at value-start position (after `: ` or `- `), strips quoted string content before scanning |
| R3-2 | apiKey in `query`/`cookie` generates curl with no auth info | `buildCurlExample()` now appends `?param=<api-key>` to URL for query apiKey, adds `Cookie: name=<api-key>` header for cookie apiKey |
| R3-3 | Pre-commit grep matches `.yml` but existence check only tests `.yaml` | Existence check now probes both `.yaml` and `.yml`; passes actual filename to `--source` flag |
| R3-4 | New edge cases lacked test coverage | Added `testMarkdownNotFalsePositive` and `testApiKeyQueryCookie` to `api-index-focused.mjs` (total: 6 focused tests) |

### Round 4 Robustness Fixes

Based on manual edge-case testing.

| ID | Issue | Resolution |
|----|-------|-----------|
| R4-1 | `--out-md` pointing to new directory causes ENOENT (only JSON dir was created) | Added `fs.mkdirSync(path.dirname(outMdAbs), { recursive: true })` before Markdown write |
| R4-2 | OpenAPI optional auth `security: [{}, {bearerAuth: []}]` resolved to `unknown` | `inferAuth()` now iterates security entries, skipping empty `{}` objects, and picks the first non-empty scheme |
| R4-3 | Pipe `\|` in summary/path breaks Markdown table column alignment | Added `escMdCell()` to escape `\|` in all user-content table cells |

### Round 5 Auth Semantics Fixes

| ID | Issue | Resolution |
|----|-------|-----------|
| R5-1 | `security: [{}]` returned `type: "none (optional)"` which caused `buildCurlExample` to emit `-H 'Authorization: <none (optional)>'` | Separated display from logic: `inferAuth()` returns `{ type: 'none' }` for pure-anonymous; `buildCurlExample` uses clean `type` field |
| R5-2 | `security: [{}, {bearerAuth}]` output `auth: "bearer"` — lost "anonymous also allowed" semantics | `inferAuth()` detects `{}` entries → sets `optional: true`; endpoint `auth` field now shows `"bearer (optional)"` while curl still generates correct Bearer header |
| R5-3 | No test coverage for optional auth patterns | Added `testOptionalAuth` to `api-index-focused.mjs`: verifies `[{}]` → `none` with no curl auth, `[{}, {bearer}]` → `bearer (optional)` with Bearer curl |

## Verification Results

### Round 5 (latest)

```
$ node .ai/tests/run.mjs --suite api-index
  [api-index-smoke] PASS
  [api-index-focused] (7 tests) PASS
  [tests] PASS

# security: [{}] (R5-1 fix)
$ auth: "none", curl has no auth header: PASS

# security: [{}, {bearerAuth}] (R5-2 fix)
$ auth: "bearer (optional)", curl: -H 'Authorization: Bearer <token>': PASS
```

### Round 4

```
# --out-md to new directory (R4-1 fix)
$ generate --out-md other/dir/INDEX.md → exit 0, file created: PASS

# Pipe in summary (R4-3 fix)
$ summary "Get A | B data" → rendered as "Get A \| B data" in MD table: PASS
```

### Round 3

```
$ node .ai/tests/run.mjs --suite api-index
  [api-index-smoke] PASS
  [api-index-focused] idempotent: PASS
  [api-index-focused] securitySchemes: PASS
  [api-index-focused] anchor-fail-fast: PASS
  [api-index-focused] path-level-params: PASS
  [api-index-focused] markdown-no-false-positive: PASS
  [api-index-focused] apikey-query-cookie: PASS
  [tests] PASS

$ node .ai/tests/run.mjs --suite context-awareness
  [context-awareness-contextctl-smoke] PASS
  [tests] PASS
```

### Round 2

```
$ node .ai/tests/run.mjs --suite api-index
  [api-index-smoke] PASS
  [api-index-focused] idempotent: PASS
  [api-index-focused] securitySchemes: PASS
  [api-index-focused] anchor-fail-fast: PASS
  [api-index-focused] path-level-params: PASS
  [tests] PASS

$ node .ai/tests/run.mjs --suite context-awareness
  [context-awareness-contextctl-smoke] PASS
  [tests] PASS

# Custom securitySchemes auth detection (R2-P2-1 fix)
$ customAuth (type: apiKey, name: X-My-Token) → auth: apiKey, curl: -H 'X-My-Token: <api-key>': PASS

# Pre-commit hook scope (R2-P1-1 fix)
$ Template path no longer matches grep pattern: PASS
```

### Round 1

```
# Deterministic output verification (R1-P0-1 fix)
$ generate twice with same OpenAPI → SHA identical: PASS

# YAML anchor fail-fast (R1-P1-1 fix)
$ OpenAPI with &anchor → exit 1, "anchors (&) are not supported (line 5)": PASS

# Path-level params merge (R1-P1-3 fix)
$ pathItem.parameters + operation.parameters → merged correctly: PASS

# Auth-aware curl (R1-P1-4 fix)
$ bearer/apiKey/basic/none → distinct header styles: PASS
```

Smoke test coverage (9 focused + 10-step smoke):
- `generate` — parses 3-endpoint OpenAPI YAML, produces correct JSON + Markdown
- `verify --strict` — passes after generate, fails after OpenAPI modification (drift detection)
- `diff` — detects changed endpoint after OpenAPI modification
- Re-generate + re-verify — confirms full cycle correctness
- Structural validation — version field, endpoint count, operationId, required body fields, error codes
- Idempotent output — same OpenAPI generates byte-identical JSON
- securitySchemes lookup — custom-named schemes resolve to correct type and curl headers
- Anchor fail-fast — YAML anchors cause immediate error with line number
- Path-level params — `pathItem.parameters` merged with `operation.parameters`
- Markdown emphasis — `*bold*` in descriptions not falsely rejected as YAML alias
- apiKey query/cookie — query apiKey appears in URL, cookie apiKey appears as `Cookie:` header
- Optional auth — `security: [{}]` → `none`; `[{}, {bearer}]` → `bearer (optional)`
- `--out-md` separate dir — Markdown output to custom directory auto-creates parents
- Pipe escape — `|` in summary correctly escaped as `\|` in Markdown table, column count intact

## File Changes

| Action | File |
|--------|------|
| NEW | `.ai/scripts/ctl-api-index.mjs` — generate/verify/diff commands |
| NEW | `.ai/tests/suites/api-index/index.mjs` — test suite entry |
| NEW | `.ai/tests/suites/api-index/api-index-smoke.mjs` — 10-step smoke test |
| NEW | `.ai/tests/suites/api-index/api-index-focused.mjs` — 9 focused regression tests (Round 2–5) |
| NEW | `.ai/skills/features/context-awareness/templates/docs/context/api/api-index.json` — empty placeholder |
| NEW | `API-CONTEXT-IMPLEMENTATION.md` — this file |
| UPDATE | `.ai/scripts/lib/yaml-lite.mjs` — added `parseYaml()`, `_detectUnsupportedSyntax()` (value-start-only detection, quote-stripping), internal helpers |
| UPDATE | `.ai/scripts/ctl-api-index.mjs` — `inferAuth()` uses securitySchemes lookup; `buildParams()` merges path-level; `stableStringify()` for idempotent output; `buildCurlExample()` auth-type-aware with query/cookie apiKey support; `cmdDiff` extended comparison |
| UPDATE | `.ai/skills/features/context-awareness/templates/docs/context/api/openapi.yaml` — `x-source-mapping`, example endpoint, `securitySchemes` |
| UPDATE | `.ai/skills/features/context-awareness/templates/docs/context/INDEX.md` — API Index entry, updated LLM loading protocol |
| UPDATE | `.ai/skills/features/context-awareness/templates/docs/context/registry.json` — `api-index` artifact entry (no empty checksumSha256); db-schema `source.kind` fixed to `"command"` |
| UPDATE | `.githooks/pre-commit` — narrowed grep to `^docs/context/api/openapi\.ya?ml$` + `.yaml`/`.yml` dual existence guard with `--source` passthrough |
| UPDATE | `.ai/tests/run.mjs` — registered `api-index` suite |
| UPDATE | `.ai/tests/AGENTS.md` — added `api-index` suite to quick reference, commands, structure |
| UPDATE | `API-LLM-FRIENDLINESS-REVIEW.md` — marked as historical (SUPERSEDED) |
