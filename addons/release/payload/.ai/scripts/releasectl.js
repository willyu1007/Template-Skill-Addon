#!/usr/bin/env node
/**
 * releasectl.js - Release Management
 *
 * Manages version and changelog for releases.
 *
 * Commands:
 *   init        Initialize release configuration (idempotent)
 *   prepare     Prepare a new release
 *   changelog   Generate changelog
 *   tag         Create release tag
 *   status      Show release status
 *   verify      Verify release configuration
 *   help        Show this help message
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const RELEASE_DIR = 'release';
const CONFIG_FILE = 'release/config.json';
const WORKDOCS_DIR = 'release/workdocs';

const SUPPORTED_STRATEGIES = ['semantic', 'calendar', 'manual'];

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
  return resolve(__dirname, '..', '..');
}

function isoNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function today() {
  return new Date().toISOString().split('T')[0];
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

function loadConfig(repoRoot) {
  return loadJson(join(repoRoot, CONFIG_FILE));
}

function saveConfig(repoRoot, config) {
  config.updatedAt = isoNow();
  saveJson(join(repoRoot, CONFIG_FILE), config);
}

function runGit(cmd, repoRoot) {
  try {
    return execSync(`git ${cmd}`, { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

function getLatestTag(repoRoot) {
  return runGit('describe --tags --abbrev=0 2>/dev/null', repoRoot);
}

function getCommitsSince(repoRoot, since) {
  const range = since ? `${since}..HEAD` : 'HEAD';
  const log = runGit(`log ${range} --pretty=format:"%h|%s|%an" 2>/dev/null`, repoRoot);
  if (!log) return [];
  
  return log.split('\n').filter(Boolean).map(line => {
    const [hash, subject, author] = line.split('|');
    return { hash, subject, author };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

function cmdInit(repoRoot, flags) {
  const { strategy = 'semantic' } = flags;

  if (!SUPPORTED_STRATEGIES.includes(strategy)) {
    console.error(`Error: Unsupported strategy "${strategy}".`);
    console.error(`Supported: ${SUPPORTED_STRATEGIES.join(', ')}`);
    return 1;
  }

  console.log(`Initializing release management at ${repoRoot}...`);
  let created = false;

  // Create directories
  const dirs = [RELEASE_DIR, WORKDOCS_DIR];
  for (const dir of dirs) {
    const fullPath = join(repoRoot, dir);
    if (ensureDir(fullPath)) {
      console.log(`  Created: ${dir}/`);
      created = true;
    }
  }

  // Create config file
  const configPath = join(repoRoot, CONFIG_FILE);
  if (!existsSync(configPath)) {
    const initialConfig = {
      version: 1,
      updatedAt: isoNow(),
      strategy,
      currentVersion: '0.0.0',
      changelog: true,
      branches: {
        main: 'main',
        develop: 'develop'
      }
    };
    saveJson(configPath, initialConfig);
    console.log(`  Created: ${CONFIG_FILE}`);
    created = true;
  }

  // Create AGENTS.md
  const agentsPath = join(repoRoot, RELEASE_DIR, 'AGENTS.md');
  if (!existsSync(agentsPath)) {
    const agentsContent = `# Release Management - AI Guidance

## Conclusions (read first)

- Use \`releasectl.js\` for all release operations.
- Strategy: ${strategy}
- AI proposes releases; humans approve and execute.

## Workflow

1. **Prepare** release: \`releasectl prepare --version <version>\`
2. **Generate** changelog: \`releasectl changelog\`
3. **Request human** approval
4. **Tag** release: \`releasectl tag --version <version>\`

## Version Format

${strategy === 'semantic' ? `- Semantic: major.minor.patch (e.g., 1.2.3)
- Breaking changes: major++
- New features: minor++
- Bug fixes: patch++` : ''}
${strategy === 'calendar' ? `- Calendar: YYYY.MM.DD (e.g., 2024.01.15)` : ''}

## Forbidden Actions

- Direct version bumps without changelog
- Skipping release approval
- Tagging without verification
`;
    writeFileSync(agentsPath, agentsContent);
    console.log(`  Created: ${RELEASE_DIR}/AGENTS.md`);
    created = true;
  }

  // Create changelog template
  const changelogPath = join(repoRoot, RELEASE_DIR, 'changelog-template.md');
  if (!existsSync(changelogPath)) {
    const changelogContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security-related changes
`;
    writeFileSync(changelogPath, changelogContent);
    console.log(`  Created: ${RELEASE_DIR}/changelog-template.md`);
    created = true;
  }

  // Create .releaserc.json.template
  const releasercPath = join(repoRoot, '.releaserc.json.template');
  if (!existsSync(releasercPath)) {
    const releasercContent = {
      branches: ['main'],
      plugins: [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/changelog',
        '@semantic-release/npm',
        '@semantic-release/git',
        '@semantic-release/github'
      ]
    };
    saveJson(releasercPath, releasercContent);
    console.log(`  Created: .releaserc.json.template`);
    created = true;
  }

  // Create workdocs
  const workdocsReadme = join(repoRoot, WORKDOCS_DIR, 'release-checklist.md');
  if (!existsSync(workdocsReadme)) {
    const checklistContent = `# Release Checklist

## Pre-Release

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG updated
- [ ] Version bumped
- [ ] Dependencies updated

## Release

- [ ] Tag created
- [ ] Release notes written
- [ ] Artifacts built
- [ ] Published to registry

## Post-Release

- [ ] Announce release
- [ ] Update project board
- [ ] Close milestone
`;
    writeFileSync(workdocsReadme, checklistContent);
    console.log(`  Created: ${WORKDOCS_DIR}/release-checklist.md`);
    created = true;
  }

  if (!created) {
    console.log('  Release management already initialized (no changes).');
  }

  console.log('Done.');
  return 0;
}

function cmdPrepare(repoRoot, flags) {
  const { version } = flags;

  if (!version) {
    console.error('Error: --version is required.');
    return 1;
  }

  // Validate version format
  if (!/^\d+\.\d+\.\d+(-\w+)?$/.test(version)) {
    console.error('Error: Invalid version format. Expected: x.y.z or x.y.z-suffix');
    return 1;
  }

  const config = loadConfig(repoRoot);
  if (!config) {
    console.error('Error: Config not found. Run `releasectl init` first.');
    return 1;
  }

  console.log(`\n📦 Preparing Release v${version}`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`Current version: ${config.currentVersion}`);
  console.log(`New version:     ${version}`);
  console.log(`Strategy:        ${config.strategy}`);
  console.log(`${'─'.repeat(40)}`);

  // Update config
  config.pendingVersion = version;
  config.preparedAt = isoNow();
  saveConfig(repoRoot, config);

  console.log(`\n✅ Release prepared.`);
  console.log(`\nNext steps:`);
  console.log(`1. Generate changelog: node .ai/scripts/releasectl.js changelog`);
  console.log(`2. Review and approve changes`);
  console.log(`3. Tag release: node .ai/scripts/releasectl.js tag --version ${version}`);

  return 0;
}

function cmdChangelog(repoRoot, flags) {
  const { from, to = 'HEAD' } = flags;

  const config = loadConfig(repoRoot);
  const latestTag = from || getLatestTag(repoRoot);
  const commits = getCommitsSince(repoRoot, latestTag);

  console.log(`\n📝 Changelog`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`From: ${latestTag || 'beginning'}`);
  console.log(`To:   ${to}`);
  console.log(`${'─'.repeat(40)}`);

  if (commits.length === 0) {
    console.log('\nNo commits found in range.');
    return 0;
  }

  // Categorize commits by conventional commit type
  const categories = {
    feat: { title: 'Features', items: [] },
    fix: { title: 'Bug Fixes', items: [] },
    docs: { title: 'Documentation', items: [] },
    refactor: { title: 'Refactoring', items: [] },
    other: { title: 'Other Changes', items: [] }
  };

  for (const commit of commits) {
    const match = commit.subject.match(/^(\w+)(\(.+\))?:\s*(.+)/);
    if (match) {
      const type = match[1];
      const message = match[3];
      if (categories[type]) {
        categories[type].items.push({ ...commit, message });
      } else {
        categories.other.items.push({ ...commit, message: commit.subject });
      }
    } else {
      categories.other.items.push({ ...commit, message: commit.subject });
    }
  }

  console.log(`\n## [${config?.pendingVersion || 'Unreleased'}] - ${today()}\n`);

  for (const [key, cat] of Object.entries(categories)) {
    if (cat.items.length > 0) {
      console.log(`### ${cat.title}\n`);
      for (const item of cat.items) {
        console.log(`- ${item.message} (${item.hash})`);
      }
      console.log();
    }
  }

  return 0;
}

function cmdTag(repoRoot, flags) {
  const { version } = flags;

  if (!version) {
    console.error('Error: --version is required.');
    return 1;
  }

  const config = loadConfig(repoRoot);
  if (!config) {
    console.error('Error: Config not found.');
    return 1;
  }

  console.log(`\n🏷️  Creating Tag v${version}`);
  console.log(`${'─'.repeat(40)}`);

  console.log(`\n⚠️  Tag creation requires git access.`);
  console.log(`\nTo create tag manually:`);
  console.log(`\ngit tag -a v${version} -m "Release v${version}"`);
  console.log(`git push origin v${version}`);

  // Update config
  config.currentVersion = version;
  config.pendingVersion = null;
  config.lastReleasedAt = isoNow();
  saveConfig(repoRoot, config);

  console.log(`\n✅ Configuration updated.`);
  return 0;
}

function cmdStatus(repoRoot) {
  const config = loadConfig(repoRoot);
  if (!config) {
    console.log('Release management not configured.');
    console.log('Run: node .ai/scripts/releasectl.js init');
    return 0;
  }

  const latestTag = getLatestTag(repoRoot);
  const commits = getCommitsSince(repoRoot, latestTag);

  console.log(`\n📊 Release Status`);
  console.log(`${'─'.repeat(40)}`);
  console.log(`Strategy:         ${config.strategy}`);
  console.log(`Current version:  ${config.currentVersion}`);
  console.log(`Pending version:  ${config.pendingVersion || 'none'}`);
  console.log(`Latest tag:       ${latestTag || 'none'}`);
  console.log(`Commits since:    ${commits.length}`);
  console.log(`Last released:    ${config.lastReleasedAt || 'never'}`);
  console.log(`${'─'.repeat(40)}`);

  return 0;
}

function cmdVerify(repoRoot) {
  const config = loadConfig(repoRoot);
  if (!config) {
    console.error('Error: Config not found.');
    return 1;
  }

  console.log('Verifying release configuration...');
  let errors = 0;

  // Check strategy
  if (!SUPPORTED_STRATEGIES.includes(config.strategy)) {
    console.error(`  ERROR: Invalid strategy: ${config.strategy}`);
    errors++;
  } else {
    console.log(`  OK: Strategy = ${config.strategy}`);
  }

  // Check version format
  if (config.currentVersion && !/^\d+\.\d+\.\d+/.test(config.currentVersion)) {
    console.error(`  ERROR: Invalid current version: ${config.currentVersion}`);
    errors++;
  } else {
    console.log(`  OK: Current version = ${config.currentVersion}`);
  }

  // Check git
  const inGit = runGit('rev-parse --git-dir', repoRoot);
  if (inGit) {
    console.log(`  OK: Git repository detected`);
  } else {
    console.warn(`  Warning: Not a git repository`);
  }

  if (errors > 0) {
    console.error(`\nVerification FAILED: ${errors} error(s).`);
    return 1;
  }

  console.log('\nVerification passed.');
  return 0;
}

function cmdHelp() {
  console.log(`
releasectl.js - Release Management

Usage: node .ai/scripts/releasectl.js <command> [options]

Commands:
  init            Initialize release configuration (idempotent)
    --strategy <s>  Version strategy: semantic, calendar, manual (default: semantic)
    
  prepare         Prepare a new release
    --version <v>   Version to release (required)
    
  changelog       Generate changelog
    --from <ref>    Starting reference (default: latest tag)
    --to <ref>      Ending reference (default: HEAD)
    
  tag             Create release tag
    --version <v>   Version to tag (required)
    
  status          Show release status
  
  verify          Verify release configuration
  
  help            Show this help message

Global Options:
  --repo-root <path>  Repository root (default: auto-detect)

Examples:
  node .ai/scripts/releasectl.js init --strategy semantic
  node .ai/scripts/releasectl.js prepare --version 1.2.0
  node .ai/scripts/releasectl.js changelog
  node .ai/scripts/releasectl.js tag --version 1.2.0
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
      return cmdInit(repoRoot, parsed.flags);
    case 'prepare':
      return cmdPrepare(repoRoot, parsed.flags);
    case 'changelog':
      return cmdChangelog(repoRoot, parsed.flags);
    case 'tag':
      return cmdTag(repoRoot, parsed.flags);
    case 'status':
      return cmdStatus(repoRoot);
    case 'verify':
      return cmdVerify(repoRoot);
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

