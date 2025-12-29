# AI Assistant Instructions

This is an **AI-Friendly Repository Template** - a starter kit for creating LLM-optimized codebases with optional add-ons.

## First Time?

**Read `init/AGENTS.md` for initialization instructions.**

## Project Type

Template repository. Users clone this to start new AI-friendly projects.

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `init/` | **Start here** - Initialization instructions and output |
| `addons/` | Optional add-on payloads (installed on-demand) |
| `.ai/skills/` | Single Source of Truth for skills (including workflows) |
| `.ai/scripts/` | Sync scripts and control scripts (Node.js) |
| `.codex/` | Codex skill entry stubs |
| `.claude/` | Claude skill entry stubs |
| `dev/` | Working documentation for complex tasks |

## Available Add-ons

| Add-on | Purpose | Control Script |
|--------|---------|----------------|
| `context-awareness` | API/DB/BPMN contracts for LLM context | `contextctl.js` |
| `db-mirror` | Database schema mirroring | `dbctl.js` |
| `ci-templates` | CI/CD configuration templates | `cictl.js` |
| `packaging` | Container/artifact packaging | `packctl.js` |
| `deployment` | Multi-environment deployment | `deployctl.js` |
| `release` | Version and changelog management | `releasectl.js` |
| `observability` | Metrics/logs/traces contracts | `obsctl.js` |

Add-ons are enabled via `project-blueprint.json` and installed during initialization.

See `init/ADDONS_DIRECTORY.md` for conventions.

## Common Tasks

### Add New Skill

1. Create `.ai/skills/[skill-name]/SKILL.md`
2. Add supporting files alongside `SKILL.md` (for example `reference.md`, `examples.md`, `scripts/`, `templates/`)
3. Run `node .ai/scripts/sync-skills.cjs`

### Add New Workflow (as a skill)

1. Create `.ai/skills/[workflow-name]/SKILL.md`
2. Include YAML frontmatter with `name` and `description`
3. Run `node .ai/scripts/sync-skills.cjs`

### Initialize a New Project

1. Edit `docs/project/project-blueprint.json`
2. Enable desired add-ons in `addons` section (only `addons.*` toggles trigger installation)
3. Run `node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs apply --blueprint docs/project/project-blueprint.json`

### Cleanup After Initialization

After initialization is complete, clean up the bootstrap kit:

```bash
# Recommended: remove init/ and prune unused add-on sources
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs cleanup-init \
  --repo-root . --apply --i-understand \
  --cleanup-addons --blueprint docs/project/project-blueprint.json
```

This removes `init/` and deletes unused add-on source directories under `addons/`.

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
- For add-ons: edit `addons/*/ADDON.md` (source), use control scripts for runtime management
