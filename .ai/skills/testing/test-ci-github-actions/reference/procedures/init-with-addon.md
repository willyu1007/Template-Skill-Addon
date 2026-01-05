# Procedure: Initialize GitHub Actions via ci-templates add-on

**Base (references):** `.ai/skills/testing/test-ci-github-actions/reference/`

## Goal
Initialize GitHub Actions CI using the project’s CI templates add-on (when available) so that:
- CI configuration is generated/managed consistently
- test suites can be enabled with minimal drift
- verification is scriptable (`cictl.js verify`)

## Inputs (collect before edits)
- Whether the repo already has `.github/workflows/`
- Whether `addons/ci-templates/payload/.ai/scripts/cictl.js` exists (default path)
- Target CI features to enable: `lint`, `test`, `build` (minimum: `test`)
- Which test suites are in scope (web/api/mobile/perf)

## Steps
1) **Select the cictl script path**
   - If `addons/ci-templates/payload/.ai/scripts/cictl.js` exists, set `<CICTL>` to that path.
   - Else, skip to Step 6 (manual path).

2) **Initialize CI**
   - Run:
     - `node <CICTL> init --repo-root .`

3) **Apply a CI template**
   - Run:
     - `node <CICTL> apply --template github-actions --repo-root .`

4) **Create workflows from add-on templates**
   - Copy and rename (pick one source path). Choose a single extension and be consistent:
     - `addons/ci-templates/payload/.github/workflows/ci.yaml.template` -> `.github/workflows/ci.yml` (or `.github/workflows/ci.yaml`)
     - `.github/workflows/ci.yaml.template` -> `.github/workflows/ci.yml` (or `.github/workflows/ci.yaml`)
   - Optional (if needed): also copy `security.yaml.template` and `release.yaml.template`.
   - Adjust commands, secrets, and gating for your repo.

5) **Verify configuration**
   - `node <CICTL> verify --repo-root .`
   - Inspect generated files under:
     - `.github/workflows/`

   Ensure the workflows call your repo’s canonical test commands (see “Test command contract” in SKILL.md).

6) **Manual fallback (no add-on present)**
   - Create `.github/workflows/ci.yml` based on:
     - `reference/templates/github-actions/ci.yml`
   - Ensure:
     - tests run via canonical commands
     - artifacts uploaded from `artifacts/`

## Outputs
- GitHub Actions workflows under `.github/workflows/`
- CI configuration verified (if add-on present)
- A clear next step to enable specific test jobs

## Required verification
- If using the add-on:
  - `node <CICTL> verify --repo-root .`
- Trigger a workflow run (PR or `workflow_dispatch`) and confirm:
  - jobs start successfully
  - artifacts upload works even on failure

## Boundaries
- Do not hand-edit generated workflows without also updating the add-on source/config; otherwise changes will be overwritten.
- Do not add secrets directly into workflow files.

## Troubleshooting

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| cictl.js not found | Add-on not installed | Check path or run add-on install |
| `cictl verify` fails | Config mismatch | Review error output, fix config |
| Workflow syntax error | YAML indentation or missing field | Use YAML linter, check GitHub docs |
| Jobs don't trigger | Wrong event triggers or paths | Verify `on:` section matches your needs |

### Common Issues

**1. Workflow file not recognized**
- Must be in `.github/workflows/` directory
- File extension must be `.yml` or `.yaml`
- Check file permissions

**2. Add-on overwrites manual changes**
- Store customizations in add-on config, not workflow directly
- Or fork the template for permanent changes

**3. cictl commands fail silently**
- Add `--verbose` flag if supported
- Check Node version compatibility
