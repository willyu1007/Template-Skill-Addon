#!/usr/bin/env node

/**
 * projectctl.js
 *
 * Purpose:
 * - Maintain `.ai/project/state.json` as a small, non-secret SSOT for project stage/config.
 * - Provide schema validation without external dependencies.
 *
 * Notes:
 * - Do NOT store secrets in this file. Store only references (e.g., env var names).
 */

const fs = require('fs');
const path = require('path');

const repoRootDefault = path.resolve(__dirname, '..', '..');
const stateRel = path.join('.ai', 'project', 'state.json');
const schemaRel = path.join('.ai', 'project', 'state.schema.json');

const colors = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

const allowedStages = new Set(['prototype', 'mvp', 'production', 'maintenance', 'archived']);
const allowedContextModes = new Set(['contract', 'snapshot']);

function printHelp() {
  const cmd = 'node .ai/scripts/projectctl.js';
  console.log([
    'Manage `.ai/project/state.json` (non-secret project state).',
    '',
    `Usage: ${cmd} <command> [options]`,
    '',
    'Commands:',
    '  init                  Create state.json from defaults if missing (idempotent)',
    '  show                  Print current state (json)',
    '  set-stage <stage>     Set stage (prototype|mvp|production|maintenance|archived)',
    '  set-context-mode <m>  Set context mode (contract|snapshot)',
    '  verify                Validate state file (schema-lite; no deps)',
    '',
    'Options:',
    '  --repo-root <path>    Repo root (default: inferred from script location)',
    '  --dry-run             Print actions without writing',
    '  -h, --help            Show help',
    '',
  ].join('\n'));
}

function parseArgs(argv) {
  const out = {
    repoRoot: repoRootDefault,
    dryRun: false,
    help: false,
    command: null,
    positional: [],
  };

  const args = argv.slice(2);
  if (args[0] === '-h' || args[0] === '--help') {
    out.help = true;
    out.command = null;
    return out;
  }

  out.command = args[0] || null;

  for (let i = 1; i < args.length; i += 1) {
    const a = args[i];
    if (a === '-h' || a === '--help') {
      out.help = true;
      continue;
    }
    if (a === '--repo-root') {
      out.repoRoot = path.resolve(args[i + 1] || '.');
      i += 1;
      continue;
    }
    if (a === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    out.positional.push(a);
  }

  return out;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

function defaultState() {
  return {
    version: 1,
    stage: 'prototype',
    context: {
      enabled: true,
      mode: 'contract',
      notes: 'contract = docs/context artifacts are authoritative; snapshot = artifacts are generated from code/tools.',
    },
    runtime: {
      database: {
        dsnEnv: 'DATABASE_URL',
      },
    },
  };
}

function validateState(state) {
  const issues = [];

  if (!state || typeof state !== 'object') {
    issues.push('state is not an object');
    return issues;
  }

  if (state.version !== 1) issues.push('version must be 1');
  if (!allowedStages.has(String(state.stage || ''))) issues.push(`stage must be one of: ${[...allowedStages].join(', ')}`);

  if (!state.context || typeof state.context !== 'object') {
    issues.push('context must be an object');
  } else {
    if (typeof state.context.enabled !== 'boolean') issues.push('context.enabled must be boolean');
    if (!allowedContextModes.has(String(state.context.mode || ''))) issues.push(`context.mode must be one of: ${[...allowedContextModes].join(', ')}`);
  }

  // runtime is intentionally loosely typed, but we enforce "no obvious secret dumping".
  if (state.runtime && typeof state.runtime === 'object') {
    const raw = JSON.stringify(state.runtime).toLowerCase();
    const secretMarkers = ['password', 'secret', 'private_key', 'apikey', 'api_key', 'token='];
    for (const m of secretMarkers) {
      if (raw.includes(m)) {
        issues.push(`runtime appears to contain secret-like data ("${m}"). Store only references (env var names), not secrets.`);
        break;
      }
    }
  }

  return issues;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.command) {
    printHelp();
    process.exit(0);
  }

  const statePath = path.join(args.repoRoot, stateRel);

  if (args.command === 'init') {
    if (fs.existsSync(statePath)) {
      console.log(colors.gray(`State already exists: ${stateRel}`));
      return;
    }
    if (!args.dryRun) writeJson(statePath, defaultState());
    console.log(colors.green(`Created: ${stateRel}`));
    return;
  }

  if (args.command === 'show') {
    if (!fs.existsSync(statePath)) {
      console.error(colors.red(`Missing: ${stateRel}`));
      process.exit(1);
    }
    const state = readJson(statePath);
    console.log(JSON.stringify(state, null, 2));
    return;
  }

  if (args.command === 'set-stage') {
    const stage = args.positional[0];
    if (!allowedStages.has(String(stage || ''))) {
      console.error(colors.red(`Invalid stage: ${stage}`));
      console.error(colors.gray(`Allowed: ${[...allowedStages].join(', ')}`));
      process.exit(1);
    }
    if (!fs.existsSync(statePath)) {
      console.error(colors.red(`Missing: ${stateRel} (run: projectctl init)`));
      process.exit(1);
    }
    const state = readJson(statePath);
    state.stage = stage;
    if (!args.dryRun) writeJson(statePath, state);
    console.log(colors.green(`Updated stage -> ${stage}`));
    return;
  }

  if (args.command === 'set-context-mode') {
    const mode = args.positional[0];
    if (!allowedContextModes.has(String(mode || ''))) {
      console.error(colors.red(`Invalid context.mode: ${mode}`));
      console.error(colors.gray(`Allowed: ${[...allowedContextModes].join(', ')}`));
      process.exit(1);
    }
    if (!fs.existsSync(statePath)) {
      console.error(colors.red(`Missing: ${stateRel} (run: projectctl init)`));
      process.exit(1);
    }
    const state = readJson(statePath);
    state.context = state.context || {};
    state.context.mode = mode;
    if (!args.dryRun) writeJson(statePath, state);
    console.log(colors.green(`Updated context.mode -> ${mode}`));
    return;
  }

  if (args.command === 'verify') {
    if (!fs.existsSync(statePath)) {
      console.error(colors.red(`Missing: ${stateRel}`));
      process.exit(1);
    }
    const state = readJson(statePath);
    const issues = validateState(state);

    if (issues.length === 0) {
      console.log(colors.green('Project state is valid.'));
      return;
    }

    console.error(colors.red('Project state validation failed:'));
    for (const i of issues) console.error(colors.red(`- ${i}`));
    process.exit(1);
  }

  console.error(colors.red(`Unknown command: ${args.command}`));
  console.error(colors.gray('Use --help for usage.'));
  process.exit(1);
}

main();
