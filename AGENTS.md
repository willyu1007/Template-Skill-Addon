# AI Assistant Instructions

This is an **AI-Friendly Repository Template** - a starter kit for creating LLM-optimized codebases.

## First Time?

**Read `init/AGENTS.md` for initialization instructions.**

## Project Type

Template repository. Users clone this to start new AI-friendly projects.

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `init/` | **Start here** - Initialization instructions and output |
| `.ai/skills/` | Single Source of Truth for skills (including workflows) |
| `.ai/scripts/` | Sync scripts (Node.js) |
| `.codex/` | Codex skill entry stubs |
| `.claude/` | Claude skill entry stubs |
| `dev/` | Working documentation for complex tasks |

## Common Tasks

### Add New Skill

1. Create `.ai/skills/[skill-name]/SKILL.md`
2. Add supporting files alongside `SKILL.md` (for example `reference.md`, `examples.md`, `scripts/`, `templates/`)
3. Run `node .ai/scripts/sync-skills.js`

### Add New Workflow (as a skill)

1. Create `.ai/skills/[workflow-name]/SKILL.md`
2. Include YAML frontmatter with `name` and `description`
3. Run `node .ai/scripts/sync-skills.js`

## Available Workflows

| Workflow | Description |
|----------|-------------|
| `auth-route-debugging` | Diagnose 401/403 errors and JWT issues |
| `auth-route-testing` | End-to-end API route verification |
| `frontend-error-resolution` | Debug React components and styling |
| `typescript-error-resolution` | Fix `tsc` compilation errors |
| `code-architecture-review` | Review code for pattern consistency |
| `code-refactoring` | Safely reorganize code |
| `documentation-maintenance` | Keep documentation accurate |
| `technical-research` | Deep-dive into complex problems |

Workflow skills live under `.ai/skills/`

## Rules

- Always edit `.ai/skills/` (SSOT), never edit `.codex/` or `.claude/` directly
- Keep SKILL.md files under 500 lines
- Use supporting files (`reference.md`, `examples.md`, `scripts/`, `templates/`) for detailed reference content
- Do not create a `resources/` subdirectory inside skills
- Follow progressive disclosure pattern
