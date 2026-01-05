# CI Templates Add-on

## Conclusions (read first)

- Provides CI/CD configuration templates for GitHub Actions and GitLab CI
- Feature-based configuration generates appropriate workflows
- Configuration-driven approach ensures consistency

## How to enable

In `project-blueprint.json`:

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
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.cjs apply --blueprint init/project-blueprint.json
```

## What gets installed

- `ci/` - CI configuration root
  - `ci/config.json` - Feature toggles
  - `ci/AGENTS.md` - AI guidance
- `.github/workflows/*.template` - GitHub Actions templates
- `.gitlab-ci/*.template` - GitLab CI templates
- `.ai/scripts/cictl.js` - CI management

## Commands

```bash
# Initialize
node .ai/scripts/cictl.js init --platform github-actions

# Enable features
node .ai/scripts/cictl.js enable-feature lint
node .ai/scripts/cictl.js enable-feature test

# Generate workflows
node .ai/scripts/cictl.js generate

# Verify
node .ai/scripts/cictl.js verify
```

## See also

- `addons/ci-templates/ADDON.md` - Full documentation

