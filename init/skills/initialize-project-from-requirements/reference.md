# Reference: initialize-project-from-requirements

This reference describes the behavior of the init pipeline skill implementation (scripts + templates).

---

## Key conclusions

- Stage A quality is enforced by **structure + placeholders checks** (`check-docs`). It does not attempt deep semantic evaluation.
- Stage B blueprint is the **machine-readable SSOT** used for Stage C scaffolding and skill pack selection.
- Pack selection is explicit:
  - declared in `docs/project/project-blueprint.json` (`skills.packs`)
  - materialized into `.ai/skills/_meta/sync-manifest.json` (flat schema)
  - synced into provider wrappers by `node .ai/scripts/sync-skills.js`
- Stage transitions require explicit approval (`approve`), not manual state edits.
- In add-on repos, pack enabling must go through `.ai/scripts/skillsctl.js` (scheme A) when available.

---

## Stage A validation (`check-docs`)

Checks:
- required files exist under `docs/project/` (or `--docs-root`)
- required headings exist
- template placeholders (e.g. “TBD”, “<fill>”) are not left unresolved (warn or error depending on `--strict`)

Command:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js check-docs --repo-root . --docs-root docs/project --strict
```

---

## Stage B validation (`validate`)

Checks:
- blueprint JSON parses
- matches expected shape / schema (basic semantic sanity)
- optional: compute recommended packs from `capabilities`/`quality` and report deltas

Command:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js validate --repo-root . --blueprint docs/project/project-blueprint.json
```

---

## Stage C apply (`apply`)

`apply` performs:
1. validate blueprint
2. optional docs check (when `--require-stage-a`)
3. scaffold directories/files (idempotent; “write-if-missing” for docs)
4. generate configs via `scripts/scaffold-configs.js` (SSOT)
5. optional add-on setup (context awareness)
6. enable packs (skillsctl when present; else manifest includePrefixes)
7. sync wrappers via `.ai/scripts/sync-skills.js`

---

## Add-on: context awareness

Enable via blueprint:
- `addons.contextAwareness: true` or `context.enabled: true`

Implications:
- context awareness implies enabling the `context-core` pack
- add-on payload is expected at `addons/context-awareness/payload/` (default)

See:
- `init/ADDONS_DIRECTORY.md`
- `init/ADDON_CONTEXT_AWARENESS.md`

