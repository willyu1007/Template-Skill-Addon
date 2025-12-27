# CI Templates Add-on

## Purpose

This add-on provides **CI/CD configuration templates** and management tools for common platforms.

## Key Concepts

### Configuration-Driven

Instead of manually editing workflow files, you:

1. Configure features in `ci/config.json`
2. Generate workflows using `cictl generate`
3. Commit the generated files

This ensures consistency and makes CI changes trackable.

### Feature System

Features are modular CI capabilities:

| Feature | Description |
|---------|-------------|
| `lint` | Code linting step |
| `test` | Test execution |
| `build` | Build/compile step |
| `security` | Security scanning |
| `release` | Release automation |
| `deploy` | Deployment triggers |

### Platform Support

| Platform | Status |
|----------|--------|
| GitHub Actions | Full support |
| GitLab CI | Basic support |

## Quick Start

```bash
# Initialize CI
node .ai/scripts/cictl.js init --platform github-actions

# Enable features
node .ai/scripts/cictl.js enable-feature lint
node .ai/scripts/cictl.js enable-feature test
node .ai/scripts/cictl.js enable-feature build

# Generate workflows
node .ai/scripts/cictl.js generate
```

## AI/LLM Usage

When working with CI, AI should:

1. **Check** current status: `cictl status`
2. **Enable** needed features: `cictl enable-feature <name>`
3. **Generate** workflows: `cictl generate`
4. **Verify** configuration: `cictl verify`

Never edit workflow files directly - use the configuration system.

