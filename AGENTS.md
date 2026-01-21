# AI Assistant Instructions

This is an **AI-Friendly Repository Template** - a starter kit for creating LLM-optimized codebases with optional features (no `addons/` directory).

## Project Type

Template repository. Users clone this to start new AI-friendly projects.

## Key Directories

| Directory | Purpose | Entry Point |
|-----------|---------|-------------|
| `init/` | Project initialization | `init/AGENTS.md` |
| `init/feature-docs/` | Optional feature documentation | `init/feature-docs/README.md` |
| `.ai/` | Skills, scripts, LLM governance | `.ai/AGENTS.md` |
| `dev-docs/` | Complex task documentation | `dev-docs/AGENTS.md` |
| `.codex/` | Codex skill stubs (generated) | - |
| `.claude/` | Claude skill stubs (generated) | - |

## Routing

| Task Type | Entry Point |
|-----------|-------------|
| **First time / Project setup** | `init/AGENTS.md` |
| **Skill authoring / maintenance** | `.ai/AGENTS.md` |
| **LLM engineering** | `.ai/llm-config/AGENTS.md` |
| **Complex task documentation** | `dev-docs/AGENTS.md` |

## Global Rules

- Follow progressive disclosure: read only the file you are routed to
- On context reset for ongoing work, read `dev-docs/active/<task-name>/00-overview.md` first

## Coding Standards (RECOMMEND)

- **ESM (.mjs)**: All scripts in this repository use ES Modules with `.mjs` extension. Use `import`/`export` syntax, not `require()`.

## Coding Workflow (MUST)

- Before modifying code/config for a non-trivial task, apply the Decision Gate in `dev-docs/AGENTS.md` and create/update the dev-docs task bundle as required.
- If the user asks for planning artifacts (plan/roadmap/milestones/implementation plan) before coding, use `plan-maker` first, then ask for confirmation to proceed with implementation.
- If the task needs context preservation (multi-session, handoff) or qualifies as complex, follow `dev-docs/AGENTS.md` and use dev-docs workflows (`create-dev-docs-plan`, `update-dev-docs-for-handoff`).


<!-- DB-SSOT:START -->
## Database SSOT and schema synchronization

The section is **managed by the init pipeline**. After project initialization it will contain:

- The selected DB schema SSOT mode (`none` / `repo-prisma` / `database`)
- The correct routing for DB schema change requests
- The canonical LLM-readable DB schema contract location

If the block is still in its placeholder form, run the init Stage C apply step.
<!-- DB-SSOT:END -->
