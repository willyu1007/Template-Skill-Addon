# Context Robustness Enhancement Design

## 1. Problem Statement

LLMs working with projects built from this template need reliable, deterministic access to project context. Current gaps:

| Gap | Impact |
|-----|--------|
| No dedicated LLM routing entrypoint in `docs/context/` | LLM must read INDEX.md and infer load order |
| No OpenAPI semantic quality gate | Incomplete endpoints (missing operationId/summary/tags) produce low-quality API Index |
| No project-level glossary artifact | LLM cannot resolve domain-specific terms without scanning code/docs |
| No architecture principles artifact | LLM may propose solutions that violate established constraints |
| No CI enforcement for API context | Drift between OpenAPI and API Index goes undetected until manual review |

## 2. Design Goals

| Goal | Metric |
|------|--------|
| **Deterministic discovery** | LLM finds context loading protocol in one routing hop via `docs/context/AGENTS.md` |
| **Semantic correctness** | Invalid OpenAPI blocked before merge (quality gate exits non-zero) |
| **Progressive loading** | Fixed load order: registry -> api-index -> openapi -> glossary -> principles -> code |
| **Verifiable** | Local pre-commit + CI both fail on drift and semantic violations |
| **Knowledge access** | Domain terms and architecture constraints available as structured artifacts |

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     LLM Entry (docs/context/AGENTS.md)                  │
│   Progressive Loading Protocol: registry → api-index → openapi →        │
│   glossary → principles → code                                          │
└──────────┬──────────────────┬──────────────┬──────────────┬─────────────┘
           │                  │              │              │
   ┌───────▼───────┐  ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼──────────────┐
   │ API Context    │  │ Knowledge   │ │ Registry  │ │ Source Code        │
   │                │  │ Artifacts   │ │           │ │ (last resort)      │
   │ openapi.yaml   │  │             │ │ registry  │ │                    │
   │ api-index.json │  │ glossary    │ │ .json     │ │ via x-source-      │
   │ API-INDEX.md   │  │ .json       │ │           │ │ mapping            │
   │                │  │ arch-       │ │           │ │                    │
   │                │  │ principles  │ │           │ │                    │
   │                │  │ .md         │ │           │ │                    │
   └───────┬───────┘  └──────┬──────┘ └───────────┘ └────────────────────┘
           │                  │
   ┌───────▼──────────────────▼──────────────────────────────────────────┐
   │                    Enforcement Chain                                 │
   │  1. ctl-openapi-quality verify (semantic gate)                      │
   │  2. ctl-api-index generate (regenerate index)                       │
   │  3. ctl-api-index verify (freshness check)                          │
   │  4. ctl-context verify (registry + checksum consistency)            │
   │  5. git diff --exit-code (drift detection)                          │
   └─────────────────────────────────────────────────────────────────────┘
```

## 4. New Artifacts

### 4a. `docs/context/AGENTS.md` — LLM Routing Entrypoint

Provides a fixed progressive-loading protocol with MUST/SHOULD rules and two canonical task recipes:
- "Find endpoint for business intent"
- "Implement/change one endpoint safely"

Fallback: if `docs/context/` is missing, instructs LLM to run init Stage C apply.

### 4b. `docs/context/glossary.json` — Domain Glossary

Structured JSON for term resolution. Schema: `glossary-v1`.

```json
{
  "version": 1,
  "updatedAt": "...",
  "terms": [
    {
      "term": "tenant",
      "definition": "An isolated customer organization with its own data and configuration space",
      "scope": "global",
      "aliases": ["organization", "org"],
      "see_also": ["workspace"]
    }
  ]
}
```

Fields: `term` (required), `definition` (required), `scope` (optional), `aliases` (optional), `see_also` (optional). Empty `terms` array is a valid state.

Management: `ctl-context add-term / remove-term / list-terms`.

### 4c. `docs/context/architecture-principles.md` — Architecture Principles

Markdown file recording cross-cutting constraints and rejected alternatives. Maintained by direct editing + `ctl-context touch`.

### 4d. `docs/context/glossary.schema.json` — Glossary JSON Schema

Machine-checkable schema for `glossary.json`. Used by `ctl-context verify` when the glossary exists.

## 5. OpenAPI Semantic Quality Gate

### 5a. Script: `.ai/scripts/ctl-openapi-quality.mjs`

CLI: `node .ai/scripts/ctl-openapi-quality.mjs verify --source <path> [--strict] [--format text|json]`

Zero-dependency layer (default checks):

| Check | Scope | Description |
|-------|-------|-------------|
| Required fields | Per endpoint | operationId, summary, tags (non-empty array), responses with at least one 2xx |
| Unique operationId | Cross-endpoint | No duplicates across all operations |
| Security scheme refs | Cross-endpoint | security entries reference existing components.securitySchemes |
| Path param declaration | Per endpoint | All `{param}` placeholders declared in parameters (in: path) |
| `$ref` resolution | Cross-endpoint | Referenced schemas exist in components.schemas |

Optional enhancement layer: when `@apidevtools/swagger-parser` is available, enables full OpenAPI 3.x compliance validation.

File-not-found behavior: exit 0 with skip message (compatible with unmaterialized repos).

### 5b. Pre-commit Integration

When OpenAPI file is staged and exists, run quality check before API Index regeneration. Failure blocks commit.

## 6. CI Integration

New `api-context` suite in `ci-verify.mjs` with 5-step chain:

1. `ctl-openapi-quality.mjs verify --strict`
2. `ctl-api-index.mjs generate --touch`
3. `ctl-api-index.mjs verify --strict`
4. `ctl-context.mjs verify --strict`
5. `git diff --exit-code` on generated artifacts

Precondition check: if `docs/context/api/openapi.yaml` does not exist, the entire suite skips with an informational message.

## 7. Init Pipeline Integration

After Stage C apply with `contextAwareness=true`, the LLM is instructed to migrate terms from `init/_work/stage-a-docs/domain-glossary.md` (Markdown) into `docs/context/glossary.json` (structured JSON). The SKILL.md provides the target format spec so the LLM can perform the conversion directly.

## 8. File Layout

```
docs/context/
├── AGENTS.md                    (NEW — LLM routing entrypoint)
├── INDEX.md                     (UPDATED — new artifact entries)
├── registry.json                (UPDATED — glossary + principles registered)
├── glossary.json                (NEW — domain glossary)
├── glossary.schema.json         (NEW — glossary JSON Schema)
├── architecture-principles.md   (NEW — architecture constraints)
├── api/
│   ├── openapi.yaml
│   ├── api-index.json
│   └── API-INDEX.md
├── db/
│   └── schema.json
└── process/
    └── example.bpmn
```

## 9. Verification Checklist

Run in a materialized repo (`contextAwareness=true`):

```bash
node .ai/scripts/ctl-openapi-quality.mjs verify --source docs/context/api/openapi.yaml --strict
node .ai/scripts/ctl-api-index.mjs generate --touch
node .ai/scripts/ctl-api-index.mjs verify --strict
node .ai/skills/features/context-awareness/scripts/ctl-context.mjs verify --strict
git diff --exit-code docs/context/api/api-index.json docs/context/api/API-INDEX.md docs/context/registry.json
```

## 10. Boundaries

- Out of scope: business API implementation, framework-specific OpenAPI generators, production secrets
- Glossary and architecture-principles are manually maintained artifacts (no auto-generation)
- The optional OpenAPI parser enhancement layer requires explicit dependency installation
- CI wiring only activates when both `contextAwareness` and `ci` features are enabled
