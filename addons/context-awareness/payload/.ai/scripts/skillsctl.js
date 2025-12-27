#!/usr/bin/env node
/**
 * skillsctl.js - Skills Pack Management Script
 *
 * Manages skill packs and wrapper synchronization.
 *
 * Commands:
 *   list-packs         List available skill packs
 *   enable-pack        Enable a skill pack
 *   disable-pack       Disable a skill pack
 *   show-pack          Show pack details
 *   sync               Sync skill wrappers to providers
 *   help               Show this help message
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const PACKS_DIR = '.ai/skills/_meta/packs';
const MANIFEST_FILE = '.ai/skills/_meta/sync-manifest.json';
const SYNC_SCRIPT = '.ai/scripts/sync-skills.js';

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
  // Default: assume script is at .ai/scripts/skillsctl.js
  return resolve(__dirname, '..', '..');
}

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

function loadJson(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${filePath}: ${e.message}`);
    return null;
  }
}

function saveJson(filePath, data) {
  ensureDir(dirname(filePath));
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadManifest(repoRoot) {
  const manifestPath = join(repoRoot, MANIFEST_FILE);
  const manifest = loadJson(manifestPath);
  if (!manifest) {
    // Return default manifest structure
    return {
      version: 1,
      includePrefixes: [],
      excludePrefixes: [],
      enabledPacks: []
    };
  }
  // Ensure enabledPacks exists
  if (!manifest.enabledPacks) {
    manifest.enabledPacks = [];
  }
  return manifest;
}

function saveManifest(repoRoot, manifest) {
  const manifestPath = join(repoRoot, MANIFEST_FILE);
  saveJson(manifestPath, manifest);
}

function getAvailablePacks(repoRoot) {
  const packsDir = join(repoRoot, PACKS_DIR);
  if (!existsSync(packsDir)) return [];

  const files = readdirSync(packsDir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const packId = basename(f, '.json');
    const packPath = join(packsDir, f);
    const pack = loadJson(packPath);
    return { id: packId, path: packPath, data: pack };
  }).filter(p => p.data !== null);
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

function cmdListPacks(repoRoot) {
  const packs = getAvailablePacks(repoRoot);
  const manifest = loadManifest(repoRoot);
  const enabledSet = new Set(manifest.enabledPacks || []);

  if (packs.length === 0) {
    console.log('No skill packs found.');
    console.log(`\nPacks directory: ${PACKS_DIR}/`);
    return 0;
  }

  console.log('Available skill packs:\n');
  for (const pack of packs) {
    const enabled = enabledSet.has(pack.id) ? '[enabled]' : '';
    console.log(`  ${pack.id} ${enabled}`);
    if (pack.data.description) {
      console.log(`    ${pack.data.description}`);
    }
    if (pack.data.includePrefixes?.length) {
      console.log(`    prefixes: ${pack.data.includePrefixes.join(', ')}`);
    }
    console.log();
  }
  return 0;
}

function cmdEnablePack(repoRoot, packId, flags) {
  if (!packId) {
    console.error('Error: pack id is required.');
    console.error('Usage: skillsctl enable-pack <packId> [--no-sync] [--providers <both|codex|claude>]');
    return 1;
  }

  const packsDir = join(repoRoot, PACKS_DIR);
  const packPath = join(packsDir, `${packId}.json`);

  if (!existsSync(packPath)) {
    console.error(`Error: Pack "${packId}" not found at ${packPath}`);
    console.error('Run `skillsctl list-packs` to see available packs.');
    return 1;
  }

  const pack = loadJson(packPath);
  if (!pack) {
    console.error(`Error: Could not read pack file: ${packPath}`);
    return 1;
  }

  const manifest = loadManifest(repoRoot);

  // Add to enabledPacks if not already
  if (!manifest.enabledPacks.includes(packId)) {
    manifest.enabledPacks.push(packId);
  }

  // Merge includePrefixes from pack
  if (pack.includePrefixes) {
    for (const prefix of pack.includePrefixes) {
      if (!manifest.includePrefixes.includes(prefix)) {
        manifest.includePrefixes.push(prefix);
      }
    }
  }

  saveManifest(repoRoot, manifest);
  console.log(`Enabled pack: ${packId}`);

  // Sync unless --no-sync
  if (!flags['no-sync']) {
    const providers = flags.providers || 'both';
    console.log(`\nSyncing wrappers (providers: ${providers})...`);
    return cmdSync(repoRoot, { providers });
  }

  return 0;
}

function cmdDisablePack(repoRoot, packId, flags) {
  if (!packId) {
    console.error('Error: pack id is required.');
    console.error('Usage: skillsctl disable-pack <packId> [--no-sync]');
    return 1;
  }

  const manifest = loadManifest(repoRoot);

  const idx = manifest.enabledPacks.indexOf(packId);
  if (idx === -1) {
    console.log(`Pack "${packId}" is not enabled.`);
    return 0;
  }

  // Load pack to get its prefixes
  const packPath = join(repoRoot, PACKS_DIR, `${packId}.json`);
  const pack = loadJson(packPath);

  manifest.enabledPacks.splice(idx, 1);

  // Optionally remove prefixes (only if no other pack uses them)
  if (pack?.includePrefixes) {
    // Collect all prefixes from remaining enabled packs
    const otherPrefixes = new Set();
    for (const otherId of manifest.enabledPacks) {
      const otherPack = loadJson(join(repoRoot, PACKS_DIR, `${otherId}.json`));
      if (otherPack?.includePrefixes) {
        otherPack.includePrefixes.forEach(p => otherPrefixes.add(p));
      }
    }
    // Remove only prefixes unique to disabled pack
    manifest.includePrefixes = manifest.includePrefixes.filter(p => {
      if (pack.includePrefixes.includes(p) && !otherPrefixes.has(p)) {
        return false; // Remove
      }
      return true;
    });
  }

  saveManifest(repoRoot, manifest);
  console.log(`Disabled pack: ${packId}`);

  // Sync unless --no-sync
  if (!flags['no-sync']) {
    const providers = flags.providers || 'both';
    console.log(`\nSyncing wrappers (providers: ${providers})...`);
    return cmdSync(repoRoot, { providers });
  }

  return 0;
}

function cmdShowPack(repoRoot, packId) {
  if (!packId) {
    console.error('Error: pack id is required.');
    return 1;
  }

  const packPath = join(repoRoot, PACKS_DIR, `${packId}.json`);
  const pack = loadJson(packPath);

  if (!pack) {
    console.error(`Error: Pack "${packId}" not found.`);
    return 1;
  }

  console.log(`Pack: ${packId}\n`);
  console.log(JSON.stringify(pack, null, 2));
  return 0;
}

function cmdSync(repoRoot, flags) {
  const syncScript = join(repoRoot, SYNC_SCRIPT);

  if (!existsSync(syncScript)) {
    console.error(`Error: Sync script not found: ${SYNC_SCRIPT}`);
    console.error('The base template sync-skills.js is required for wrapper synchronization.');
    return 1;
  }

  const providers = flags.providers || 'both';
  const scope = flags.scope || 'current';

  const cmd = `node "${syncScript}" --scope ${scope} --providers ${providers}`;
  console.log(`Running: ${cmd}\n`);

  try {
    execSync(cmd, { cwd: repoRoot, stdio: 'inherit' });
    return 0;
  } catch (e) {
    console.error('Sync failed.');
    return 1;
  }
}

function cmdHelp() {
  console.log(`
skillsctl.js - Skills Pack Management

Usage: node .ai/scripts/skillsctl.js <command> [options]

Commands:
  list-packs           List available skill packs
  enable-pack <id>     Enable a skill pack
    --no-sync          Don't sync wrappers after enabling
    --providers <p>    Provider target: both (default), codex, claude
  disable-pack <id>    Disable a skill pack
    --no-sync          Don't sync wrappers after disabling
  show-pack <id>       Show pack details
  sync                 Sync skill wrappers to providers
    --providers <p>    Provider target: both (default), codex, claude
    --scope <s>        Sync scope: current (default), all
  help                 Show this help message

Global Options:
  --repo-root <path>   Repository root (default: auto-detect)

Pack Files:
  Packs are defined as JSON files in ${PACKS_DIR}/.
  Each pack specifies skill prefixes to include when enabled.

Examples:
  node .ai/scripts/skillsctl.js list-packs
  node .ai/scripts/skillsctl.js enable-pack context-core --providers both
  node .ai/scripts/skillsctl.js disable-pack context-core --no-sync
  node .ai/scripts/skillsctl.js sync --providers codex
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
    case 'list-packs':
      return cmdListPacks(repoRoot);
    case 'enable-pack':
      return cmdEnablePack(repoRoot, parsed._[1], parsed.flags);
    case 'disable-pack':
      return cmdDisablePack(repoRoot, parsed._[1], parsed.flags);
    case 'show-pack':
      return cmdShowPack(repoRoot, parsed._[1]);
    case 'sync':
      return cmdSync(repoRoot, parsed.flags);
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
