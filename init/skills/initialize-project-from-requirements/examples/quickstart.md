# Quickstart (example)

Run these commands from repo root.

---

## 0) Initialize state

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js start --repo-root .
```

---

## 1) Stage A: validate docs → approve

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js check-docs \
  --repo-root . \
  --docs-root docs/project \
  --strict
```

After the user explicitly approves Stage A:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js approve --stage A --repo-root .
```

---

## 2) Stage B: validate blueprint → approve

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js validate \
  --repo-root . \
  --blueprint docs/project/project-blueprint.json
```

Optional: show recommended packs:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js suggest-packs \
  --repo-root . \
  --blueprint docs/project/project-blueprint.json
```

After the user explicitly approves Stage B:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js approve --stage B --repo-root .
```

---

## 3) Stage C: apply → approve

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js apply \
  --repo-root . \
  --blueprint docs/project/project-blueprint.json \
  --providers both
```

After the user explicitly approves Stage C:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js approve --stage C --repo-root .
```

---

## 4) Optional cleanup

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js cleanup-init \
  --repo-root . \
  --apply \
  --i-understand
```

