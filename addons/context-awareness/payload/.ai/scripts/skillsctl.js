#!/usr/bin/env node

/**
 * skillsctl.js
 *
 * Purpose:
 * - Provide a single, script-driven interface for skills pack switching.
 * - Avoid manual editing of `.ai/skills/_meta/sync-manifest.json`.
 *
 * Implementation:
 * - Packs are JSON files under `.ai/skills/_meta/packs/*.json`, each matching the manifest schema.
 * - State is stored in `.ai/skills/_meta/skillsctl-state.json`:
 *   - base (the baseline selection)
 *   - enabledPacks (list of pack ids)
 * - The effective manifest is computed as: base ∪ enabled pack selections.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const repoRootDefault = path.resolve(__dirname, '..', '..');

const manifestRel = path.join('.ai', 'skills', '_meta', 'sync-manifest.json');
const packsDirRel = path.join('.ai', 'skills', '_meta', 'packs');
const stateRel = path.join('.ai', 'skills', '_meta', 'skillsctl-state.json');

const colors = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

function printHelp() {
  const cmd = 'node .ai/scripts/skillsctl.js';
  console.log([
    'Manage skills pack selection and sync provider wrappers.',
    '',
    `Usage: ${cmd} <command> [options]`,
    '',
    'Commands:',
    '  status                       Show base selection + enabled packs + effective manifest',
    '  list-packs                    List available packs under .ai/skills/_meta/packs/',
    '  enable-pack <packId>          Enable a pack and re-compute manifest',
    '  disable-pack <packId>         Disable a pack and re-compute manifest',
    '  reset-base                    Set base selection to current manifest; clear enabled packs',
    '  sync                          Run sync-skills.js with the effective manifest',
    '',
    'Options:',
    '  --repo-root <path>            Repo root (default: inferred from script location)',
    '  --providers <codex|claude|both|csv> Providers for sync (default: both)',
    '  --no-sync                     Do not run sync-skills.js automatically (enable/disable only)',
    '  --dry-run                     Print actions without writing',
    '  -h, --help                    Show help',
    '',
    'Notes:',
    '- The effective manifest is written to `.ai/skills/_meta/sync-manifest.json`.',
    '- Pack files MUST follow the same schema as the manifest.',
    '',
  ].join('\n'));
}

function parseArgs(argv) {
  const out = {
    repoRoot: repoRootDefault,
    providers: 'both',
    noSync: false,
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
    if (a === '--providers') {
      out.providers = String(args[i + 1] || 'both').trim();
      i += 1;
      continue;
    }
    if (a === '--no-sync') {
      out.noSync = true;
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

function normalizeManifest(m) {
  const includePrefixes = Array.isArray(m.includePrefixes) ? m.includePrefixes : (Array.isArray(m.prefixes) ? m.prefixes : []);
  const includeSkills = Array.isArray(m.includeSkills) ? m.includeSkills : (Array.isArray(m.skills) ? m.skills : []);
  const excludeSkills = Array.isArray(m.excludeSkills) ? m.excludeSkills : (Array.isArray(m.exclude) ? m.exclude : []);

  return {
    version: 1,
    includePrefixes: includePrefixes.map((s) => String(s)),
    includeSkills: includeSkills.map((s) => String(s)),
    excludeSkills: excludeSkills.map((s) => String(s)),
  };
}

function uniq(arr) {
  return [...new Set(arr)];
}

function loadOrInitState(statePath, manifestPath, { dryRun }) {
  if (fs.existsSync(statePath)) {
    const st = readJson(statePath);
    return {
      version: 1,
      base: normalizeManifest(st.base || {}),
      enabledPacks: Array.isArray(st.enabledPacks) ? st.enabledPacks.map((s) => String(s)) : [],
    };
  }

  if (!fs.existsSync(manifestPath)) {
    console.error(colors.red(`Missing manifest: ${manifestRel}`));
    process.exit(1);
  }

  const base = normalizeManifest(readJson(manifestPath));
  const st = { version: 1, base, enabledPacks: [] };

  if (!dryRun) writeJson(statePath, st);
  return st;
}

function listPacks(packsDir) {
  if (!fs.existsSync(packsDir)) return [];
  const entries = fs.readdirSync(packsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => e.name.replace(/\.json$/, ''))
    .sort((a, b) => a.localeCompare(b));
}

function loadPack(packsDir, packId) {
  const packPath = path.join(packsDir, `${packId}.json`);
  if (!fs.existsSync(packPath)) {
    console.error(colors.red(`Unknown pack: ${packId}`));
    console.error(colors.gray(`Expected: ${toPosix(path.relative(repoRootDefault, packPath))}`));
    process.exit(1);
  }
  const raw = readJson(packPath);
  const m = normalizeManifest(raw);
  return { id: packId, manifest: m, packPath };
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function computeEffective(base, packs) {
  const includePrefixes = [];
  const includeSkills = [];
  const excludeSkills = [];

  includePrefixes.push(...base.includePrefixes);
  includeSkills.push(...base.includeSkills);
  excludeSkills.push(...base.excludeSkills);

  for (const p of packs) {
    includePrefixes.push(...p.manifest.includePrefixes);
    includeSkills.push(...p.manifest.includeSkills);
    excludeSkills.push(...p.manifest.excludeSkills);
  }

  // Exclude wins by removal (sync-skills.js applies exclude after selecting).
  return {
    version: 1,
    includePrefixes: uniq(includePrefixes),
    includeSkills: uniq(includeSkills),
    excludeSkills: uniq(excludeSkills),
  };
}

function writeEffectiveManifest(manifestPath, effective, { dryRun }) {
  if (!dryRun) writeJson(manifestPath, effective);
}

function syncWrappers(repoRoot, { providers, dryRun }) {
  const cmd = 'node';
  const args = [
    path.join('.ai', 'scripts', 'sync-skills.js'),
    '--scope',
    'current',
    '--providers',
    providers,
  ];

  console.log(colors.cyan(`Sync: ${cmd} ${args.join(' ')}`));
  if (!dryRun) {
    childProcess.execFileSync(cmd, args, { cwd: repoRoot, stdio: 'inherit' });
  }
}

function status(repoRoot, statePath, manifestPath, packsDir) {
  const st = loadOrInitState(statePath, manifestPath, { dryRun: false });
  const packIds = st.enabledPacks;
  const packs = packIds.map((id) => loadPack(packsDir, id));
  const effective = computeEffective(st.base, packs);

  console.log(colors.cyan('========================================'));
  console.log(colors.cyan('  Skills pack status'));
  console.log(colors.cyan('========================================'));
  console.log(`Manifest: ${manifestRel}`);
  console.log(`State:    ${stateRel}`);
  console.log('');
  console.log('Enabled packs:');
  if (packIds.length === 0) console.log(colors.gray('  (none)'));
  for (const id of packIds) console.log(`- ${id}`);
  console.log('');
  console.log('Effective selection (includePrefixes):');
  for (const p of effective.includePrefixes) console.log(`- ${p}`);
  console.log('');
  console.log('Effective selection (includeSkills):');
  if (effective.includeSkills.length === 0) console.log(colors.gray('  (none)'));
  for (const s of effective.includeSkills) console.log(`- ${s}`);
  console.log('');
  console.log('Effective selection (excludeSkills):');
  if (effective.excludeSkills.length === 0) console.log(colors.gray('  (none)'));
  for (const s of effective.excludeSkills) console.log(`- ${s}`);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.command) {
    printHelp();
    process.exit(0);
  }

  const repoRoot = args.repoRoot;
  const manifestPath = path.join(repoRoot, manifestRel);
  const packsDir = path.join(repoRoot, packsDirRel);
  const statePath = path.join(repoRoot, stateRel);

  if (args.command === 'list-packs') {
    const packs = listPacks(packsDir);
    if (packs.length === 0) {
      console.log(colors.gray('No packs found.'));
      process.exit(0);
    }
    for (const p of packs) console.log(p);
    process.exit(0);
  }

  if (args.command === 'status') {
    status(repoRoot, statePath, manifestPath, packsDir);
    process.exit(0);
  }

  if (args.command === 'reset-base') {
    if (!fs.existsSync(manifestPath)) {
      console.error(colors.red(`Missing manifest: ${manifestRel}`));
      process.exit(1);
    }
    const base = normalizeManifest(readJson(manifestPath));
    const st = { version: 1, base, enabledPacks: [] };
    if (!args.dryRun) writeJson(statePath, st);
    console.log(colors.green('Reset base selection and cleared enabled packs.'));
    process.exit(0);
  }

  if (args.command === 'enable-pack' || args.command === 'disable-pack') {
    const packId = args.positional[0];
    if (!packId) {
      console.error(colors.red(`${args.command} requires <packId>`));
      process.exit(1);
    }

    const st = loadOrInitState(statePath, manifestPath, { dryRun: args.dryRun });
    const enabled = new Set(st.enabledPacks);

    if (args.command === 'enable-pack') enabled.add(packId);
    if (args.command === 'disable-pack') enabled.delete(packId);

    const enabledPacks = [...enabled].sort((a, b) => a.localeCompare(b));

    // Load all packs to ensure they exist and are valid.
    const packs = enabledPacks.map((id) => loadPack(packsDir, id));
    const effective = computeEffective(st.base, packs);

    const nextState = { version: 1, base: st.base, enabledPacks };
    if (!args.dryRun) {
      writeJson(statePath, nextState);
      writeEffectiveManifest(manifestPath, effective, { dryRun: false });
    }

    console.log(colors.green(`Updated enabled packs: ${enabledPacks.join(', ') || '(none)'}`));

    if (!args.noSync) {
      syncWrappers(repoRoot, { providers: args.providers, dryRun: args.dryRun });
    }
    process.exit(0);
  }

  if (args.command === 'sync') {
    syncWrappers(repoRoot, { providers: args.providers, dryRun: args.dryRun });
    process.exit(0);
  }

  console.error(colors.red(`Unknown command: ${args.command}`));
  console.error(colors.gray('Use --help for usage.'));
  process.exit(1);
}

main();
