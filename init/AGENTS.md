# Initialization Instructions (LLM)

You are initializing a new project using this repository template.

## Conclusions (read first)

- You MUST follow a **3-stage, file-based** pipeline:
  - **Stage A**: write requirement docs under `docs/project/` (DoD-driven).
  - **Stage B**: write a machine-readable blueprint at `docs/project/project-blueprint.json`.
  - **Stage C**: scaffold minimal structure + select skill packs by updating `.ai/skills/_meta/sync-manifest.json`, then run `node .ai/scripts/sync-skills.js`.
- Add-on (optional): If the user wants **context awareness** (API/DB/BPMN grounding), set `project-blueprint.json` → `context.enabled = true`. Stage C will install the add-on payload and enable the `context-core` pack before syncing wrappers.
- You MUST keep changes **verifiable**:
  - Each stage ends with a checklist and a command that verifies outputs.
- You MUST NOT edit generated wrapper stubs directly:
  - Do not edit `.codex/skills/` or `.claude/skills/` by hand.
  - Only edit SSOT in `.ai/skills/`, then run `node .ai/scripts/sync-skills.js`.
- Add-on (optional): If the user wants **context awareness** (API/DB/BPMN grounding), set `project-blueprint.json` → `context.enabled = true`. Stage C will install the add-on payload and enable the `context-core` pack before syncing wrappers.

## Inputs you MUST collect from the user

Use `init/skills/initialize-project-from-requirements/templates/conversation-prompts.md` as your question bank.

Minimum required inputs:

- one-line project purpose
- primary user roles
- in-scope MUST requirements and out-of-scope (OUT)
- top user journeys with acceptance criteria
- constraints (compliance/security/platform/deadlines/integrations)
- repo layout intent (`single` vs `monorepo`)
- quality expectations (testing/CI/devops)

If the user cannot decide, you MUST record TBD items in `docs/project/risk-open-questions.md` (owner + options + decision due).

## Stage A - Requirements (write files)

### Outputs

Create/update these files under `docs/project/`:

- `requirements.md`
- `non-functional-requirements.md`
- `domain-glossary.md`
- `risk-open-questions.md`

Start from templates under:
- `init/skills/initialize-project-from-requirements/templates/`

### Verification (required)

Run:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js check-docs --docs-root docs/project
```

If this repo uses a strict gate, run:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js check-docs --docs-root docs/project --strict
```

Iterate with the user until Stage A passes.

## Stage B - Blueprint (write file)

### Output

- `docs/project/project-blueprint.json`

Start from:
- `init/skills/initialize-project-from-requirements/templates/project-blueprint.example.json`

### Verification (required)

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js validate   --blueprint docs/project/project-blueprint.json
```

### Pack suggestions (recommended)

Run:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js suggest-packs   --blueprint docs/project/project-blueprint.json   --repo-root .
```

- If recommended packs are missing, you SHOULD discuss with the user before changing `skills.packs`.
- Only use `--write` if the user approves adding recommended packs.

## Stage C - Scaffold + Skills (run commands)

### Dry-run scaffold first (required)

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js scaffold   --blueprint docs/project/project-blueprint.json   --repo-root .
```

### Apply (writes changes + sync wrappers)

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js apply   --blueprint docs/project/project-blueprint.json   --repo-root .   --providers codex,claude   --require-stage-a
```

This will:
- create missing scaffold directories (no overwrites),
- update `.ai/skills/_meta/sync-manifest.json` (flat manifest),
- run `node .ai/scripts/sync-skills.js` to regenerate wrappers.

### Optional: remove init kit after success

Only if the user asks to remove bootstrap artifacts:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js cleanup-init   --repo-root .   --apply   --i-understand
```

## Prompt template (use internally)

Goal:
- Initialize the project with verifiable 3-stage outputs.

Constraints (MUST / DON'T):
- MUST output Stage A docs under `docs/project/`.
- MUST output blueprint at `docs/project/project-blueprint.json`.
- MUST update skills via `.ai/skills/_meta/sync-manifest.json` and run `node .ai/scripts/sync-skills.js`.
- DON'T edit `.codex/skills/` or `.claude/skills/` directly.

Acceptance criteria:
- Stage A passes `check-docs` (strict if required).
- Stage B blueprint validates.
- Stage C wrappers regenerated and match selected packs.

