#!/usr/bin/env node
/**
 * init-pipeline.js
 *
 * Dependency-free helper for a 3-stage, verifiable init pipeline:
 *
 *   Stage A: requirements docs under `docs/project/`
 *   Stage B: blueprint JSON at `docs/project/project-blueprint.json`
 *   Stage C: minimal scaffold + skill pack manifest update + wrapper sync
 *
 * Commands:
 *   - validate       Validate a blueprint JSON (no writes)
 *   - check-docs     Validate Stage A docs (structure + template placeholders)
 *   - suggest-packs  Recommend skill packs from blueprint capabilities (warn-only by default)
 *   - scaffold       Plan or apply a minimal directory scaffold from the blueprint
 *   - apply          validate + (optional) check-docs + scaffold + manifest update + wrapper sync
 *   - cleanup-init   Remove the `init/` bootstrap kit (opt-in, guarded)
 *
 * This script is intentionally framework-agnostic. It avoids generating code.
 */

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

function usage(exitCode = 0) {
  const msg = `
Usage:
  node init/skills/initialize-project-from-requirements/scripts/init-pipeline.js <command> [options]

Commands:
  validate
    --blueprint <path>          Blueprint JSON path (required)
    --repo-root <path>          Repo root (default: cwd)
    --format <text|json>        Output format (default: text)

  check-docs
    --docs-root <path>          Stage A docs root (default: <repo-root>/docs/project)
    --repo-root <path>          Repo root (default: cwd)
    --strict                    Treat warnings as errors (exit non-zero)
    --format <text|json>        Output format (default: text)

  suggest-packs
    --blueprint <path>          Blueprint JSON path (required)
    --repo-root <path>          Repo root (default: cwd)
    --format <text|json>        Output format (default: text)
    --write                      Add missing recommended packs into blueprint (safe-add only)

  scaffold
    --blueprint <path>          Blueprint JSON path (required)
    --repo-root <path>          Repo root (default: cwd)
    --apply                      Actually create directories/files (default: dry-run)

  apply
    --blueprint <path>          Blueprint JSON path (required)
    --repo-root <path>          Repo root (default: cwd)
    --providers <both|codex|claude|codex,claude>
                                Providers to sync (default: both)
    --require-stage-a           Run 'check-docs --strict' and fail if it does not pass
    --cleanup-init              Remove <repo-root>/init after success (requires --i-understand)
    --i-understand              Required acknowledgement for destructive actions

  cleanup-init
    --repo-root <path>          Repo root (default: cwd)
    --apply                      Actually remove init/ (default: dry-run)
    --i-understand              Required acknowledgement (refuses without it)

Examples:
  node .../init-pipeline.js check-docs --docs-root docs/project
  node .../init-pipeline.js validate --blueprint docs/project/project-blueprint.json
  node .../init-pipeline.js scaffold --blueprint docs/project/project-blueprint.json
  node .../init-pipeline.js apply --blueprint docs/project/project-blueprint.json --providers codex,claude --require-stage-a
`;
  console.log(msg.trim());
  process.exit(exitCode);
}

function die(msg, exitCode = 1) {
  console.error(msg);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') usage(0);

  const command = args.shift();
  const opts = {};
  const positionals = [];

  while (args.length > 0) {
    const token = args.shift();
    if (token === '-h' || token === '--help') usage(0);

    if (token.startsWith('--')) {
      const key = token.slice(2);
      if (args.length > 0 && !args[0].startsWith('--')) {
        opts[key] = args.shift();
      } else {
        opts[key] = true;
      }
    } else {
      positionals.push(token);
    }
  }

  return { command, opts, positionals };
}

function resolvePath(base, p) {
  if (!p) return null;
  if (path.isAbsolute(p)) return p;
  return path.resolve(base, p);
}

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    die(`[error] Failed to read JSON: ${filePath}\n${e.message}`);
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function toStringArray(v) {
  if (!v) return [];
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === 'string').map((x) => x.trim()).filter(Boolean);
}

function packPrefixMap() {
  return {
    workflows: 'workflows/',
    backend: 'backend/',
    frontend: 'frontend/',
    data: 'data/',
    diagrams: 'diagrams/',
    ops: 'ops/',
    scaffold: 'scaffold/'
  };
}

function packOrder() {
  return ['workflows', 'backend', 'frontend', 'data', 'diagrams', 'ops', 'scaffold'];
}

function normalizePackList(packs) {
  const cleaned = (packs || [])
    .filter((p) => typeof p === 'string')
    .map((p) => p.trim())
    .filter(Boolean);

  const order = packOrder();
  const ordered = [];
  for (const p of order) {
    if (cleaned.includes(p)) ordered.push(p);
  }
  for (const p of cleaned) {
    if (!ordered.includes(p)) ordered.push(p);
  }
  return uniq(ordered);
}

function validateBlueprint(blueprint) {
  const errors = [];
  const warnings = [];

  if (!blueprint || typeof blueprint !== 'object') {
    errors.push('Blueprint must be a JSON object.');
    return { ok: false, errors, warnings };
  }

  if (!Number.isInteger(blueprint.version) || blueprint.version < 1) {
    errors.push('Blueprint.version must be an integer >= 1.');
  }

  const project = blueprint.project || {};
  if (!project.name || typeof project.name !== 'string') errors.push('project.name is required (string).');
  if (!project.description || typeof project.description !== 'string') errors.push('project.description is required (string).');

  const repo = blueprint.repo || {};
  const validLayouts = ['single', 'monorepo'];
  if (!repo.layout || !validLayouts.includes(repo.layout)) {
    errors.push(`repo.layout is required and must be one of: ${validLayouts.join(', ')}`);
  }
  if (!repo.language || typeof repo.language !== 'string') {
    errors.push('repo.language is required (string).');
  }

  // Capabilities sanity checks (warn-only unless obviously inconsistent)
  const caps = blueprint.capabilities || {};
  if (caps.database && caps.database.enabled) {
    if (!caps.database.kind || typeof caps.database.kind !== 'string') warnings.push('capabilities.database.enabled=true but capabilities.database.kind is missing.');
  }
  if (caps.api && caps.api.style && typeof caps.api.style !== 'string') warnings.push('capabilities.api.style should be a string.');
  if (caps.bpmn && typeof caps.bpmn.enabled !== 'boolean') warnings.push('capabilities.bpmn.enabled should be boolean when present.');

  const skills = blueprint.skills || {};
  if (skills.packs && !Array.isArray(skills.packs)) errors.push('skills.packs must be an array of strings when present.');

  const packs = normalizePackList(skills.packs || []);
  if (!packs.includes('workflows')) warnings.push('skills.packs does not include "workflows". This is usually required.');

  const ok = errors.length === 0;
  return { ok, errors, warnings, packs };
}

function recommendedPacksFromBlueprint(blueprint) {
  const rec = new Set(['workflows']);
  const caps = blueprint.capabilities || {};
  const q = blueprint.quality || {};

  if (caps.backend && caps.backend.enabled) rec.add('backend');
  if (caps.frontend && caps.frontend.enabled) rec.add('frontend');

  if (caps.database && caps.database.enabled) rec.add('data');
  if (caps.bpmn && caps.bpmn.enabled) rec.add('diagrams');

  if ((q.ci && q.ci.enabled) || (q.devops && q.devops.containerize)) rec.add('ops');

  // Optional packs can be added explicitly via blueprint.skills.packs.

  const ordered = [];
  for (const p of packOrder()) {
    if (rec.has(p)) ordered.push(p);
  }
  return ordered;
}

function checkPackInstall(repoRoot, pack) {
  const prefix = packPrefixMap()[pack];
  if (!prefix) return { pack, installed: false, reason: 'unknown-pack' };

  const dir = path.join(repoRoot, '.ai', 'skills', prefix.replace(/\/$/, ''));
  if (!fs.existsSync(dir)) return { pack, installed: false, reason: `missing ${path.relative(repoRoot, dir)}` };
  return { pack, installed: true };
}

function printResult(result, format) {
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  // text
  if (result.summary) console.log(result.summary);
  if (result.errors && result.errors.length > 0) {
    console.log('\nErrors:');
    for (const e of result.errors) console.log(`- ${e}`);
  }
  if (result.warnings && result.warnings.length > 0) {
    console.log('\nWarnings:');
    for (const w of result.warnings) console.log(`- ${w}`);
  }
}

function checkDocs(docsRoot) {
  const errors = [];
  const warnings = [];

  const required = [
    { name: 'requirements.md', mustContain: ['# Requirements', '## Conclusions', '## Goals', '## Non-goals'] },
    { name: 'non-functional-requirements.md', mustContain: ['# Non-functional Requirements', '## Conclusions'] },
    { name: 'domain-glossary.md', mustContain: ['# Domain Glossary', '## Terms'] },
    { name: 'risk-open-questions.md', mustContain: ['# Risks and Open Questions', '## Open questions'] }
  ];

  const placeholderPatterns = [
    { re: /<[^>\n]{1,80}>/g, msg: 'template placeholder "<...>"' },
    { re: /^\s*[-*]\s*\.\.\.\s*$/gm, msg: 'placeholder bullet "- ..."' },
    { re: /:\s*\.\.\.\s*$/gm, msg: 'placeholder value ": ..."' }
  ];

  for (const spec of required) {
    const fp = path.join(docsRoot, spec.name);
    if (!fs.existsSync(fp)) {
      errors.push(`Missing required Stage A doc: ${path.relative(process.cwd(), fp)}`);
      continue;
    }
    const content = fs.readFileSync(fp, 'utf8');

    for (const needle of spec.mustContain) {
      if (!content.includes(needle)) {
        errors.push(`${spec.name} is missing required section/heading: "${needle}"`);
      }
    }

    for (const pat of placeholderPatterns) {
      const hits = content.match(pat.re);
      if (hits && hits.length > 0) {
        errors.push(`${spec.name} still contains ${pat.msg}. Replace all template placeholders.`);
      }
    }

    // Soft signals
    if (content.includes('TODO') || content.includes('FIXME')) {
      warnings.push(`${spec.name} contains TODO/FIXME markers. Ensure they are tracked in risk-open-questions.md or removed.`);
    }
    if (/\bTBD\b/i.test(content)) {
      warnings.push(`${spec.name} contains TBD items. Ensure each TBD is linked to an owner/options/decision due.`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function ensureDir(dirPath, apply) {
  if (fs.existsSync(dirPath)) return { op: 'skip', path: dirPath, reason: 'exists' };
  if (!apply) return { op: 'mkdir', path: dirPath, mode: 'dry-run' };
  fs.mkdirSync(dirPath, { recursive: true });
  return { op: 'mkdir', path: dirPath, mode: 'applied' };
}

function writeFileIfMissing(filePath, content, apply) {
  if (fs.existsSync(filePath)) return { op: 'skip', path: filePath, reason: 'exists' };
  if (!apply) return { op: 'write', path: filePath, mode: 'dry-run' };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return { op: 'write', path: filePath, mode: 'applied' };
}

function planScaffold(repoRoot, blueprint, apply) {
  const results = [];
  const repo = blueprint.repo || {};
  const caps = blueprint.capabilities || {};
  const layout = repo.layout;

  // Always ensure docs directory exists (Stage A/B will live here)
  results.push(ensureDir(path.join(repoRoot, 'docs'), apply));
  results.push(ensureDir(path.join(repoRoot, 'docs', 'project'), apply));

  if (layout === 'monorepo') {
    results.push(ensureDir(path.join(repoRoot, 'apps'), apply));
    results.push(ensureDir(path.join(repoRoot, 'packages'), apply));

    if (caps.frontend && caps.frontend.enabled) {
      results.push(ensureDir(path.join(repoRoot, 'apps', 'frontend'), apply));
      results.push(writeFileIfMissing(
        path.join(repoRoot, 'apps', 'frontend', 'README.md'),
        '# Frontend app\n\nThis folder is a scaffold placeholder. Populate it based on your selected frontend stack.\n',
        apply
      ));
    }

    if (caps.backend && caps.backend.enabled) {
      results.push(ensureDir(path.join(repoRoot, 'apps', 'backend'), apply));
      results.push(writeFileIfMissing(
        path.join(repoRoot, 'apps', 'backend', 'README.md'),
        '# Backend app\n\nThis folder is a scaffold placeholder. Populate it based on your selected backend stack.\n',
        apply
      ));
    }

    // Shared packages are optional, but commonly needed
    results.push(ensureDir(path.join(repoRoot, 'packages', 'shared'), apply));
    results.push(writeFileIfMissing(
      path.join(repoRoot, 'packages', 'shared', 'README.md'),
      '# Shared package\n\nThis folder is a scaffold placeholder for shared types/utilities.\n',
      apply
    ));
  } else {
    results.push(ensureDir(path.join(repoRoot, 'src'), apply));

    if (caps.frontend && caps.frontend.enabled) {
      results.push(ensureDir(path.join(repoRoot, 'src', 'frontend'), apply));
      results.push(writeFileIfMissing(
        path.join(repoRoot, 'src', 'frontend', 'README.md'),
        '# Frontend\n\nThis folder is a scaffold placeholder. Populate it based on your selected frontend stack.\n',
        apply
      ));
    }

    if (caps.backend && caps.backend.enabled) {
      results.push(ensureDir(path.join(repoRoot, 'src', 'backend'), apply));
      results.push(writeFileIfMissing(
        path.join(repoRoot, 'src', 'backend', 'README.md'),
        '# Backend\n\nThis folder is a scaffold placeholder. Populate it based on your selected backend stack.\n',
        apply
      ));
    }
  }

  return results;
}

function updateManifest(repoRoot, blueprint, apply) {
  // Manifest schema MUST match `.ai/scripts/sync-skills.js`:
  // {
  //   "version": 1,
  //   "includePrefixes": ["workflows/"],
  //   "includeSkills": [],
  //   "excludeSkills": []
  // }
  const manifestPath = path.join(repoRoot, '.ai', 'skills', '_meta', 'sync-manifest.json');
  const prefixMap = packPrefixMap();

  const skills = blueprint.skills || {};
  const packs = normalizePackList(skills.packs || []);

  // Backward-compatible aliases (some blueprints may use these names).
  const includeSkills = uniq([
    ...toStringArray(skills.includeSkills),
    ...toStringArray(skills.includeSkillNames),
  ]);
  const excludeSkills = uniq([
    ...toStringArray(skills.excludeSkills),
    ...toStringArray(skills.excludeSkillNames),
  ]);

  const includePrefixes = [];
  const warnings = [];

  for (const p of packs) {
    const pref = prefixMap[p];
    if (!pref) {
      warnings.push(`Unknown pack "${p}" (no prefix mapping). Ignoring.`);
      continue;
    }
    includePrefixes.push(pref);
  }

  if (Array.isArray(skills.excludePrefixes) && skills.excludePrefixes.length > 0) {
    warnings.push('skills.excludePrefixes is not supported by the current manifest schema. Use skills.excludeSkills instead.');
  }

  const manifest = {
    version: 1,
    includePrefixes: uniq(includePrefixes),
    includeSkills,
    excludeSkills,
  };

  if (!apply) return { op: 'write', path: manifestPath, mode: 'dry-run', warnings, manifest };

  writeJson(manifestPath, manifest);
  return { op: 'write', path: manifestPath, mode: 'applied', warnings, manifest };
}


function contextAddonRequested(blueprint) {
  // Minimal-intrusion hook:
  // - default: disabled (no repo changes)
  // - enable by setting: blueprint.context.enabled = true
  const ctx = blueprint && blueprint.context ? blueprint.context : null;
  if (ctx && typeof ctx.enabled === 'boolean') return ctx.enabled;

  // Backward-compatible aliases (optional):
  const addons = blueprint && blueprint.addons ? blueprint.addons : null;
  if (addons && typeof addons.contextAwareness === 'boolean') return addons.contextAwareness;
  if (Array.isArray(addons) && addons.includes('context-awareness')) return true;

  return false;
}

function copyFileIfMissing(srcPath, dstPath, apply) {
  if (fs.existsSync(dstPath)) return { op: 'skip', path: dstPath, reason: 'exists' };
  if (!apply) return { op: 'copy', path: dstPath, mode: 'dry-run', src: srcPath };
  fs.mkdirSync(path.dirname(dstPath), { recursive: true });
  fs.copyFileSync(srcPath, dstPath);
  return { op: 'copy', path: dstPath, mode: 'applied', src: srcPath };
}

function listFilesRecursive(dirPath) {
  const out = [];
  if (!fs.existsSync(dirPath)) return out;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dirPath, e.name);
    if (e.isDirectory()) out.push(...listFilesRecursive(p));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

function copyTreeIfMissing(srcRoot, dstRoot, apply) {
  const plan = [];
  const files = listFilesRecursive(srcRoot);
  for (const f of files) {
    const rel = path.relative(srcRoot, f);
    const dst = path.join(dstRoot, rel);
    plan.push(copyFileIfMissing(f, dst, apply));
  }
  return plan;
}

function installContextAwarenessAddon(repoRoot, apply) {
  const payloadRoot = path.join(repoRoot, 'addons', 'context-awareness', 'payload');
  if (!fs.existsSync(payloadRoot)) {
    return { op: 'install-addon', mode: 'skipped', reason: 'payload not found', plan: [] };
  }

  const plan = [];
  const srcAi = path.join(payloadRoot, '.ai');
  const srcDocs = path.join(payloadRoot, 'docs');

  if (fs.existsSync(srcAi)) plan.push(...copyTreeIfMissing(srcAi, path.join(repoRoot, '.ai'), apply));
  if (fs.existsSync(srcDocs)) plan.push(...copyTreeIfMissing(srcDocs, path.join(repoRoot, 'docs'), apply));

  return { op: 'install-addon', mode: apply ? 'applied' : 'dry-run', addon: 'context-awareness', payloadRoot, plan };
}

function enablePackWithSkillsctl(repoRoot, providers, packId, apply) {
  const scriptPath = path.join(repoRoot, '.ai', 'scripts', 'skillsctl.js');
  if (!fs.existsSync(scriptPath)) {
    return { op: 'run', mode: 'skipped', reason: 'skillsctl.js not installed', cmd: null };
  }

  const providersArg = providers || 'both';
  const cmd = 'node';
  const args = [scriptPath, 'enable-pack', packId, '--providers', providersArg, '--no-sync'];

  if (!apply) return { op: 'run', cmd: `${cmd} ${args.join(' ')}`, mode: 'dry-run' };

  const res = childProcess.spawnSync(cmd, args, { stdio: 'inherit', cwd: repoRoot });
  if (res.status !== 0) {
    return { op: 'run', cmd: `${cmd} ${args.join(' ')}`, mode: 'failed', exitCode: res.status };
  }
  return { op: 'run', cmd: `${cmd} ${args.join(' ')}`, mode: 'applied' };
}

function syncWrappers(repoRoot, providers, apply) {
  const scriptPath = path.join(repoRoot, '.ai', 'scripts', 'sync-skills.js');
  if (!fs.existsSync(scriptPath)) {
    return { op: 'skip', path: scriptPath, reason: 'sync-skills.js not found' };
  }
  const providersArg = providers || 'both';
  const cmd = 'node';
  const args = [scriptPath, '--scope', 'current', '--providers', providersArg];

  if (!apply) return { op: 'run', cmd: `${cmd} ${args.join(' ')}`, mode: 'dry-run' };

  const res = childProcess.spawnSync(cmd, args, { stdio: 'inherit', cwd: repoRoot });
  if (res.status !== 0) {
    return { op: 'run', cmd: `${cmd} ${args.join(' ')}`, mode: 'failed', exitCode: res.status };
  }
  return { op: 'run', cmd: `${cmd} ${args.join(' ')}`, mode: 'applied' };
}

function cleanupInit(repoRoot, apply) {
  const initDir = path.join(repoRoot, 'init');
  const marker = path.join(initDir, '.init-kit');

  if (!fs.existsSync(initDir)) return { op: 'skip', path: initDir, reason: 'init/ not present' };
  if (!fs.existsSync(marker)) return { op: 'refuse', path: initDir, reason: 'missing init/.init-kit marker' };

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const trashDir = path.join(repoRoot, `.init-trash-${ts}`);

  if (!apply) {
    return { op: 'rm', path: initDir, mode: 'dry-run', note: `will move to ${path.basename(trashDir)} then delete` };
  }

  // Move first (reduces risk if delete fails on Windows due to open file handles)
  fs.renameSync(initDir, trashDir);

  try {
    fs.rmSync(trashDir, { recursive: true, force: true });
    return { op: 'rm', path: initDir, mode: 'applied' };
  } catch (e) {
    return {
      op: 'rm',
      path: initDir,
      mode: 'partial',
      note: `renamed to ${path.basename(trashDir)} but could not delete automatically: ${e.message}`
    };
  }
}

function main() {
  const { command, opts } = parseArgs(process.argv);
  const format = (opts['format'] || 'text').toLowerCase();

  const repoRoot = path.resolve(opts['repo-root'] || process.cwd());
  const blueprintPath = resolvePath(repoRoot, opts['blueprint']);
  const docsRoot = resolvePath(repoRoot, opts['docs-root'] || path.join('docs', 'project'));

  if (command === 'validate') {
    if (!blueprintPath) die('[error] --blueprint is required for validate');
    const blueprint = readJson(blueprintPath);
    const v = validateBlueprint(blueprint);

    const result = {
      ok: v.ok,
      packs: v.packs,
      errors: v.errors,
      warnings: v.warnings,
      summary: v.ok
        ? `[ok] Blueprint is valid: ${path.relative(repoRoot, blueprintPath)}`
        : `[error] Blueprint validation failed: ${path.relative(repoRoot, blueprintPath)}`
    };
    printResult(result, format);
    process.exit(v.ok ? 0 : 1);
  }

  if (command === 'check-docs') {
    const strict = !!opts['strict'];
    const res = checkDocs(docsRoot);

    const ok = res.ok && (!strict || res.warnings.length === 0);
    const summary = ok
      ? `[ok] Stage A docs check passed: ${path.relative(repoRoot, docsRoot)}`
      : `[error] Stage A docs check failed: ${path.relative(repoRoot, docsRoot)}`;

    printResult({ ok, errors: res.errors, warnings: res.warnings, summary }, format);
    process.exit(ok ? 0 : 1);
  }

  if (command === 'suggest-packs') {
    if (!blueprintPath) die('[error] --blueprint is required for suggest-packs');
    const blueprint = readJson(blueprintPath);

    const v = validateBlueprint(blueprint);
    const rec = recommendedPacksFromBlueprint(blueprint);
    const current = normalizePackList((blueprint.skills && blueprint.skills.packs) || []);
    const missing = rec.filter((p) => !current.includes(p));
    const extra = current.filter((p) => !rec.includes(p));

    const installChecks = rec.map((p) => checkPackInstall(repoRoot, p)).filter((x) => !x.installed);
    const warnings = [];
    for (const c of installChecks) warnings.push(`Recommended pack "${c.pack}" is not installed (${c.reason}).`);

    const result = {
      ok: v.ok,
      recommended: rec,
      current,
      missing,
      extra,
      warnings,
      errors: v.errors,
      summary: `[info] Packs: current=${current.join(', ') || '(none)'} | recommended=${rec.join(', ')}`
    };

    if (opts['write']) {
      if (!v.ok) die('[error] Cannot write packs: blueprint validation failed.');
      const next = normalizePackList([...current, ...missing]);
      blueprint.skills = blueprint.skills || {};
      blueprint.skills.packs = next;
      writeJson(blueprintPath, blueprint);
      result.wrote = { path: path.relative(repoRoot, blueprintPath), packs: next };
      result.summary += `\n[write] Added missing recommended packs into blueprint.skills.packs`;
    }

    printResult(result, format);
    process.exit(v.ok ? 0 : 1);
  }

  if (command === 'scaffold') {
    if (!blueprintPath) die('[error] --blueprint is required for scaffold');
    const apply = !!opts['apply'];
    const blueprint = readJson(blueprintPath);

    const v = validateBlueprint(blueprint);
    if (!v.ok) die('[error] Blueprint is not valid; refusing to scaffold.');

    const plan = planScaffold(repoRoot, blueprint, apply);
    const summary = apply
      ? `[ok] Scaffold applied under repo root: ${repoRoot}`
      : `[plan] Scaffold dry-run under repo root: ${repoRoot}`;

    if (format === 'json') {
      console.log(JSON.stringify({ ok: true, summary, plan }, null, 2));
    } else {
      console.log(summary);
      for (const item of plan) {
        const mode = item.mode ? ` (${item.mode})` : '';
        const reason = item.reason ? ` [${item.reason}]` : '';
        console.log(`- ${item.op}: ${path.relative(repoRoot, item.path || '')}${mode}${reason}`);
      }
    }
    process.exit(0);
  }

  if (command === 'apply') {
    if (!blueprintPath) die('[error] --blueprint is required for apply');
    const providers = opts['providers'] || 'both';
    const requireStageA = !!opts['require-stage-a'];
    const cleanup = !!opts['cleanup-init'];

    if (cleanup && !opts['i-understand']) {
      die('[error] --cleanup-init requires --i-understand');
    }

    const blueprint = readJson(blueprintPath);

    // Validate blueprint
    const v = validateBlueprint(blueprint);
    if (!v.ok) die('[error] Blueprint validation failed. Fix errors and re-run.');

    // Stage A docs check (strict only when explicitly required)
    const stageARes = checkDocs(docsRoot);
    if (requireStageA) {
      const strictOk = stageARes.ok && stageARes.warnings.length === 0;
      if (!strictOk) die('[error] Stage A docs check failed in strict mode. Fix docs and re-run.');
    }

    // Suggest packs (warn-only)
    const rec = recommendedPacksFromBlueprint(blueprint);
    const current = normalizePackList((blueprint.skills && blueprint.skills.packs) || []);
    const missing = rec.filter((p) => !current.includes(p));
    if (missing.length > 0) {
      console.warn(`[warn] Blueprint.skills.packs is missing recommended packs: ${missing.join(', ')}`);
      console.warn(`[warn] Run: suggest-packs --blueprint ${path.relative(repoRoot, blueprintPath)} --write  (or edit blueprint.skills.packs manually)`);
    }

    // Scaffold
    const scaffoldPlan = planScaffold(repoRoot, blueprint, true);

    // Manifest update
    const manifestResult = updateManifest(repoRoot, blueprint, true);
    if (manifestResult.warnings && manifestResult.warnings.length > 0) {
      for (const w of manifestResult.warnings) console.warn(`[warn] ${w}`);
    }

    // Optional context-awareness add-on (minimal-intrusion; opt-in)
    const contextEnabled = contextAddonRequested(blueprint);
    let ctxInstallResult = null;
    let ctxPackResult = null;

    if (contextEnabled) {
      console.log('[info] Installing context-awareness add-on (blueprint.context.enabled=true)');
      ctxInstallResult = installContextAwarenessAddon(repoRoot, true);

      if (ctxInstallResult.mode === 'skipped') die('[error] Context add-on requested but payload is missing: addons/context-awareness/payload/');

      const copied = (ctxInstallResult.plan || []).filter((p) => p.op === 'copy' && p.mode === 'applied').length;
      const skipped = (ctxInstallResult.plan || []).filter((p) => p.op === 'skip').length;
      console.log(`[info] context-awareness add-on: copied=${copied}, skipped=${skipped}`);

      // Enable the context pack so the new scaffold skills are discoverable.
      ctxPackResult = enablePackWithSkillsctl(repoRoot, providers, 'context-core', true);
      if (ctxPackResult.mode === 'failed') die('[error] skillsctl enable-pack context-core failed.');
      if (ctxPackResult.mode === 'skipped') {
        console.warn('[warn] skillsctl.js not installed; add-on installed but pack not enabled.');
      }
    }


    // Sync wrappers
    const syncResult = syncWrappers(repoRoot, providers, true);
    if (syncResult.mode === 'failed') die(`[error] sync-skills.js failed with exit code ${syncResult.exitCode}`);

    // Optional cleanup
    let cleanupResult = null;
    if (cleanup) {
      cleanupResult = cleanupInit(repoRoot, true);
      if (cleanupResult.mode === 'partial') {
        console.warn(`[warn] cleanup-init partially completed: ${cleanupResult.note}`);
      }
    }

    if (format === 'json') {
      console.log(JSON.stringify({
        ok: true,
        blueprint: path.relative(repoRoot, blueprintPath),
        docsRoot: path.relative(repoRoot, docsRoot),
        stageA: stageARes,
        scaffold: scaffoldPlan,
        manifest: manifestResult,
        sync: syncResult,
        cleanup: cleanupResult
      }, null, 2));
    } else {
      console.log('[ok] Apply completed.');
      console.log(`- Blueprint: ${path.relative(repoRoot, blueprintPath)}`);
      console.log(`- Docs root: ${path.relative(repoRoot, docsRoot)}`);
      if (!stageARes.ok) console.log('[warn] Stage A docs check had errors; consider re-running with --require-stage-a.');
      if (stageARes.warnings.length > 0) console.log('[warn] Stage A docs check has warnings; ensure TBD/TODO items are tracked.');
      console.log(`- Manifest updated: ${path.relative(repoRoot, manifestResult.path)}`);
      console.log(`- Wrappers synced via: ${syncResult.cmd || '(skipped)'}`);
      if (cleanupResult) console.log(`- init/ cleanup: ${cleanupResult.mode}`);
    }

    process.exit(0);
  }

  if (command === 'cleanup-init') {
    if (!opts['i-understand']) die('[error] cleanup-init requires --i-understand');
    const apply = !!opts['apply'];

    const res = cleanupInit(repoRoot, apply);
    if (format === 'json') {
      console.log(JSON.stringify({ ok: true, result: res }, null, 2));
    } else {
      if (!apply) {
        console.log(`[plan] ${res.op}: ${path.relative(repoRoot, res.path || '')} (${res.mode})`);
        if (res.note) console.log(`Note: ${res.note}`);
      } else {
        console.log(`[ok] ${res.op}: ${path.relative(repoRoot, res.path || '')} (${res.mode})`);
        if (res.note) console.log(`Note: ${res.note}`);
      }
    }
    process.exit(0);
  }

  usage(1);
}

main();
