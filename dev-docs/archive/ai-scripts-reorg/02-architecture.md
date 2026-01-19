# Architecture Notes

## Ownership boundaries

- Repo-level controllers stay in `.ai/scripts/` (cross-feature / init / verification / governance).
- Feature-local tooling lives under that feature skill at `.ai/skills/features/**/scripts/`.
- Skill selection metadata and pack state live under `.ai/skills/_meta/` along with its controller.

## Compatibility strategy

This change is intentionally breaking for old command paths. Mitigation is “update all references in one change set” and keep error messages actionable when a script can’t be found.

