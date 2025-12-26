# Naming Conventions (directories / files / identifiers)

## 1. Purpose
The goals of these naming conventions are:
- **Scriptability**: scripts can locate files reliably with fewer branches.
- **Portability**: cross OS/IDE moves should require zero or minimal renaming.
- **Readability**: humans and LLMs can infer purpose and scope from names.

## 2. Global rules (MUST)
- Use **kebab-case** (lowercase + hyphens) by default: `skill-name`, `sync-skills`.
- Avoid spaces and special characters (except `.`-prefixed directories). Recommended charset: `[a-z0-9-._]`.
- Directory names express "scope/role"; file names express "type/content". Avoid non-maintainable buckets like `misc/` or `temp/`.

## 3. Directory layout (MUST)
### 3.1 SSOT (not at repo root)
- SSOT root is fixed: `.ai/`
- SSOT subdirectories are fixed:
  - `.ai/skills/` (workflows live here as skills)

### 3.2 Skill entry stubs
- Entry stub roots are fixed:
  - `.codex/skills/`
  - `.claude/skills/`

Notes:
- Stubs contain only `SKILL.md` pointers back to `.ai/skills/`
- Do not edit stub directories directly; regenerate with `.ai/scripts/sync-skills.js`

### 3.3 Other top-level directories (recommended)
- `docs/`: standards, design docs, ADRs, guides (use descriptive, readable titles; optional numeric prefixes)
- `scripts/`: script entrypoints (cross-platform can share the same base name with different suffixes, e.g. `sync-skills.ps1` / `sync-skills.sh`)
- `construction/` (or `init/`): bootstrap materials and `project-profile.yaml/json`

## 4. Skill / Workflow / Command naming
### 4.1 Skills
- Path: `.ai/skills/.../<skill-name>/SKILL.md` (taxonomy directories are allowed)
- `<skill-name>`: kebab-case; encode capability/domain/tool; avoid ambiguous names. Examples: `skill-creator`, `repo-init`, `doc-style-guide`.
- Supporting files: `reference.md`, `examples.md`, `scripts/`, `templates/` (use kebab-case or snake_case for filenames). Do not create a `resources/` subdirectory.

### 4.2 Workflows
- Workflows are stored as skills; name by intent/process: `refactor-planner`, `release-checklist`.
- Path: `.ai/skills/.../<workflow-name>/SKILL.md`

## 5. Versioning and changes (SHOULD)
- Prefer explicit version fields / change logs for SSOT content (exact fields are defined by the skill specs).
- If the directory structure changes, update all of:
  - `docs/naming-conventions.md`
  - `docs/documentation-guidelines.md`
  - path constants/mappings in `.ai/scripts/`
  - usage examples in `README.md`
