# Agent guidance for the init kit

The repository includes an `init/` bootstrap kit for checkpointed project initialization.

**For detailed workflow**: See `init/_tools/skills/initialize-project-from-requirements/SKILL.md`

---

## Key principles

- Do not skip stages (A → B → C).
- Do not advance stages without explicit user approval.
- Do not hand-edit `init/_work/.init-state.json`; use pipeline commands.
- Do not create dev-docs task bundles during initialization.
- Keep `init/START-HERE.md` as the single human/LLM entry point:
  - Update after each user message and stage transition.
  - Land decisions into Stage A docs and/or blueprint.
  - Do not edit `init/INIT-BOARD.md` (generated-only).

---

## Command entry point

```bash
node init/_tools/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs <command> [options]
```

| Location | Purpose |
|----------|---------|
| `init/_tools/` | Shipped init tooling |
| `init/_work/` | Runtime artifacts |

---

## Quick reference

| Stage | Validate | Approve |
|-------|----------|---------|
| A | `check-docs --strict` | `approve --stage A` |
| B | `validate` | `approve --stage B` |
| C | `apply --providers both` | `approve --stage C` |

**Stage C checkpoint** (before approval):
1. **Skill retention**: `skill-retention --repo-root .` then `skill-retention --apply`
2. **Update root docs** (recommended): `update-root-docs` then `update-root-docs --apply`

**Post-init cleanup**:
```bash
# Archive + remove init/
node init/_tools/skills/initialize-project-from-requirements/scripts/init-pipeline.mjs cleanup-init \
  --repo-root . --apply --i-understand --archive
```

---

## Troubleshooting

**EPERM on Stage C**: Re-run `apply` in an elevated shell.

---

## Feature notes

For feature-specific behavior, see `init/_tools/feature-docs/`.

Key rule: `features.<id>: true` triggers materialization; `context.*`, `db.*`, etc. are configuration only.
