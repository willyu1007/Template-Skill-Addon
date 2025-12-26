# Skill Authoring Guidelines (This Repository)

## Purpose

This document defines the skill authoring standard for this repository by combining:

- OpenAI Codex Agent Skills conventions (`.codex/skills`, `SKILL.md`, progressive disclosure)
- Claude Code skills conventions (`.claude/skills`, `SKILL.md`, optional `allowed-tools`)
- This repo's SSOT and syncing rules (`.ai/skills` is the only source of truth)

If a platform requirement conflicts with this repo's rules, follow this repo's rules.

## Scope

Applies to all skills in:

- `.ai/skills/**`

Does not apply to generated stubs in:

- `.codex/skills/**`
- `.claude/skills/**`

## Source of truth (SSOT)

- You MUST edit skills only in `.ai/skills/`.
- You MUST NOT edit `.codex/skills/` or `.claude/skills/` directly.
- After adding or updating a skill, you MUST sync stubs:
  - Full sync (default): `node .ai/scripts/sync-skills.js`
  - Incremental (one skill): `node .ai/scripts/sync-skills.js --scope specific --skills <skill-name> --mode update`

## Naming and layout

### Naming (MUST)

- Skill leaf directory name MUST be kebab-case: `.ai/skills/.../<skill-name>/`
- The skill `name` in `SKILL.md` MUST match the **leaf** directory name.
- Use a capability-oriented name (verb + domain/tool) and avoid ambiguous names.

### Layout (MUST)

Required:

- `.ai/skills/.../<skill-name>/SKILL.md` (taxonomy directories are allowed)

Optional supporting files (recommended for progressive disclosure):

- `<skill-dir>/reference.md`
- `<skill-dir>/examples.md`
- `<skill-dir>/scripts/`
- `<skill-dir>/templates/`

Forbidden:

- You MUST NOT create `.ai/skills/<skill-name>/resources/`

## SKILL.md format

### Frontmatter (MUST)

`SKILL.md` MUST begin with YAML frontmatter:

```yaml
---
name: skill-name
description: One sentence that helps the agent choose this skill.
---
```

Rules:

- `name` MUST be stable (changing it breaks discovery and references).
- `description` MUST be high-signal: include trigger phrases and when-to-use guidance.
- Keep frontmatter compatible across platforms: use only widely supported keys unless you have a strong reason.

### Optional frontmatter keys (SHOULD be used sparingly)

- Codex supports an optional `metadata` section (for example `metadata.short-description`).
- Claude Code supports `allowed-tools` to restrict tool access for that skill.

If you use platform-specific keys (like `allowed-tools`), you MUST ensure the skill remains correct even if another platform ignores that key.

### Body structure (SHOULD)

Write the Markdown body to be executable and token-efficient. Recommended sections:

1. `# <Human Readable Title>`
2. `## Purpose` (1-2 sentences)
3. `## When to use` (bullet triggers; include negative triggers if important)
4. `## Inputs` (what the user must provide; file paths; required context)
5. `## Outputs` (expected artifacts, file changes, or reports)
6. `## Steps` (numbered, imperative, minimal ambiguity)
7. `## Boundaries` (MUST NOT / SHOULD NOT; safety constraints)
8. `## References` (relative links to `reference.md`, `examples.md`, etc.)

## Progressive disclosure and size limits

- `SKILL.md` MUST be <= 500 lines.
- Put deep explanations in `reference.md` and keep `SKILL.md` focused on:
  - triggers
  - inputs/outputs
  - step-by-step procedure
  - constraints and verification

## Examples and scripts

- Examples SHOULD be small and copy-pasteable.
- If a skill requires executable helpers, place them under `scripts/` and document:
  - prerequisites (runtime, dependencies)
  - exact commands to run
  - expected output

## Language and encoding

- Skill docs in `.ai/skills/` SHOULD be written in English for consistency and portability.
- Use plain ASCII punctuation where possible to avoid encoding/display issues across environments.

## Verification checklist

Before finishing a skill change:

- `SKILL.md` has valid YAML frontmatter with `name` and `description`.
- The directory name matches `name`.
- No `resources/` directory exists under the skill.
- `SKILL.md` is <= 500 lines and uses progressive disclosure.
- `node .ai/scripts/sync-skills.js` has been run and stubs are up to date.

## Syncing notes (this repository)

- Stub generation discovers skills by recursively finding `SKILL.md` under `.ai/skills/`.
- Provider stubs are flattened by skill `name` under `.codex/skills/<skill-name>/` and `.claude/skills/<skill-name>/`.
- The "current collection" is configured via `.ai/skills/_meta/sync-manifest.json` and synced with:
  - `node .ai/scripts/sync-skills.js --scope current --providers both`
