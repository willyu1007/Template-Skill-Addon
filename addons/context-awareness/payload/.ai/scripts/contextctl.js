#!/usr/bin/env node

/**
 * contextctl.js
 *
 * Purpose:
 * - Manage `docs/context/` as the stable, curated context layer for an LLM.
 * - Enforce a verifiable registry (`docs/context/registry.json`) with sha256 checksums.
 *
 * Design constraints:
 * - No external dependencies (Node standard library only).
 * - Script is repo-local and path-driven (no recursive scanning outside `docs/context/`).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const childProcess = require('child_process');

const repoRootDefault = path.resolve(__dirname, '..', '..');

const colors = {
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};

function nowIso() {
  const d = new Date();
  return d.toISOString();
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function readJson(p) {
  const raw = readText(p);
  return JSON.parse(raw);
}

function writeJson(p, obj) {
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`, 'utf8');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function exists(p) {
  return fs.existsSync(p);
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function isPathInside(parent, child) {
  const rel = path.relative(parent, child);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function printHelp() {
  const cmd = 'node .ai/scripts/contextctl.js';
  console.log([
    'Manage the project context layer under docs/context/.',
    '',
    `Usage: ${cmd} <command> [options]`,
    '',
    'Commands:',
    '  init                          Create docs/context skeleton (idempotent)',
    '  status                        Print registry summary',
    '  add-artifact                  Register a new context artifact in the registry',
    '  touch                         Update sha256 checksums + timestamps in registry.json',
    '  verify                        Verify registry consistency (supports --strict, --format json)',
    '  update                        Run generator commands for artifacts with mode=generated (opt-in)',
    '',
    'Common options:',
    '  --repo-root <path>            Repo root (default: inferred from script location)',
    '  --format <text|json>          Output format (verify/status) (default: text)',
    '  --strict                      Treat warnings as errors',
    '  --dry-run                     Print actions without writing',
    '',
    'add-artifact options:',
    '  --id <kebab-case>             Artifact id (unique)',
    '  --type <string>               Artifact type (openapi, db-schema, bpmn, ...)',
    '  --path <repo-relative-path>   Target artifact path (MUST be under docs/context/)',
    '  --mode <contract|generated>   Default: contract',
    '  --format-tag <string>         Optional format tag (e.g. openapi-3.1)',
    '  --tag <string>                Repeatable tag',
    '  --create                       Create a placeholder file if it does not exist',
    '  --command <string>            (generated mode) command to (re)generate the artifact',
    '  --cwd <path>                  (generated mode) command working directory (repo-relative)',
    '',
    'Examples:',
    `  ${cmd} init`,
    `  ${cmd} add-artifact --id order-flow --type bpmn --path docs/context/process/order-flow.bpmn --create`,
    `  ${cmd} touch`,
    `  ${cmd} verify --strict`,
    '',
  ].join('\n'));
}

function parseArgs(argv) {
  const out = {
    help: false,
    command: null,
    repoRoot: repoRootDefault,
    format: 'text',
    strict: false,
    dryRun: false,

    // add-artifact
    id: null,
    type: null,
    artifactPath: null,
    mode: 'contract',
    formatTag: null,
    tags: [],
    create: false,
    commandStr: null,
    cwd: null,

    // update
    allowShell: false,
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
    if (a === '--format') {
      out.format = String(args[i + 1] || 'text').trim();
      i += 1;
      continue;
    }
    if (a === '--strict') {
      out.strict = true;
      continue;
    }
    if (a === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (a === '--id') {
      out.id = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (a === '--type') {
      out.type = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (a === '--path') {
      out.artifactPath = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (a === '--mode') {
      out.mode = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (a === '--format-tag') {
      out.formatTag = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (a === '--tag') {
      out.tags.push(String(args[i + 1] || '').trim());
      i += 1;
      continue;
    }
    if (a === '--create') {
      out.create = true;
      continue;
    }
    if (a === '--command') {
      out.commandStr = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (a === '--cwd') {
      out.cwd = String(args[i + 1] || '').trim();
      i += 1;
      continue;
    }
    if (a === '--allow-shell') {
      out.allowShell = true;
      continue;
    }

    console.error(colors.red(`Unknown argument: ${a}`));
    console.error(colors.gray('Use --help for usage.'));
    process.exit(1);
  }

  return out;
}

function pathsFor(repoRoot) {
  const contextRoot = path.join(repoRoot, 'docs', 'context');
  return {
    repoRoot,
    contextRoot,
    indexPath: path.join(contextRoot, 'INDEX.md'),
    registryPath: path.join(contextRoot, 'registry.json'),
    schemaPath: path.join(contextRoot, 'registry.schema.json'),
    apiDir: path.join(contextRoot, 'api'),
    dbDir: path.join(contextRoot, 'db'),
    processDir: path.join(contextRoot, 'process'),
  };
}

function ensureContextSkeleton(p, dryRun) {
  const actions = [];

  const mk = (dir) => {
    actions.push({ type: 'mkdir', path: dir });
    if (!dryRun) ensureDir(dir);
  };

  mk(p.contextRoot);
  mk(p.apiDir);
  mk(p.dbDir);
  mk(p.processDir);

  const indexContent = [
    '# Project Context Index (LLM-first)',
    '',
    '## Conclusions (read first)',
    '',
    '- `docs/context/` is the **stable, curated context layer** for this repository.',
    '- The canonical index of all context artifacts is `docs/context/registry.json`.',
    '- Any change to context artifacts MUST be accompanied by an updated registry checksum:',
    '  - `node .ai/scripts/contextctl.js touch`',
    '  - `node .ai/scripts/contextctl.js verify --strict`',
    '',
    '## How to load context (for AI/LLM)',
    '',
    '1. Open `docs/context/registry.json`.',
    '2. Select only the artifacts needed for the current task.',
    '3. Open those files by path (do not scan folders).',
    '',
  ].join('\n');

  if (!exists(p.indexPath)) {
    actions.push({ type: 'write', path: p.indexPath });
    if (!dryRun) fs.writeFileSync(p.indexPath, `${indexContent}\n`, 'utf8');
  }

  // Only create placeholders if missing. If the add-on already shipped these files, init is a no-op.
  const openapiPath = path.join(p.apiDir, 'openapi.yaml');
  if (!exists(openapiPath)) {
    const openapi = [
      'openapi: 3.1.0',
      'info:',
      '  title: Project API',
      '  version: 0.1.0',
      'servers: []',
      'paths: {}',
      'components:',
      '  schemas: {}',
      '',
    ].join('\n');
    actions.push({ type: 'write', path: openapiPath });
    if (!dryRun) fs.writeFileSync(openapiPath, openapi, 'utf8');
  }

  const dbSchemaPath = path.join(p.dbDir, 'schema.json');
  if (!exists(dbSchemaPath)) {
    const dbSchema = {
      version: 1,
      database: { kind: 'relational', dialect: 'generic', name: '' },
      tables: [],
      notes: 'Normalized, tool-agnostic DB schema mapping for LLM consumption.',
    };
    actions.push({ type: 'write', path: dbSchemaPath });
    if (!dryRun) writeJson(dbSchemaPath, dbSchema);
  }

  const processReadme = path.join(p.processDir, 'README.md');
  if (!exists(processReadme)) {
    const readme = [
      '# Business Process Artifacts (BPMN)',
      '',
      'Place BPMN 2.0 `.bpmn` files here and register them in `docs/context/registry.json`.',
      '',
    ].join('\n');
    actions.push({ type: 'write', path: processReadme });
    if (!dryRun) fs.writeFileSync(processReadme, `${readme}\n`, 'utf8');
  }

  if (!exists(p.registryPath)) {
    const updatedAt = nowIso();
    const artifacts = [
      {
        id: 'api-openapi',
        type: 'openapi',
        path: 'docs/context/api/openapi.yaml',
        mode: 'contract',
        format: 'openapi-3.1',
        tags: ['api'],
        lastUpdated: updatedAt,
        source: { kind: 'manual', notes: 'Edit contract then run contextctl touch.' },
      },
      {
        id: 'db-schema',
        type: 'db-schema',
        path: 'docs/context/db/schema.json',
        mode: 'contract',
        format: 'normalized-db-schema-v1',
        tags: ['db'],
        lastUpdated: updatedAt,
        source: { kind: 'manual', notes: 'Update mapping then run contextctl touch.' },
      },
    ];
    const registry = { version: 1, updatedAt, artifacts };
    actions.push({ type: 'write', path: p.registryPath });
    if (!dryRun) writeJson(p.registryPath, registry);
  }

  return actions;
}

function loadRegistry(p) {
  if (!exists(p.registryPath)) {
    console.error(colors.red(`Missing registry: ${toPosix(path.relative(p.repoRoot, p.registryPath))}`));
    process.exit(1);
  }
  const reg = readJson(p.registryPath);
  if (reg.version !== 1 || !Array.isArray(reg.artifacts)) {
    console.error(colors.red('Invalid registry schema. Expected { version: 1, artifacts: [...] }.'));
    process.exit(1);
  }
  return reg;
}

function updateChecksums(p, reg, { dryRun }) {
  const updatedAt = nowIso();
  const warnings = [];
  const outArtifacts = [];

  for (const a of reg.artifacts) {
    const fileAbs = path.join(p.repoRoot, a.path);
    const next = { ...a };
    if (!exists(fileAbs)) {
      warnings.push(`Missing artifact file: ${a.id} -> ${a.path}`);
      outArtifacts.push(next);
      continue;
    }
    const buf = fs.readFileSync(fileAbs);
    next.checksumSha256 = sha256(buf);
    next.lastUpdated = updatedAt;
    outArtifacts.push(next);
  }

  const nextReg = { ...reg, updatedAt, artifacts: outArtifacts };

  if (!dryRun) {
    writeJson(p.registryPath, nextReg);
  }

  return { nextReg, warnings };
}

function verifyRegistry(p, reg, { strict, format }) {
  const issues = [];
  const results = [];

  for (const a of reg.artifacts) {
    const fileAbs = path.join(p.repoRoot, a.path);
    const rel = toPosix(a.path);

    const r = {
      id: a.id,
      path: rel,
      ok: true,
      expected: a.checksumSha256 || null,
      actual: null,
      message: null,
    };

    if (!exists(fileAbs)) {
      r.ok = false;
      r.message = 'missing-file';
      issues.push(`Missing artifact file: ${a.id} -> ${rel}`);
      results.push(r);
      continue;
    }

    const buf = fs.readFileSync(fileAbs);
    r.actual = sha256(buf);

    if (!a.checksumSha256) {
      r.ok = false;
      r.message = 'missing-checksum';
      issues.push(`Missing checksum in registry for artifact: ${a.id} (run: contextctl touch)`);
      results.push(r);
      continue;
    }

    if (a.checksumSha256 !== r.actual) {
      r.ok = false;
      r.message = 'checksum-mismatch';
      issues.push(`Checksum mismatch: ${a.id} (${rel}) (run: contextctl touch)`);
      results.push(r);
      continue;
    }

    results.push(r);
  }

  const ok = issues.length === 0;
  if (format === 'json') {
    console.log(JSON.stringify({ ok, issues, results }, null, 2));
  } else {
    console.log(colors.cyan('========================================'));
    console.log(colors.cyan('  Context registry verification'));
    console.log(colors.cyan('========================================'));
    for (const r of results) {
      if (r.ok) {
        console.log(colors.green(`  [OK]  ${r.id} -> ${r.path}`));
      } else {
        console.log(colors.red(`  [FAIL] ${r.id} -> ${r.path} (${r.message})`));
      }
    }

    if (!ok) {
      console.log('');
      console.log(colors.red('Issues:'));
      for (const msg of issues) console.log(colors.red(`- ${msg}`));
      console.log('');
      console.log(colors.gray('Fix: run `node .ai/scripts/contextctl.js touch` after editing artifacts.'));
    } else {
      console.log(colors.green('All registered artifacts match registry checksums.'));
    }
  }

  if (!ok && strict) process.exit(1);
  if (!ok && !strict) process.exitCode = 2;
}

function placeholderForType(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'openapi') {
    return [
      'openapi: 3.1.0',
      'info:',
      '  title: Project API',
      '  version: 0.1.0',
      'servers: []',
      'paths: {}',
      '',
    ].join('\n');
  }
  if (t === 'db-schema') {
    return JSON.stringify({
      version: 1,
      database: { kind: 'relational', dialect: 'generic', name: '' },
      tables: [],
    }, null, 2) + '\n';
  }
  if (t === 'bpmn') {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      '  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"',
      '  id="Definitions_ReplaceMe"',
      '  targetNamespace="http://example.com/bpmn">',
      '',
      '  <bpmn:process id="Process_ReplaceMe" isExecutable="false">',
      '    <bpmn:startEvent id="StartEvent_1" name="Start"/>',
      '    <bpmn:endEvent id="EndEvent_1" name="End"/>',
      '    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="EndEvent_1"/>',
      '  </bpmn:process>',
      '',
      '</bpmn:definitions>',
      '',
    ].join('\n');
  }
  return `# Placeholder for ${type}\n`;
}

function addArtifact(p, args) {
  if (!args.id || !args.type || !args.artifactPath) {
    console.error(colors.red('add-artifact requires: --id, --type, --path'));
    process.exit(1);
  }

  const idOk = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(args.id);
  if (!idOk) {
    console.error(colors.red('Invalid --id. Use kebab-case (2-64 chars).'));
    process.exit(1);
  }

  const abs = path.join(p.repoRoot, args.artifactPath);
  if (!isPathInside(p.contextRoot, abs)) {
    console.error(colors.red('--path MUST be under docs/context/.'));
    console.error(colors.gray(`Provided: ${args.artifactPath}`));
    process.exit(1);
  }

  const reg = loadRegistry(p);

  if (reg.artifacts.some((a) => a.id === args.id)) {
    console.error(colors.red(`Duplicate artifact id: ${args.id}`));
    process.exit(1);
  }

  const next = {
    id: args.id,
    type: args.type,
    path: toPosix(args.artifactPath),
    mode: args.mode === 'generated' ? 'generated' : 'contract',
  };

  if (args.formatTag) next.format = args.formatTag;
  if (args.tags && args.tags.length > 0) next.tags = args.tags.filter(Boolean);

  if (next.mode === 'generated') {
    next.source = { kind: 'command' };
    if (args.commandStr) next.source.command = args.commandStr;
    if (args.cwd) next.source.cwd = args.cwd;
  } else {
    next.source = { kind: 'manual' };
  }

  const actions = [];
  if (args.create && !exists(abs)) {
    actions.push({ type: 'write', path: abs });
    if (!args.dryRun) {
      ensureDir(path.dirname(abs));
      fs.writeFileSync(abs, placeholderForType(next.type), 'utf8');
    }
  }

  const updatedAt = nowIso();
  next.lastUpdated = updatedAt;

  const nextReg = {
    ...reg,
    updatedAt,
    artifacts: [...reg.artifacts, next],
  };

  actions.push({ type: 'write', path: p.registryPath });

  if (!args.dryRun) writeJson(p.registryPath, nextReg);

  // Update checksums after creating the file.
  if (!args.dryRun) {
    const reg2 = loadRegistry(p);
    updateChecksums(p, reg2, { dryRun: false });
  }

  console.log(colors.green(`Registered artifact: ${next.id} -> ${next.path}`));
  if (actions.length > 0 && args.dryRun) {
    console.log(colors.gray('Dry-run actions:'));
    for (const a of actions) {
      console.log(colors.gray(`- ${a.type}: ${toPosix(path.relative(p.repoRoot, a.path))}`));
    }
  }
}

function status(p, format) {
  const reg = loadRegistry(p);
  const summary = {
    version: reg.version,
    updatedAt: reg.updatedAt,
    count: reg.artifacts.length,
    artifacts: reg.artifacts.map((a) => ({
      id: a.id,
      type: a.type,
      mode: a.mode,
      path: a.path,
    })),
  };

  if (format === 'json') {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(colors.cyan('========================================'));
  console.log(colors.cyan('  Context registry status'));
  console.log(colors.cyan('========================================'));
  console.log(`Registry: ${toPosix(path.relative(p.repoRoot, p.registryPath))}`);
  console.log(`Artifacts: ${summary.count}`);
  console.log('');
  for (const a of summary.artifacts) {
    console.log(`- ${a.id} (${a.type}, ${a.mode}) -> ${a.path}`);
  }
}

function updateGeneratedArtifacts(p, args) {
  const reg = loadRegistry(p);
  const generated = reg.artifacts.filter((a) => a.mode === 'generated');

  if (generated.length === 0) {
    console.log(colors.gray('No generated artifacts registered. Nothing to update.'));
    return;
  }

  if (!args.allowShell) {
    console.error(colors.red('Refusing to run external commands without --allow-shell.'));
    console.error(colors.gray('Reason: generated artifacts may run arbitrary project commands.'));
    console.error(colors.gray('Re-run with: --allow-shell'));
    process.exit(1);
  }

  for (const a of generated) {
    const cmd = a.source && a.source.command ? String(a.source.command) : null;
    if (!cmd) {
      console.log(colors.yellow(`  [skip] ${a.id}: missing source.command`));
      continue;
    }

    const cwd = a.source && a.source.cwd ? path.join(p.repoRoot, a.source.cwd) : p.repoRoot;
    console.log(colors.cyan(`  [run] ${a.id}: ${cmd}`));
    if (!args.dryRun) {
      childProcess.execSync(cmd, { cwd, stdio: 'inherit', shell: true });
    }
  }

  if (!args.dryRun) {
    const reg2 = loadRegistry(p);
    updateChecksums(p, reg2, { dryRun: false });
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.command) {
    printHelp();
    process.exit(0);
  }

  const p = pathsFor(args.repoRoot);

  if (args.command === 'init') {
    const actions = ensureContextSkeleton(p, args.dryRun);
    // Always update checksums if possible.
    if (!args.dryRun) {
      const reg = loadRegistry(p);
      updateChecksums(p, reg, { dryRun: false });
    }
    console.log(colors.green('Context layer initialized.'));
    if (args.dryRun) {
      console.log(colors.gray('Dry-run actions:'));
      for (const a of actions) {
        console.log(colors.gray(`- ${a.type}: ${toPosix(path.relative(p.repoRoot, a.path))}`));
      }
    }
    return;
  }

  if (args.command === 'status') {
    status(p, args.format);
    return;
  }

  if (args.command === 'add-artifact') {
    addArtifact(p, args);
    return;
  }

  if (args.command === 'touch') {
    const reg = loadRegistry(p);
    const { warnings } = updateChecksums(p, reg, { dryRun: args.dryRun });
    if (warnings.length > 0) {
      console.log(colors.yellow('Warnings:'));
      for (const w of warnings) console.log(colors.yellow(`- ${w}`));
    }
    console.log(colors.green('Registry updated (checksums + timestamps).'));
    return;
  }

  if (args.command === 'verify') {
    const reg = loadRegistry(p);
    verifyRegistry(p, reg, { strict: args.strict, format: args.format });
    return;
  }

  if (args.command === 'update') {
    updateGeneratedArtifacts(p, args);
    return;
  }

  console.error(colors.red(`Unknown command: ${args.command}`));
  console.error(colors.gray('Use --help for usage.'));
  process.exit(1);
}

main();
