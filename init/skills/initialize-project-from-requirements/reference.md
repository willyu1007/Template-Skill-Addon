# Reference - Initialize Project From Requirements

## Conclusions (read first)

- Stage A quality is enforced by **structure + placeholders** checks (`check-docs`). It does not attempt deep semantic evaluation.
- Stage B (blueprint) is the **only machine-readable SSOT** used for Stage C scaffolding and skill pack selection.
- Pack selection MUST be explicit:
  - declared in `docs/project/project-blueprint.json` (`skills.packs`)
  - materialized into `.ai/skills/_meta/sync-manifest.json` (flat manifest)
  - synced into provider wrappers by `node .ai/scripts/sync-skills.js`
- This init kit is intentionally **bootstrap-only**. If you remove `init/`, you must keep:
  - `docs/project/` artifacts, and
  - `.ai/skills/_meta/sync-manifest.json`

## Add-on hook (addon template)

If your blueprint sets:

```json
{
  "context": { "enabled": true }
}
```

then `apply` will install the context-awareness payload from `addons/context-awareness/payload/` and enable the `context-core` pack before syncing wrappers. This keeps the base paths clean unless explicitly requested.


---

## 1. Stage A validation (`check-docs`)

### 1.1 What `check-docs` validates (MUST)

Given `--docs-root <path>` (default: `<repo-root>/docs/project`), it checks:

- All required files exist:
  - `requirements.md`
  - `non-functional-requirements.md`
  - `domain-glossary.md`
  - `risk-open-questions.md`
- Each file contains minimum required headings (guardrails for completeness).
- No template placeholders remain (for example `<name>`, `- ...`, `: ...`).

### 1.2 What `check-docs` does NOT validate

- Whether requirements are “correct” or “complete” for the business.
- Whether acceptance criteria cover all edge cases.
- Whether NFR targets are realistic.

These are human/LLM review tasks. The goal of `check-docs` is to prevent obvious incompleteness and template leakage.

### 1.3 Strict mode

- `check-docs` always returns **errors** for missing files/sections/placeholders.
- `--strict` additionally treats **warnings** (TBD/TODO markers) as failures.

Use strict mode as a gate when you want a strong “ready-to-blueprint” signal.

---

## 2. Requirements → Blueprint mapping guide

This mapping exists to prevent “design decisions living only in chat”.

### 2.1 Mapping principles (MUST)

- Blueprint encodes **decisions needed for scaffolding and pack selection only**.
- Do not encode implementation details (libraries, code structure) unless they are hard constraints.
- If the user cannot decide, do NOT guess:
  - keep the blueprint minimal,
  - and record the decision as TBD in `risk-open-questions.md`.

### 2.2 Mapping table (recommended)

- `docs/project/requirements.md`
  - project name/one-line description → `project.name`, `project.description`
  - users/roles → `project.primaryUsers`
  - in-scope MUST / out-of-scope OUT → stays in docs (not in blueprint)
  - journeys → stays in docs (not in blueprint)
  - high-level entities / integrations → informs `capabilities.*` (only at capability level)

- `docs/project/non-functional-requirements.md`
  - CI requirement → `quality.ci.enabled`
  - testing requirement → `quality.testing.enabled` (+ optional levels)
  - containerization expectation → `quality.devops.containerize`
  - availability/security constraints → stay in docs unless they force a capability decision

- `docs/project/domain-glossary.md`
  - domain entities → informs `capabilities.database.enabled` and data needs (do not encode schemas here)

- `docs/project/risk-open-questions.md`
  - undecided tech constraints (DB kind, API auth model, hosting constraints) → blueprint may remain TBD; record decisions here

### 2.3 Blueprint fields that MUST be explicit for Stage C

At minimum:

- `repo.layout`: `single` or `monorepo`
- `repo.language`: a stable language label
- `capabilities.frontend.enabled` and/or `capabilities.backend.enabled`
- `skills.packs`: include at least `workflows`

---

## 3. Capabilities → Packs (suggestions + warnings)

### 3.1 Why packs exist

Packs are a discovery/filter mechanism. They allow you to enable a subset of skills by prefix, without cross-linking docs.

### 3.2 Recommended mapping (current init kit)

This init script uses the following conceptual mapping:

| Capability / intent | Suggested pack |
|---|---|
| always | `workflows` |
| backend enabled | `backend` |
| frontend enabled | `frontend` |
| database enabled | `data` |
| BPMN enabled | `diagrams` |
| CI / containerize | `ops` |

The script emits warnings when:

- the blueprint is missing recommended packs, or
- a recommended pack is not installed under `.ai/skills/` (missing directory).

### 3.3 Auto-suggest vs auto-enable

- Default behavior: **warn + suggest** only.
- Opt-in behavior: `suggest-packs --write` will **add** missing recommended packs to `skills.packs` (it will not remove any extras).

---

## 4. Manifest update rules

Stage C updates `.ai/skills/_meta/sync-manifest.json`:

- It only mutates `collections.current`:
  - `includePrefixes` computed from `skills.packs`
  - optional `excludePrefixes` and `excludeSkillNames` if present in the blueprint

After manifest update, wrappers must be regenerated by:

```bash
node .ai/scripts/sync-skills.js --scope current --providers both
```

---

## 5. Removing the init kit (`cleanup-init`)

### 5.1 Safety rules

- `cleanup-init` refuses to run unless `init/.init-kit` exists (marker).
- Deletion is opt-in:
  - `apply --cleanup-init --i-understand`, or
  - `cleanup-init --apply --i-understand`

### 5.2 Cross-platform notes

On some platforms, deleting the currently running script directory can fail due to file locks. The script first renames `init/` to `.init-trash-<timestamp>` and then deletes. If deletion fails, the renamed directory is left for manual deletion.

