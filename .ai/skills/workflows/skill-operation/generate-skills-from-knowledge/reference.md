# Reference: Converting Knowledge Docs into Agent Skills

## Goal
Turn “knowledge documents” (guides, runbooks, standards, architecture notes) into **capability-oriented** skills that an agent can select via the `description` signal and execute via the `Steps` section.

## Key decisions (apply in this order)
1. **Discovery-first**: the first sentence (`description`) must help an agent decide “use me now”.
2. **One intent per skill**: if a user can reasonably ask for two different things, split into two skills.
3. **Progressive disclosure**: keep `SKILL.md` short; move depth into `reference.md`, `examples/`, `templates/`.
4. **Portability by default**: remove provider- and repo-specific coupling unless explicitly required.

## Skill identification heuristic
A good skill is typically centered on one of these:
- a repeatable workflow (“debug X”, “migrate Y”, “write Z spec”)
- a concrete artifact (“generate a config”, “produce a report”, “create a test plan”)
- a bounded domain action (“add middleware”, “validate input”, “instrument tracing”)

Signals that a source doc should be split:
- multiple “How to …” sections with different objects
- multiple audiences (developer vs SRE vs PM)
- step sequences that share little overlap
- heavy branching (“if A then … else …”) that can be separated by trigger

Signals that multiple source docs should be merged:
- same trigger and same output, different phrasing
- one doc is prerequisites/background, another is procedure

## Writing a high-signal `description`
The description should:
- start with an action verb (“Generate…”, “Convert…”, “Debug…”, “Validate…”)
- include a discriminating noun phrase (“skills bundle”, “API route”, “deployment manifest”)
- include at least one trigger phrase that a user might say
- avoid internal jargon unless it is stable and shared

Examples (style, not content):
- “Generate an API smoke-test plan for authenticated routes.”
- “Convert Markdown runbooks into portable Agent Skills.”

## Converting source content: what goes where
### `SKILL.md` (keep short)
Keep only:
- purpose + when-to-use triggers
- required inputs and expected outputs
- a numbered procedure that an agent can execute
- boundaries and verification

### `reference.md`
Put:
- rationale, tradeoffs
- fuller explanation of edge cases
- alternative approaches
- extended checklists

### `examples/`
Put:
- scenario-specific examples (one scenario per file)
- “good/bad” examples for prompts and outputs
- minimal but copy/pasteable samples

### `templates/`
Put:
- skeletons for outputs (report outline, checklist, config stub)
- reusable snippets (schema, folder layout stubs)
- anything intended to be copied and filled

## Portability and sanitization checklist
When converting from repo-specific or provider-specific docs:
- Replace hard-coded paths with **placeholders** (e.g., `<repo_root>`, `<skills_root>`).
- Replace script names with **functional descriptions** unless the script is shipped with the skill.
- Remove tool/platform instructions that require a specific vendor, unless you keep them under “Optional provider notes”.
- Remove cross-skill links (“See also”, “Related docs”). Skills should be discoverable without reading chains.

## A plan file is the contract
The conversion plan is intended to be produced by an agent (or a human) and then applied by the helper script.

Principles:
- the plan is **reviewable** before any write happens
- the plan enumerates the blast radius (directories/files that will be created)
- the plan explicitly records split/merge decisions and rationale

## Minimal prompt template (for any LLM)
Use this when asking an LLM to generate or refine a plan:

Goal:
- Convert the provided knowledge docs into a provider-agnostic Agent Skills bundle.

Inputs:
- Source docs: <list paths>
- Constraints: <portability constraints>
- Target taxonomy: <tier1/tier2 or none>

Constraints (MUST / DON'T):
- MUST follow the SKILL.md format (YAML frontmatter with name/description).
- MUST keep SKILL.md short and move detail into examples/templates/reference.
- DON'T include cross-skill references.
- DON'T keep provider-specific instructions unless explicitly required.

Acceptance criteria:
- Each skill directory has SKILL.md and an unambiguous description.
- Examples/templates extracted into subfolders as appropriate.
- Lint passes with no errors.

## Suggested review workflow
1. Review the plan JSON for naming, taxonomy, and blast radius.
2. Run `apply`.
3. Edit generated skills.
4. Run `lint`.
5. Package (optional).
