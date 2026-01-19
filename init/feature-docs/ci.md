# CI templates (repo-level)

This repo keeps a small controller to apply and validate CI templates without hand-copying files.

Notes:

- This is **not** a blueprint feature toggle.
- Use the CI-related skills to design the workflow; use `cictl.js` to materialize templates into the repo.

## Commands

```bash
# Apply a CI template
node .ai/scripts/cictl.js init --provider github --repo-root .
node .ai/scripts/cictl.js init --provider gitlab --repo-root .

# Validate the installed template/config (best effort)
node .ai/scripts/cictl.js verify --repo-root .
```

## Acceptance

- `node .ai/scripts/cictl.js --help` documents `init` and `verify`
- The template files are created in the expected CI locations for the provider

