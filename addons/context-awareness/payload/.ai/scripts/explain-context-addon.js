#!/usr/bin/env node

/**
 * explain-context-addon.js
 *
 * Prints the intent and mechanics of the “Context Awareness” add-on.
 * This is a human+LLM friendly, executable explanation (no repo mutation).
 */

const lines = [
  'Context Awareness Add-on (Intent + Implementation)',
  '',
  'Intent',
  '- Provide a stable, curated context layer so an LLM can work with reliable project facts.',
  '  - APIs: OpenAPI contract(s)',
  '  - DB schema mapping: normalized JSON representation',
  '  - Business processes: BPMN 2.0 files',
  '- Avoid “repo scanning” as a context strategy. Instead, use explicit, versioned artifacts.',
  '- Enforce script-driven updates so context stays verifiable and CI-friendly.',
  '',
  'What gets installed',
  '- docs/context/                 (stable context contract + registry)',
  '- .ai/scripts/contextctl.js     (register/touch/verify context artifacts)',
  '- .ai/scripts/projectctl.js     (project stage/config SSOT; non-secret only)',
  '- .ai/scripts/skillsctl.js      (pack switching; wrapper sync via sync-skills.js)',
  '- .ai/skills/scaffold/**        (optional skills that teach these workflows)',
  '',
  'Key mechanics',
  '1) Stable entry point for context:',
  '   - Read: docs/context/INDEX.md',
  '   - Index: docs/context/registry.json',
  '2) Registry verification:',
  '   - Each artifact has a sha256 checksum recorded in registry.json.',
  '   - After editing an artifact, run: node .ai/scripts/contextctl.js touch',
  '   - CI can enforce: node .ai/scripts/contextctl.js verify --strict',
  '3) “LLM must use scripts” enforcement:',
  '   - Policy: add docs/addons/context-awareness/AGENTS_SNIPPET.md to your AGENTS.md',
  '   - Enforcement: CI runs contextctl verify --strict (fails if edits bypass touch).',
  '4) Skills pack switching:',
  '   - Packs live under .ai/skills/_meta/packs/*.json',
  '   - Enable/disable via skillsctl; sync wrappers via sync-skills.js.',
  '',
  'Quickstart',
  '- Initialize context layer (idempotent):',
  '  node .ai/scripts/contextctl.js init',
  '- Verify consistency:',
  '  node .ai/scripts/contextctl.js verify --strict',
  '- (Optional) Enable scaffold/context skills and sync wrappers:',
  '  node .ai/scripts/skillsctl.js enable-pack context-core --providers both',
  '',
  'Recommended CI commands',
  '- node .ai/scripts/contextctl.js verify --strict',
  '- node .ai/scripts/projectctl.js verify',
  '',
  'Where to read more',
  '- docs/addons/context-awareness/README.md',
  '- docs/context/INDEX.md',
];

console.log(lines.join('\n'));
