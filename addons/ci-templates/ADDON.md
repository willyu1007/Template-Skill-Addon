# CI Templates Add-on (Optional)

## Conclusions (read first)

- This add-on provides **CI/CD configuration templates** for common platforms (GitHub Actions, GitLab CI).
- Templates are customizable via `cictl.js` based on project requirements.
- CI configuration is version-controlled and managed through scripts.

## What this add-on writes (blast radius)

New files/directories (created if missing):

- `.github/workflows/` (GitHub Actions templates)
- `.gitlab-ci/` (GitLab CI templates)
- `ci/` (CI configuration and workdocs)
  - `ci/AGENTS.md` (LLM guidance)
  - `ci/config.json` (CI feature toggles)
  - `ci/workdocs/` (CI planning and notes)
- `.ai/scripts/cictl.js` (CI configuration management)
- `docs/addons/ci-templates/` (add-on documentation)

## Install

### Option A: Via init-pipeline (recommended)

Enable in your `project-blueprint.json`:

```json
{
  "addons": {
    "ciTemplates": true
  },
  "ci": {
    "enabled": true,
    "platform": "github-actions",
    "features": ["lint", "test", "build"]
  }
}
```

Then run:
```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs apply --blueprint docs/project/project-blueprint.json
```

### Option B: Install manually

1. Copy payload contents into the repository root.
2. Initialize CI configuration:
   ```bash
   node .ai/scripts/cictl.js init --platform github-actions
   ```

## Usage

### Initialize CI

```bash
# Initialize with GitHub Actions
node .ai/scripts/cictl.js init --platform github-actions

# Initialize with GitLab CI
node .ai/scripts/cictl.js init --platform gitlab-ci
```

### Enable Features

```bash
# Enable linting
node .ai/scripts/cictl.js enable-feature lint

# Enable testing
node .ai/scripts/cictl.js enable-feature test

# Enable security scanning
node .ai/scripts/cictl.js enable-feature security

# List enabled features
node .ai/scripts/cictl.js list-features
```

### Generate Workflows

```bash
# Generate workflow files from configuration
node .ai/scripts/cictl.js generate

# Verify CI configuration
node .ai/scripts/cictl.js verify
```

## Supported Platforms

| Platform | Template Location | Notes |
|----------|------------------|-------|
| GitHub Actions | `.github/workflows/` | Primary support |
| GitLab CI | `.gitlab-ci/` | Basic templates |

## Available Features

| Feature | Description |
|---------|-------------|
| `lint` | Code linting (ESLint, etc.) |
| `test` | Test execution |
| `build` | Build/compile step |
| `security` | Security scanning (optional) |
| `release` | Release automation |
| `deploy` | Deployment triggers |

## Verification

```bash
# Verify CI configuration
node .ai/scripts/cictl.js verify

# List current configuration
node .ai/scripts/cictl.js status
```

## Rollback / Uninstall

Delete these paths:

- `.github/workflows/ci.yaml` (if generated)
- `.gitlab-ci/` (if generated)
- `ci/`
- `.ai/scripts/cictl.js`
- `docs/addons/ci-templates/`

