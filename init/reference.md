# Reference: robust init pipeline

This document is the end-to-end reference for the `init/` bootstrap kit.

---

## Stage model

### Stage A – Requirements docs
- Output location: `docs/project/`
- Validation command: `check-docs`
- Approval command: `approve --stage A`

### Stage B – Project blueprint
- Output location: `docs/project/project-blueprint.json`
- Validation command: `validate`
- Approval command: `approve --stage B`

### Stage C – Apply scaffold + configs + skills
- Creates scaffold folders/files (idempotent; “write-if-missing” for docs)
- Generates config files via **SSOT** script: `scripts/scaffold-configs.js`
- Enables skill packs:
  - **Add-on / scheme A**: if `.ai/scripts/skillsctl.js` exists, packs are enabled via skillsctl
  - Fallback (basic repo): additive update of `.ai/skills/_meta/sync-manifest.json` includePrefixes
- Syncs provider wrappers via `.ai/scripts/sync-skills.js`
- Approval command: `approve --stage C`

State file: `init/.init-state.json`

---

## Commands

All commands are run from repo root:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js <command> [options]
```

### status
Show current progress:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js status --repo-root .
```

### advance
Print the next checkpoint actions for the current stage (no state writes):

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js advance --repo-root .
```

### approve
Record explicit approval and advance the stage:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js approve --stage A --repo-root . --note "approved by <name>"
```

### apply
Run Stage C apply:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js apply \
  --repo-root . \
  --blueprint docs/project/project-blueprint.json \
  --providers both \
  --addons-root addons
```

---

## Add-on: context awareness

Enable in blueprint using either:
- `addons.contextAwareness: true`
- `context.enabled: true`

Optional:
- `context.mode: "contract" | "snapshot"`

Expected payload location:
- `addons/context-awareness/payload/` (default)

`apply` will install missing payload files (copy-if-missing), then run:
- `node .ai/scripts/contextctl.js init --repo-root <repo>`
- `node .ai/scripts/projectctl.js init --repo-root <repo>` (if present)
- `node .ai/scripts/projectctl.js set-context-mode <mode> --repo-root <repo>` (if present)

See `ADDON_CONTEXT_AWARENESS.md` for the full guide.

---

## DevOps scaffold

If the blueprint indicates CI/DevOps needs, `scaffold` / `apply` will create an `ops/` convention scaffold, aligned with `devops_extension_guide.md` chapters 5–7.

Typical structure:
- `ops/packaging/{services,jobs,apps,scripts,workdocs}/`
- `ops/deploy/{http_services,workloads,clients,scripts,workdocs}/`

---

## Cleanup policy

`cleanup-init` is opt-in and guarded. It will refuse to apply without `--i-understand`.

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js cleanup-init --repo-root . --apply --i-understand
```

