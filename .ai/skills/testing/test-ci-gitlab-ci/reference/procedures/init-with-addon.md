# Procedure: Initialize GitLab CI via ci-templates add-on

**Base (references):** `.ai/skills/testing/test-ci-gitlab-ci/reference/`

## Goal
Initialize GitLab CI using the project’s CI templates add-on (when available) so that:
- CI configuration is generated/managed consistently
- test suites can be enabled with minimal drift
- verification is scriptable (`cictl.js verify`)

## Inputs (collect before edits)
- Whether the repo already has `.gitlab-ci.yml`
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
     - `node <CICTL> apply --template gitlab-ci --repo-root .`

4) **Create CI config from add-on templates**
   - Copy and rename (pick one source path):
     - `addons/ci-templates/payload/.gitlab-ci/gitlab-ci.yaml.template` -> `.gitlab-ci.yml`
     - `.gitlab-ci/gitlab-ci.yaml.template` -> `.gitlab-ci.yml`
   - Adjust jobs, variables, and runner settings for your repo.

5) **Verify configuration**
   - `node <CICTL> verify --repo-root .`
   - Ensure `.gitlab-ci.yml` includes the generated templates and calls canonical test commands.

6) **Manual fallback (no add-on present)**
   - Create `.gitlab-ci.yml` based on:
     - `reference/templates/gitlab-ci/.gitlab-ci.yml`
   - Ensure:
     - jobs run canonical commands
     - artifacts retained from `artifacts/`

## Outputs
- GitLab CI configuration (`.gitlab-ci.yml` and/or `.gitlab-ci/`)
- CI configuration verified (if add-on present)

## Required verification
- If using the add-on:
  - `node <CICTL> verify --repo-root .`
- Trigger a pipeline (MR or manual) and confirm:
  - jobs start successfully
  - artifacts are retained on failure

## Boundaries
- Do not hand-edit generated templates without updating the add-on source/config; changes may be overwritten.
- Do not commit secrets into CI YAML.

## Troubleshooting

| Symptom | Possible Cause | Solution |
|---------|----------------|----------|
| cictl.js not found | Add-on not installed | Verify path or install add-on |
| `cictl verify` fails | Config mismatch or syntax error | Review output, fix .gitlab-ci.yml |
| Pipeline syntax error | YAML indentation or invalid keywords | Use GitLab CI linter in Settings > CI/CD |
| Jobs don't run | Wrong rules/only/except conditions | Check job rules match your trigger event |

### Common Issues

**1. Include file not found**
- Check relative paths in `include:` statements
- Ensure referenced files are committed to repo
- For remote includes, verify URL is accessible

**2. Add-on overwrites customizations**
- Store changes in add-on config, not raw YAML
- Use `extends:` to layer customizations

**3. Template variables not substituted**
- GitLab uses `$VARIABLE` syntax (not `{{}}`)
- Check variable is defined in CI/CD settings
