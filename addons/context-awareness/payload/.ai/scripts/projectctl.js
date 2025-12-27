#!/usr/bin/env node
/**
 * projectctl.js - Project State Management Script
 *
 * Manages project-level state and configuration under .ai/project/.
 *
 * Commands:
 *   init              Initialize project state (idempotent)
 *   get <key>         Get a state value
 *   set <key> <value> Set a state value
 *   set-context-mode  Set context mode (contract|snapshot)
 *   verify            Verify project state
 *   show              Show current project state
 *   help              Show this help message
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const PROJECT_DIR = '.ai/project';
const STATE_FILE = '.ai/project/state.json';
const STATE_SCHEMA_FILE = '.ai/project/state.schema.json';

const VALID_CONTEXT_MODES = ['contract', 'snapshot'];

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(args) {
  const result = { _: [], flags: {} };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        result.flags[key] = nextArg;
        i++;
      } else {
        result.flags[key] = true;
      }
    } else {
      result._.push(arg);
    }
  }
  return result;
}

function resolveRepoRoot(flagValue) {
  if (flagValue) return resolve(flagValue);
  // Default: assume script is at .ai/scripts/projectctl.js
  return resolve(__dirname, '..', '..');
}

function isoNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

function loadState(repoRoot) {
  const statePath = join(repoRoot, STATE_FILE);
  if (!existsSync(statePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(statePath, 'utf8'));
  } catch (e) {
    console.error(`Error reading state: ${e.message}`);
    return null;
  }
}

function saveState(repoRoot, state) {
  const statePath = join(repoRoot, STATE_FILE);
  state.updatedAt = isoNow();
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function createDefaultState() {
  return {
    version: 1,
    createdAt: isoNow(),
    updatedAt: isoNow(),
    context: {
      mode: 'contract',
      enabled: true
    },
    features: {},
    custom: {}
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

function cmdInit(repoRoot) {
  console.log(`Initializing project state at ${repoRoot}...`);

  const projectDir = join(repoRoot, PROJECT_DIR);
  let created = false;

  // Create project directory
  if (ensureDir(projectDir)) {
    console.log(`  Created: ${PROJECT_DIR}/`);
    created = true;
  }

  // Create state.json if missing
  const statePath = join(repoRoot, STATE_FILE);
  if (!existsSync(statePath)) {
    const initialState = createDefaultState();
    writeFileSync(statePath, JSON.stringify(initialState, null, 2));
    console.log(`  Created: ${STATE_FILE}`);
    created = true;
  }

  // Create state.schema.json if missing
  const schemaPath = join(repoRoot, STATE_SCHEMA_FILE);
  if (!existsSync(schemaPath)) {
    const schema = {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "title": "Project State",
      "type": "object",
      "additionalProperties": false,
      "required": ["version", "createdAt", "updatedAt", "context"],
      "properties": {
        "version": {
          "type": "integer",
          "const": 1
        },
        "createdAt": {
          "type": "string",
          "description": "ISO 8601 timestamp"
        },
        "updatedAt": {
          "type": "string",
          "description": "ISO 8601 timestamp"
        },
        "context": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "mode": {
              "type": "string",
              "enum": ["contract", "snapshot"],
              "description": "contract = authoritative files; snapshot = generated from source"
            },
            "enabled": {
              "type": "boolean"
            }
          }
        },
        "features": {
          "type": "object",
          "description": "Feature flags or enabled capabilities",
          "additionalProperties": { "type": "boolean" }
        },
        "custom": {
          "type": "object",
          "description": "Custom project-specific state",
          "additionalProperties": true
        }
      }
    };
    writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
    console.log(`  Created: ${STATE_SCHEMA_FILE}`);
    created = true;
  }

  if (!created) {
    console.log('  Project state already initialized (no changes).');
  }

  console.log('Done.');
  return 0;
}

function cmdGet(repoRoot, key) {
  if (!key) {
    console.error('Error: key is required.');
    console.error('Usage: projectctl get <key>');
    console.error('Examples: projectctl get context.mode, projectctl get features.someFlag');
    return 1;
  }

  const state = loadState(repoRoot);
  if (!state) {
    console.error('Error: Project state not found. Run `projectctl init` first.');
    return 1;
  }

  // Navigate nested keys
  const parts = key.split('.');
  let value = state;
  for (const part of parts) {
    if (value == null || typeof value !== 'object') {
      console.log('undefined');
      return 0;
    }
    value = value[part];
  }

  if (typeof value === 'object') {
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(value);
  }
  return 0;
}

function cmdSet(repoRoot, key, value) {
  if (!key || value === undefined) {
    console.error('Error: key and value are required.');
    console.error('Usage: projectctl set <key> <value>');
    return 1;
  }

  const state = loadState(repoRoot);
  if (!state) {
    console.error('Error: Project state not found. Run `projectctl init` first.');
    return 1;
  }

  // Parse value
  let parsedValue;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(Number(value))) parsedValue = Number(value);
  else parsedValue = value;

  // Navigate and set nested keys
  const parts = key.split('.');
  let obj = state;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (obj[part] == null || typeof obj[part] !== 'object') {
      obj[part] = {};
    }
    obj = obj[part];
  }
  obj[parts[parts.length - 1]] = parsedValue;

  saveState(repoRoot, state);
  console.log(`Set ${key} = ${JSON.stringify(parsedValue)}`);
  return 0;
}

function cmdSetContextMode(repoRoot, mode) {
  if (!mode) {
    console.error('Error: mode is required.');
    console.error('Usage: projectctl set-context-mode <contract|snapshot>');
    return 1;
  }

  if (!VALID_CONTEXT_MODES.includes(mode)) {
    console.error(`Error: Invalid mode "${mode}". Must be one of: ${VALID_CONTEXT_MODES.join(', ')}`);
    return 1;
  }

  const state = loadState(repoRoot);
  if (!state) {
    console.error('Error: Project state not found. Run `projectctl init` first.');
    return 1;
  }

  if (!state.context) {
    state.context = {};
  }
  state.context.mode = mode;
  saveState(repoRoot, state);

  console.log(`Context mode set to: ${mode}`);
  return 0;
}

function cmdVerify(repoRoot) {
  console.log('Verifying project state...');

  const state = loadState(repoRoot);
  if (!state) {
    console.error('Error: Project state not found.');
    return 1;
  }

  let errors = 0;

  // Check required fields
  if (state.version !== 1) {
    console.error('  ERROR: Invalid version (expected 1)');
    errors++;
  }

  if (!state.createdAt) {
    console.error('  ERROR: Missing createdAt');
    errors++;
  }

  if (!state.updatedAt) {
    console.error('  ERROR: Missing updatedAt');
    errors++;
  }

  if (!state.context) {
    console.error('  ERROR: Missing context object');
    errors++;
  } else if (state.context.mode && !VALID_CONTEXT_MODES.includes(state.context.mode)) {
    console.error(`  ERROR: Invalid context.mode "${state.context.mode}"`);
    errors++;
  }

  if (errors > 0) {
    console.error(`\nVerification FAILED: ${errors} error(s).`);
    return 1;
  }

  console.log('Verification passed.');
  return 0;
}

function cmdShow(repoRoot) {
  const state = loadState(repoRoot);
  if (!state) {
    console.error('Error: Project state not found.');
    return 1;
  }

  console.log('Project State:');
  console.log(JSON.stringify(state, null, 2));
  return 0;
}

function cmdHelp() {
  console.log(`
projectctl.js - Project State Management

Usage: node .ai/scripts/projectctl.js <command> [options]

Commands:
  init                 Initialize project state (idempotent)
  get <key>            Get a state value (dot notation supported)
  set <key> <value>    Set a state value (dot notation supported)
  set-context-mode <mode>
                       Set context mode: contract or snapshot
  verify               Verify project state is valid
  show                 Show current project state
  help                 Show this help message

Global Options:
  --repo-root <path>   Repository root (default: auto-detect)

Examples:
  node .ai/scripts/projectctl.js init
  node .ai/scripts/projectctl.js get context.mode
  node .ai/scripts/projectctl.js set features.myFeature true
  node .ai/scripts/projectctl.js set-context-mode contract
`);
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);
  const command = parsed._[0] || 'help';
  const repoRoot = resolveRepoRoot(parsed.flags['repo-root']);

  switch (command) {
    case 'init':
      return cmdInit(repoRoot);
    case 'get':
      return cmdGet(repoRoot, parsed._[1]);
    case 'set':
      return cmdSet(repoRoot, parsed._[1], parsed._[2]);
    case 'set-context-mode':
      return cmdSetContextMode(repoRoot, parsed._[1]);
    case 'verify':
      return cmdVerify(repoRoot);
    case 'show':
      return cmdShow(repoRoot);
    case 'help':
    case '--help':
    case '-h':
      return cmdHelp();
    default:
      console.error(`Unknown command: ${command}`);
      return cmdHelp() || 1;
  }
}

process.exit(main());
