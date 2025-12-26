# Example - Quick start (AI-assisted)

1. Ask your LLM to follow `init/AGENTS.md`.
2. Review Stage A docs under `docs/project/`.
3. Validate Stage A docs:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js check-docs --docs-root docs/project
```

4. Review Stage B blueprint at `docs/project/project-blueprint.json` and validate:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js validate   --blueprint docs/project/project-blueprint.json
```

5. Dry-run scaffold:

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js scaffold   --blueprint docs/project/project-blueprint.json   --repo-root .
```

6. Apply Stage C (scaffold + manifest + wrapper sync):

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js apply   --blueprint docs/project/project-blueprint.json   --repo-root .   --providers codex,claude   --require-stage-a
```

7. Optional cleanup (remove init kit):

```bash
node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js cleanup-init   --repo-root .   --apply   --i-understand
```

