# Stage A - Requirements (DoD-driven)

## Goal

Produce a verifiable set of requirement documents under `docs/project/`.

## Outputs (files)

- `docs/project/requirements.md`
- `docs/project/non-functional-requirements.md`
- `docs/project/domain-glossary.md`
- `docs/project/risk-open-questions.md`

Templates:
- `init/skills/initialize-project-from-requirements/templates/`

Interview guide:
- `init/skills/initialize-project-from-requirements/templates/conversation-prompts.md`

## Steps

1. Run a structured interview (start with MUST-ask questions, then branch modules).
2. Draft the four documents from templates.
3. Iterate with the user until the Definition of Done is met.

## Definition of Done (DoD)

- `requirements.md` includes explicit:
  - Goals (MUST)
  - Non-goals (OUT)
  - Core user journeys with acceptance criteria
- `non-functional-requirements.md` includes measurable targets or explicit TBD items.
- `domain-glossary.md` defines all domain terms used in requirements.
- `risk-open-questions.md` consolidates all unresolved decisions (owner + options + decision due).

## Verification

Run:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js check-docs --docs-root docs/project
```

Strict gate (optional):

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js check-docs --docs-root docs/project --strict
```

