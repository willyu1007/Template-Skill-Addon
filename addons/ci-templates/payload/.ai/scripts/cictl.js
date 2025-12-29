#!/usr/bin/env node
/**
 * cictl.js
 *
 * CI/CD configuration management for the ci-templates add-on.
 *
 * Commands:
 *   init              Initialize CI configuration (idempotent)
 *   list              List available CI templates
 *   apply             Apply a CI template
 *   verify            Verify CI configuration
 *   status            Show current CI status
 */

import fs from 'node:fs';
import path from 'node:path';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function usage(exitCode = 0) {
  const msg = `
Usage:
  node .ai/scripts/cictl.js <command> [options]

Commands:
  init
    --repo-root <path>          Repo root (default: cwd)
    --dry-run                   Show what would be created
    Initialize CI configuration skeleton.

  list
    --repo-root <path>          Repo root (default: cwd)
    --format <text|json>        Output format (default: text)
    List available CI templates.

  apply
    --template <string>         Template to apply (required)
    --repo-root <path>          Repo root (default: cwd)
    --force                     Overwrite existing files
    Apply a CI template.

  verify
    --repo-root <path>          Repo root (default: cwd)
    Verify CI configuration.

  status
    --repo-root <path>          Repo root (default: cwd)
    --format <text|json>        Output format (default: text)
    Show current CI status.

Examples:
  node .ai/scripts/cictl.js init
  node .ai/scripts/cictl.js list
  node .ai/scripts/cictl.js apply --template github-actions
  node .ai/scripts/cictl.js verify
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
    }
  }

  return { command, opts };
}

// ============================================================================
// File Utilities
// ============================================================================

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return { op: 'mkdir', path: dirPath };
  }
  return { op: 'skip', path: dirPath, reason: 'exists' };
}

function writeFileIfMissing(filePath, content) {
  if (fs.existsSync(filePath)) {
    return { op: 'skip', path: filePath, reason: 'exists' };
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return { op: 'write', path: filePath };
}

// ============================================================================
// CI Management
// ============================================================================

function getCiDir(repoRoot) {
  return path.join(repoRoot, 'ci');
}

function getConfigPath(repoRoot) {
  return path.join(getCiDir(repoRoot), 'config.json');
}

function loadConfig(repoRoot) {
  return readJson(getConfigPath(repoRoot)) || {
    version: 1,
    provider: null,
    templates: []
  };
}

function saveConfig(repoRoot, config) {
  writeJson(getConfigPath(repoRoot), config);
}

const TEMPLATES = {
  'github-actions': {
    name: 'GitHub Actions',
    files: ['.github/workflows/ci.yml'],
    description: 'GitHub Actions CI/CD workflow'
  },
  'gitlab-ci': {
    name: 'GitLab CI',
    files: ['.gitlab-ci.yml'],
    description: 'GitLab CI/CD pipeline'
  },
  'azure-pipelines': {
    name: 'Azure Pipelines',
    files: ['azure-pipelines.yml'],
    description: 'Azure DevOps pipeline'
  }
};

// ============================================================================
// Commands
// ============================================================================

function cmdInit(repoRoot, dryRun) {
  const ciDir = getCiDir(repoRoot);
  const actions = [];

  // Create directories
  const dirs = [ciDir, path.join(ciDir, 'workdocs')];
  for (const dir of dirs) {
    if (dryRun) {
      actions.push({ op: 'mkdir', path: dir, mode: 'dry-run' });
    } else {
      actions.push(ensureDir(dir));
    }
  }

  // Create config
  const configPath = getConfigPath(repoRoot);
  if (!fs.existsSync(configPath) && !dryRun) {
    saveConfig(repoRoot, { version: 1, provider: null, templates: [] });
    actions.push({ op: 'write', path: configPath });
  } else if (dryRun) {
    actions.push({ op: 'write', path: configPath, mode: 'dry-run' });
  }

  // Create AGENTS.md
  const agentsPath = path.join(ciDir, 'AGENTS.md');
  const agentsContent = `# CI Configuration (LLM-first)

## Commands

\`\`\`bash
node .ai/scripts/cictl.js list      # List templates
node .ai/scripts/cictl.js apply --template github-actions
node .ai/scripts/cictl.js verify
\`\`\`

## Guidelines

- Edit templates in \`ci/\`, not provider-specific files directly
- Use \`cictl apply\` to generate provider configurations
`;

  if (dryRun) {
    actions.push({ op: 'write', path: agentsPath, mode: 'dry-run' });
  } else {
    actions.push(writeFileIfMissing(agentsPath, agentsContent));
  }

  console.log('[ok] CI configuration initialized.');
  for (const a of actions) {
    const mode = a.mode ? ` (${a.mode})` : '';
    const reason = a.reason ? ` [${a.reason}]` : '';
    console.log(`  ${a.op}: ${path.relative(repoRoot, a.path)}${mode}${reason}`);
  }
}

function cmdList(repoRoot, format) {
  if (format === 'json') {
    console.log(JSON.stringify({ templates: TEMPLATES }, null, 2));
    return;
  }

  console.log('Available CI Templates:\n');
  for (const [id, tmpl] of Object.entries(TEMPLATES)) {
    console.log(`  ${id}`);
    console.log(`    ${tmpl.description}`);
    console.log(`    Files: ${tmpl.files.join(', ')}`);
    console.log('');
  }
}

function cmdApply(repoRoot, template, force) {
  if (!template) die('[error] --template is required');
  if (!TEMPLATES[template]) die(`[error] Unknown template: ${template}`);

  const tmpl = TEMPLATES[template];
  const config = loadConfig(repoRoot);

  console.log(`[info] Applying template: ${tmpl.name}`);
  console.log('[info] Template files would be created at:');
  for (const file of tmpl.files) {
    console.log(`  - ${file}`);
  }

  config.provider = template;
  config.templates.push({ id: template, appliedAt: new Date().toISOString() });
  saveConfig(repoRoot, config);

  console.log(`\n[ok] Template "${template}" applied.`);
  console.log('[info] Note: Actual workflow files need to be created manually or from template.');
}

function cmdVerify(repoRoot) {
  const config = loadConfig(repoRoot);
  const errors = [];
  const warnings = [];

  if (!config.provider) {
    warnings.push('No CI provider configured. Run: cictl apply --template <name>');
  }

  if (!fs.existsSync(getCiDir(repoRoot))) {
    errors.push('ci/ directory not found. Run: cictl init');
  }

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const e of errors) console.log(`  - ${e}`);
  }
  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const w of warnings) console.log(`  - ${w}`);
  }

  const ok = errors.length === 0;
  console.log(ok ? '[ok] CI configuration verified.' : '[error] CI verification failed.');
  process.exit(ok ? 0 : 1);
}

function cmdStatus(repoRoot, format) {
  const config = loadConfig(repoRoot);
  const status = {
    initialized: fs.existsSync(getCiDir(repoRoot)),
    provider: config.provider,
    templates: config.templates || []
  };

  if (format === 'json') {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log('CI Status:');
  console.log(`  Initialized: ${status.initialized ? 'yes' : 'no'}`);
  console.log(`  Provider: ${status.provider || '(none)'}`);
  console.log(`  Applied templates: ${status.templates.length}`);
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const { command, opts } = parseArgs(process.argv);
  const repoRoot = path.resolve(opts['repo-root'] || process.cwd());
  const format = (opts['format'] || 'text').toLowerCase();

  switch (command) {
    case 'init':
      cmdInit(repoRoot, !!opts['dry-run']);
      break;
    case 'list':
      cmdList(repoRoot, format);
      break;
    case 'apply':
      cmdApply(repoRoot, opts['template'], !!opts['force']);
      break;
    case 'verify':
      cmdVerify(repoRoot);
      break;
    case 'status':
      cmdStatus(repoRoot, format);
      break;
    default:
      console.error(`[error] Unknown command: ${command}`);
      usage(1);
  }
}

main();
