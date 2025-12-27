#!/usr/bin/env node
/**
 * contextctl.js - Context Registry Management Script
 *
 * Manages the docs/context/ directory and registry.json for project context artifacts.
 * Also manages environment configuration registry.
 *
 * Commands:
 *   init              Initialize context directory structure (idempotent)
 *   add-artifact      Register a new artifact in registry.json
 *   remove-artifact   Remove an artifact from registry.json
 *   touch             Update checksums for all registered artifacts
 *   verify            Verify registry consistency
 *   list              List all registered artifacts
 *   add-env           Add an environment to the environment registry
 *   list-envs         List all registered environments
 *   verify-config     Verify environment configuration
 *   help              Show this help message
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const CONTEXT_DIR = 'docs/context';
const REGISTRY_FILE = 'docs/context/registry.json';
const INDEX_FILE = 'docs/context/INDEX.md';
const REGISTRY_SCHEMA_FILE = 'docs/context/registry.schema.json';
const ENV_REGISTRY_FILE = 'docs/context/config/environment-registry.json';
const CONFIG_DIR = 'config';
const CONFIG_ENVS_DIR = 'config/environments';

const DEFAULT_SUBDIRS = ['api', 'db', 'process', 'config'];

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
  // Default: assume script is at .ai/scripts/contextctl.js
  return resolve(__dirname, '..', '..');
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function isoNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function loadRegistry(repoRoot) {
  const registryPath = join(repoRoot, REGISTRY_FILE);
  if (!existsSync(registryPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(registryPath, 'utf8'));
  } catch (e) {
    console.error(`Error reading registry: ${e.message}`);
    return null;
  }
}

function saveRegistry(repoRoot, registry) {
  const registryPath = join(repoRoot, REGISTRY_FILE);
  registry.updatedAt = isoNow();
  writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

function loadEnvRegistry(repoRoot) {
  const envRegistryPath = join(repoRoot, ENV_REGISTRY_FILE);
  if (!existsSync(envRegistryPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(envRegistryPath, 'utf8'));
  } catch (e) {
    console.error(`Error reading environment registry: ${e.message}`);
    return null;
  }
}

function saveEnvRegistry(repoRoot, envRegistry) {
  const envRegistryPath = join(repoRoot, ENV_REGISTRY_FILE);
  envRegistry.updatedAt = isoNow();
  writeFileSync(envRegistryPath, JSON.stringify(envRegistry, null, 2));
}

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

function cmdInit(repoRoot) {
  console.log(`Initializing context layer at ${repoRoot}...`);

  const contextDir = join(repoRoot, CONTEXT_DIR);
  let created = false;

  // Create base directory
  if (ensureDir(contextDir)) {
    console.log(`  Created: ${CONTEXT_DIR}/`);
    created = true;
  }

  // Create subdirectories
  for (const sub of DEFAULT_SUBDIRS) {
    const subDir = join(contextDir, sub);
    if (ensureDir(subDir)) {
      console.log(`  Created: ${CONTEXT_DIR}/${sub}/`);
      created = true;
    }
  }

  // Create config directories
  const configDir = join(repoRoot, CONFIG_DIR);
  if (ensureDir(configDir)) {
    console.log(`  Created: ${CONFIG_DIR}/`);
    created = true;
  }

  const configEnvsDir = join(repoRoot, CONFIG_ENVS_DIR);
  if (ensureDir(configEnvsDir)) {
    console.log(`  Created: ${CONFIG_ENVS_DIR}/`);
    created = true;
  }

  // Create registry.json if missing
  const registryPath = join(repoRoot, REGISTRY_FILE);
  if (!existsSync(registryPath)) {
    const initialRegistry = {
      version: 1,
      updatedAt: isoNow(),
      artifacts: []
    };
    writeFileSync(registryPath, JSON.stringify(initialRegistry, null, 2));
    console.log(`  Created: ${REGISTRY_FILE}`);
    created = true;
  }

  // Create environment-registry.json if missing
  const envRegistryPath = join(repoRoot, ENV_REGISTRY_FILE);
  if (!existsSync(envRegistryPath)) {
    const initialEnvRegistry = {
      version: 1,
      updatedAt: isoNow(),
      environments: []
    };
    writeFileSync(envRegistryPath, JSON.stringify(initialEnvRegistry, null, 2));
    console.log(`  Created: ${ENV_REGISTRY_FILE}`);
    created = true;
  }

  // Create INDEX.md if missing
  const indexPath = join(repoRoot, INDEX_FILE);
  if (!existsSync(indexPath)) {
    const indexContent = `# Project Context Index (LLM-first)

## Conclusions (read first)

- \`docs/context/\` is the **stable, curated context layer** for this repository.
- The canonical index of all context artifacts is \`docs/context/registry.json\`.
- Environment configurations are defined in \`docs/context/config/environment-registry.json\`.
- When \`docs/context/\` exists, AI/LLM SHOULD prefer these artifacts over ad-hoc repository scanning.
- Any change to context artifacts MUST be accompanied by an updated registry checksum:
  - Run \`node .ai/scripts/contextctl.js touch\`
  - Verify with \`node .ai/scripts/contextctl.js verify --strict\`

## What lives here

Typical artifacts (not exhaustive):

- API contract: \`docs/context/api/openapi.yaml\`
- Database schema mapping: \`docs/context/db/schema.json\`
- Business processes: \`docs/context/process/*.bpmn\`
- Environment configuration: \`docs/context/config/environment-registry.json\`

All artifacts MUST be registered in \`docs/context/registry.json\`.

## Environment Configuration

Environment-specific configurations live in \`config/environments/\`:

- \`config/environments/dev.yaml.template\`
- \`config/environments/staging.yaml.template\`
- \`config/environments/prod.yaml.template\`

Copy templates to actual config files (without .template suffix) and fill in values.
Actual config files should be in .gitignore.

## How to load context (for AI/LLM)

1. Open \`docs/context/registry.json\`.
2. Select only the artifacts needed for the current task.
3. Open those files by path (do not scan folders).
4. Check \`docs/context/config/environment-registry.json\` for environment constraints.

## How to update context (script-only)

Use \`node .ai/scripts/contextctl.js\`:

- Initialize (idempotent):
  - \`node .ai/scripts/contextctl.js init\`
- Register a new artifact:
  - \`node .ai/scripts/contextctl.js add-artifact --id <id> --type <type> --path <repo-relative-path>\`
- Update checksums after edits:
  - \`node .ai/scripts/contextctl.js touch\`
- Verify consistency (for CI):
  - \`node .ai/scripts/contextctl.js verify --strict\`
- Add environment:
  - \`node .ai/scripts/contextctl.js add-env --id dev --description "Development"\`
- List environments:
  - \`node .ai/scripts/contextctl.js list-envs\`

## Verification

- Registry and artifacts are consistent:
  - \`node .ai/scripts/contextctl.js verify --strict\`
- Environment configuration is valid:
  - \`node .ai/scripts/contextctl.js verify-config --env staging\`
`;
    writeFileSync(indexPath, indexContent);
    console.log(`  Created: ${INDEX_FILE}`);
    created = true;
  }

  if (!created) {
    console.log('  Context layer already initialized (no changes).');
  }

  console.log('Done.');
  return 0;
}

function cmdAddArtifact(repoRoot, flags) {
  const { id, type, path: artifactPath, mode = 'contract', format, tags } = flags;

  if (!id || !type || !artifactPath) {
    console.error('Error: --id, --type, and --path are required.');
    console.error('Usage: contextctl add-artifact --id <id> --type <type> --path <path> [--mode contract|generated] [--format <format>] [--tags <comma-separated>]');
    return 1;
  }

  // Validate id format
  if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(id)) {
    console.error('Error: id must be 3-64 lowercase alphanumeric characters with hyphens, starting and ending with alphanumeric.');
    return 1;
  }

  const registry = loadRegistry(repoRoot);
  if (!registry) {
    console.error('Error: Registry not found. Run `contextctl init` first.');
    return 1;
  }

  // Check for duplicate id
  if (registry.artifacts.some(a => a.id === id)) {
    console.error(`Error: Artifact with id "${id}" already exists.`);
    return 1;
  }

  // Verify file exists
  const fullPath = join(repoRoot, artifactPath);
  if (!existsSync(fullPath)) {
    console.error(`Error: File not found: ${artifactPath}`);
    return 1;
  }

  // Calculate checksum
  const content = readFileSync(fullPath);
  const checksum = sha256(content);

  const artifact = {
    id,
    type,
    path: artifactPath,
    mode: mode === 'generated' ? 'generated' : 'contract'
  };

  if (format) artifact.format = format;
  if (tags) artifact.tags = tags.split(',').map(t => t.trim());
  artifact.checksumSha256 = checksum;
  artifact.lastUpdated = isoNow();
  artifact.source = {
    kind: 'manual',
    notes: 'Edit the file; then run contextctl touch.'
  };

  registry.artifacts.push(artifact);
  saveRegistry(repoRoot, registry);

  console.log(`Added artifact: ${id}`);
  console.log(`  path: ${artifactPath}`);
  console.log(`  checksum: ${checksum.slice(0, 16)}...`);
  return 0;
}

function cmdRemoveArtifact(repoRoot, flags) {
  const { id } = flags;

  if (!id) {
    console.error('Error: --id is required.');
    return 1;
  }

  const registry = loadRegistry(repoRoot);
  if (!registry) {
    console.error('Error: Registry not found.');
    return 1;
  }

  const idx = registry.artifacts.findIndex(a => a.id === id);
  if (idx === -1) {
    console.error(`Error: Artifact with id "${id}" not found.`);
    return 1;
  }

  registry.artifacts.splice(idx, 1);
  saveRegistry(repoRoot, registry);

  console.log(`Removed artifact: ${id}`);
  return 0;
}

function cmdTouch(repoRoot) {
  const registry = loadRegistry(repoRoot);
  if (!registry) {
    console.error('Error: Registry not found. Run `contextctl init` first.');
    return 1;
  }

  console.log('Updating checksums...');
  let updated = 0;

  for (const artifact of registry.artifacts) {
    const fullPath = join(repoRoot, artifact.path);
    if (!existsSync(fullPath)) {
      console.warn(`  Warning: File not found: ${artifact.path}`);
      continue;
    }

    const content = readFileSync(fullPath);
    const newChecksum = sha256(content);

    if (artifact.checksumSha256 !== newChecksum) {
      artifact.checksumSha256 = newChecksum;
      artifact.lastUpdated = isoNow();
      console.log(`  Updated: ${artifact.id}`);
      updated++;
    }
  }

  saveRegistry(repoRoot, registry);

  if (updated === 0) {
    console.log('No changes detected.');
  } else {
    console.log(`Updated ${updated} artifact(s).`);
  }
  return 0;
}

function cmdVerify(repoRoot, flags) {
  const strict = flags.strict === true;
  const registry = loadRegistry(repoRoot);

  if (!registry) {
    console.error('Error: Registry not found.');
    return 1;
  }

  console.log(`Verifying context registry (strict=${strict})...`);
  let errors = 0;
  let warnings = 0;

  // Check each artifact
  for (const artifact of registry.artifacts) {
    const fullPath = join(repoRoot, artifact.path);

    if (!existsSync(fullPath)) {
      console.error(`  ERROR: File not found: ${artifact.path} (id: ${artifact.id})`);
      errors++;
      continue;
    }

    const content = readFileSync(fullPath);
    const currentChecksum = sha256(content);

    if (artifact.checksumSha256 && artifact.checksumSha256 !== currentChecksum) {
      const msg = `  CHECKSUM MISMATCH: ${artifact.id} (${artifact.path})`;
      if (strict) {
        console.error(msg);
        errors++;
      } else {
        console.warn(msg);
        warnings++;
      }
    }
  }

  // Summary
  if (errors > 0) {
    console.error(`\nVerification FAILED: ${errors} error(s), ${warnings} warning(s).`);
    console.error('Run `node .ai/scripts/contextctl.js touch` to update checksums.');
    return 1;
  } else if (warnings > 0) {
    console.warn(`\nVerification passed with ${warnings} warning(s).`);
    return 0;
  } else {
    console.log(`\nVerification passed: ${registry.artifacts.length} artifact(s) OK.`);
    return 0;
  }
}

function cmdList(repoRoot) {
  const registry = loadRegistry(repoRoot);
  if (!registry) {
    console.error('Error: Registry not found.');
    return 1;
  }

  if (registry.artifacts.length === 0) {
    console.log('No artifacts registered.');
    return 0;
  }

  console.log(`Registered artifacts (${registry.artifacts.length}):\n`);
  for (const a of registry.artifacts) {
    console.log(`  ${a.id}`);
    console.log(`    type: ${a.type}, mode: ${a.mode}`);
    console.log(`    path: ${a.path}`);
    if (a.tags?.length) console.log(`    tags: ${a.tags.join(', ')}`);
    console.log();
  }
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment Commands
// ─────────────────────────────────────────────────────────────────────────────

function cmdAddEnv(repoRoot, flags) {
  const { id, description } = flags;

  if (!id || !description) {
    console.error('Error: --id and --description are required.');
    console.error('Usage: contextctl add-env --id <id> --description <description>');
    return 1;
  }

  // Validate id format
  if (!/^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]$/.test(id)) {
    console.error('Error: id must be lowercase alphanumeric with optional hyphens.');
    return 1;
  }

  let envRegistry = loadEnvRegistry(repoRoot);
  if (!envRegistry) {
    // Create new registry
    envRegistry = {
      version: 1,
      updatedAt: isoNow(),
      environments: []
    };
  }

  // Check for duplicate id
  if (envRegistry.environments.some(e => e.id === id)) {
    console.error(`Error: Environment with id "${id}" already exists.`);
    return 1;
  }

  const env = {
    id,
    description,
    database: {
      writable: id === 'dev',
      migrations: id === 'dev' ? true : 'review-required',
      seedData: id === 'dev'
    },
    secrets: {
      source: id === 'dev' ? '.env.local' : `vault://${id}/*`,
      notes: id === 'dev' ? 'Use local .env file' : 'Secrets managed via vault or CI'
    },
    deployment: {
      allowed: id !== 'dev',
      approval: id === 'prod' ? 'required' : 'optional'
    }
  };

  envRegistry.environments.push(env);
  saveEnvRegistry(repoRoot, envRegistry);

  console.log(`Added environment: ${id}`);
  console.log(`  description: ${description}`);
  return 0;
}

function cmdListEnvs(repoRoot) {
  const envRegistry = loadEnvRegistry(repoRoot);
  if (!envRegistry) {
    console.error('Error: Environment registry not found.');
    return 1;
  }

  if (envRegistry.environments.length === 0) {
    console.log('No environments registered.');
    return 0;
  }

  console.log(`Registered environments (${envRegistry.environments.length}):\n`);
  for (const e of envRegistry.environments) {
    console.log(`  ${e.id}`);
    console.log(`    description: ${e.description}`);
    if (e.database) {
      console.log(`    database: writable=${e.database.writable}, migrations=${e.database.migrations}`);
    }
    if (e.deployment) {
      console.log(`    deployment: allowed=${e.deployment.allowed}, approval=${e.deployment.approval || 'none'}`);
    }
    console.log();
  }
  return 0;
}

function cmdVerifyConfig(repoRoot, flags) {
  const { env } = flags;

  const envRegistry = loadEnvRegistry(repoRoot);
  if (!envRegistry) {
    console.error('Error: Environment registry not found.');
    return 1;
  }

  console.log('Verifying environment configuration...');
  let errors = 0;

  // If specific env requested, verify just that one
  const envsToVerify = env 
    ? envRegistry.environments.filter(e => e.id === env)
    : envRegistry.environments;

  if (env && envsToVerify.length === 0) {
    console.error(`Error: Environment "${env}" not found in registry.`);
    return 1;
  }

  for (const e of envsToVerify) {
    // Check if config template exists
    const templatePath = join(repoRoot, CONFIG_ENVS_DIR, `${e.id}.yaml.template`);
    const configPath = join(repoRoot, CONFIG_ENVS_DIR, `${e.id}.yaml`);

    if (!existsSync(templatePath) && !existsSync(configPath)) {
      console.warn(`  Warning: No config file for environment "${e.id}"`);
      console.warn(`    Expected: ${CONFIG_ENVS_DIR}/${e.id}.yaml.template or ${e.id}.yaml`);
    } else {
      console.log(`  OK: ${e.id} - config file found`);
    }

    // Validate required fields
    if (!e.description) {
      console.error(`  ERROR: Environment "${e.id}" missing description`);
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`\nVerification FAILED: ${errors} error(s).`);
    return 1;
  }

  console.log(`\nVerification passed: ${envsToVerify.length} environment(s) OK.`);
  return 0;
}

function cmdHelp() {
  console.log(`
contextctl.js - Context Registry Management

Usage: node .ai/scripts/contextctl.js <command> [options]

Commands:
  init                Initialize context directory structure (idempotent)
  
  add-artifact        Register a new artifact
    --id <id>         Artifact identifier (required)
    --type <type>     Artifact type, e.g. openapi, db-schema, bpmn (required)
    --path <path>     Repo-relative path to file (required)
    --mode <mode>     contract (default) or generated
    --format <fmt>    Format hint, e.g. openapi-3.1
    --tags <tags>     Comma-separated tags
    
  remove-artifact     Remove an artifact from registry
    --id <id>         Artifact identifier (required)
    
  touch               Update checksums for all registered artifacts
  
  verify              Verify registry consistency
    --strict          Fail on checksum mismatch (default: warn only)
    
  list                List all registered artifacts

  add-env             Add an environment to the registry
    --id <id>         Environment identifier, e.g. dev, staging, prod (required)
    --description <d> Human-readable description (required)
    
  list-envs           List all registered environments
  
  verify-config       Verify environment configuration
    --env <id>        Specific environment to verify (optional)
    
  help                Show this help message

Global Options:
  --repo-root <path>  Repository root (default: auto-detect)
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
    case 'add-artifact':
      return cmdAddArtifact(repoRoot, parsed.flags);
    case 'remove-artifact':
      return cmdRemoveArtifact(repoRoot, parsed.flags);
    case 'touch':
      return cmdTouch(repoRoot);
    case 'verify':
      return cmdVerify(repoRoot, parsed.flags);
    case 'list':
      return cmdList(repoRoot);
    case 'add-env':
      return cmdAddEnv(repoRoot, parsed.flags);
    case 'list-envs':
      return cmdListEnvs(repoRoot);
    case 'verify-config':
      return cmdVerifyConfig(repoRoot, parsed.flags);
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
