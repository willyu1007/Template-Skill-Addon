#!/usr/bin/env node
/**
 * contextctl.js
 *
 * Context artifacts and registry management for the context-awareness add-on.
 *
 * Commands:
 *   init              Initialize docs/context skeleton (idempotent)
 *   add-artifact      Add an artifact to the registry
 *   remove-artifact   Remove an artifact from the registry
 *   touch             Update checksums after editing artifacts
 *   list              List all registered artifacts
 *   verify            Verify context layer consistency
 *   add-env           Add a new environment
 *   list-envs         List all environments
 *   verify-config     Verify environment configuration
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function usage(exitCode = 0) {
  const msg = `
Usage:
  node .ai/scripts/contextctl.js <command> [options]

Commands:
  init
    --repo-root <path>          Repo root (default: cwd)
    --dry-run                   Show what would be created without writing
    Initialize docs/context skeleton (idempotent).

  add-artifact
    --id <string>               Artifact ID (required)
    --type <openapi|db|bpmn|json|yaml|markdown>  Artifact type (required)
    --path <string>             Path to artifact file (required)
    --repo-root <path>          Repo root (default: cwd)
    Add an artifact to the context registry.

  remove-artifact
    --id <string>               Artifact ID to remove (required)
    --repo-root <path>          Repo root (default: cwd)
    Remove an artifact from the registry.

  touch
    --repo-root <path>          Repo root (default: cwd)
    Update checksums for all registered artifacts.

  list
    --repo-root <path>          Repo root (default: cwd)
    --format <text|json>        Output format (default: text)
    List all registered artifacts.

  verify
    --repo-root <path>          Repo root (default: cwd)
    --strict                    Treat warnings as errors
    Verify context layer consistency.

  add-env
    --id <string>               Environment ID (required)
    --description <string>      Description (optional)
    --repo-root <path>          Repo root (default: cwd)
    Add a new environment to the registry.

  list-envs
    --repo-root <path>          Repo root (default: cwd)
    --format <text|json>        Output format (default: text)
    List all environments.

  verify-config
    --env <string>              Environment to verify (optional, verifies all if omitted)
    --repo-root <path>          Repo root (default: cwd)
    Verify environment configuration.

Examples:
  node .ai/scripts/contextctl.js init
  node .ai/scripts/contextctl.js add-artifact --id my-api --type openapi --path docs/context/api/my-api.yaml
  node .ai/scripts/contextctl.js verify --strict
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

// ============================================================================
// File Utilities
// ============================================================================

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

function computeChecksum(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

// ============================================================================
// Context Management
// ============================================================================

function getContextDir(repoRoot) {
  return path.join(repoRoot, 'docs', 'context');
}

function getRegistryPath(repoRoot) {
  return path.join(getContextDir(repoRoot), 'registry.json');
}

function getEnvRegistryPath(repoRoot) {
  return path.join(getContextDir(repoRoot), 'config', 'environment-registry.json');
}

function loadRegistry(repoRoot) {
  const registryPath = getRegistryPath(repoRoot);
  const data = readJson(registryPath);
  if (!data) {
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      artifacts: []
    };
  }
  return data;
}

function saveRegistry(repoRoot, registry) {
  registry.lastUpdated = new Date().toISOString();
  writeJson(getRegistryPath(repoRoot), registry);
}

function loadEnvRegistry(repoRoot) {
  const envRegistryPath = getEnvRegistryPath(repoRoot);
  const data = readJson(envRegistryPath);
  if (!data) {
    return {
      version: 1,
      environments: []
    };
  }
  return data;
}

function saveEnvRegistry(repoRoot, envRegistry) {
  writeJson(getEnvRegistryPath(repoRoot), envRegistry);
}

// ============================================================================
// Commands
// ============================================================================

function cmdInit(repoRoot, dryRun) {
  const contextDir = getContextDir(repoRoot);
  const actions = [];

  // Create directory structure
  const dirs = [
    contextDir,
    path.join(contextDir, 'api'),
    path.join(contextDir, 'db'),
    path.join(contextDir, 'process'),
    path.join(contextDir, 'config')
  ];

  for (const dir of dirs) {
    if (dryRun) {
      actions.push({ op: 'mkdir', path: dir, mode: 'dry-run' });
    } else {
      actions.push(ensureDir(dir));
    }
  }

  // Create INDEX.md
  const indexPath = path.join(contextDir, 'INDEX.md');
  const indexContent = `# Context Index

This directory contains structured context artifacts for AI/LLM consumption.

## Entry Points

- \`registry.json\` - Artifact registry with checksums
- \`config/environment-registry.json\` - Environment configuration

## Artifact Types

| Directory | Purpose |
|-----------|---------|
| \`api/\` | OpenAPI/Swagger specifications |
| \`db/\` | Database schema mirrors |
| \`process/\` | BPMN/workflow definitions |
| \`config/\` | Environment and runtime configuration |

## Usage

AI/LLM should:
1. Read this INDEX.md first
2. Check registry.json for available artifacts
3. Load specific artifacts as needed

All context changes go through \`contextctl.js\` commands.
`;

  if (dryRun) {
    actions.push({ op: 'write', path: indexPath, mode: 'dry-run' });
  } else {
    actions.push(writeFileIfMissing(indexPath, indexContent));
  }

  // Create registry.json
  const registryPath = getRegistryPath(repoRoot);
  if (!fs.existsSync(registryPath) && !dryRun) {
    const registry = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      artifacts: []
    };
    writeJson(registryPath, registry);
    actions.push({ op: 'write', path: registryPath });
  } else if (dryRun) {
    actions.push({ op: 'write', path: registryPath, mode: 'dry-run' });
  }

  // Create environment registry
  const envRegistryPath = getEnvRegistryPath(repoRoot);
  if (!fs.existsSync(envRegistryPath) && !dryRun) {
    const envRegistry = {
      version: 1,
      environments: [
        {
          id: 'dev',
          description: 'Local development environment',
          permissions: {
            database: { read: true, write: true, migrate: true },
            deploy: false
          }
        },
        {
          id: 'staging',
          description: 'Staging/QA environment',
          permissions: {
            database: { read: true, write: true, migrate: true },
            deploy: true
          }
        },
        {
          id: 'prod',
          description: 'Production environment',
          permissions: {
            database: { read: true, write: false, migrate: false },
            deploy: true
          }
        }
      ]
    };
    writeJson(envRegistryPath, envRegistry);
    actions.push({ op: 'write', path: envRegistryPath });
  } else if (dryRun) {
    actions.push({ op: 'write', path: envRegistryPath, mode: 'dry-run' });
  }

  // Create registry schema
  const schemaPath = path.join(contextDir, 'registry.schema.json');
  const schemaContent = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["version", "artifacts"],
    "properties": {
      "version": { "type": "integer", "minimum": 1 },
      "lastUpdated": { "type": "string", "format": "date-time" },
      "artifacts": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["id", "type", "path"],
          "properties": {
            "id": { "type": "string" },
            "type": { "type": "string", "enum": ["openapi", "db", "bpmn", "json", "yaml", "markdown"] },
            "path": { "type": "string" },
            "checksum": { "type": "string" },
            "description": { "type": "string" }
          }
        }
      }
    }
  };

  if (dryRun) {
    actions.push({ op: 'write', path: schemaPath, mode: 'dry-run' });
  } else {
    if (!fs.existsSync(schemaPath)) {
      writeJson(schemaPath, schemaContent);
      actions.push({ op: 'write', path: schemaPath });
    } else {
      actions.push({ op: 'skip', path: schemaPath, reason: 'exists' });
    }
  }

  console.log('[ok] Context layer initialized.');
  for (const action of actions) {
    const mode = action.mode ? ` (${action.mode})` : '';
    const reason = action.reason ? ` [${action.reason}]` : '';
    console.log(`  ${action.op}: ${path.relative(repoRoot, action.path)}${mode}${reason}`);
  }
}

function cmdAddArtifact(repoRoot, id, type, artifactPath) {
  if (!id) die('[error] --id is required');
  if (!type) die('[error] --type is required');
  if (!artifactPath) die('[error] --path is required');

  const validTypes = ['openapi', 'db', 'bpmn', 'json', 'yaml', 'markdown'];
  if (!validTypes.includes(type)) {
    die(`[error] --type must be one of: ${validTypes.join(', ')}`);
  }

  const fullPath = resolvePath(repoRoot, artifactPath);
  if (!fs.existsSync(fullPath)) {
    die(`[error] Artifact file not found: ${artifactPath}`);
  }

  const registry = loadRegistry(repoRoot);
  
  // Check if artifact already exists
  const existing = registry.artifacts.find(a => a.id === id);
  if (existing) {
    die(`[error] Artifact with id "${id}" already exists. Use remove-artifact first.`);
  }

  const checksum = computeChecksum(fullPath);
  const relativePath = path.relative(repoRoot, fullPath);

  registry.artifacts.push({
    id,
    type,
    path: relativePath,
    checksum,
    addedAt: new Date().toISOString()
  });

  saveRegistry(repoRoot, registry);
  console.log(`[ok] Added artifact: ${id} (${type}) -> ${relativePath}`);
}

function cmdRemoveArtifact(repoRoot, id) {
  if (!id) die('[error] --id is required');

  const registry = loadRegistry(repoRoot);
  const index = registry.artifacts.findIndex(a => a.id === id);
  
  if (index === -1) {
    die(`[error] Artifact with id "${id}" not found.`);
  }

  const removed = registry.artifacts.splice(index, 1)[0];
  saveRegistry(repoRoot, registry);
  console.log(`[ok] Removed artifact: ${id} (was at ${removed.path})`);
}

function cmdTouch(repoRoot) {
  const registry = loadRegistry(repoRoot);
  let updated = 0;

  for (const artifact of registry.artifacts) {
    const fullPath = resolvePath(repoRoot, artifact.path);
    const newChecksum = computeChecksum(fullPath);
    
    if (newChecksum && newChecksum !== artifact.checksum) {
      artifact.checksum = newChecksum;
      updated++;
      console.log(`  [updated] ${artifact.id}: ${newChecksum}`);
    }
  }

  if (updated > 0) {
    saveRegistry(repoRoot, registry);
    console.log(`[ok] Updated ${updated} checksum(s).`);
  } else {
    console.log('[ok] All checksums are up to date.');
  }
}

function cmdList(repoRoot, format) {
  const registry = loadRegistry(repoRoot);

  if (format === 'json') {
    console.log(JSON.stringify(registry, null, 2));
    return;
  }

  console.log(`Context Artifacts (${registry.artifacts.length} total):`);
  console.log(`Last updated: ${registry.lastUpdated || 'unknown'}\n`);

  if (registry.artifacts.length === 0) {
    console.log('  (no artifacts registered)');
    return;
  }

  for (const artifact of registry.artifacts) {
    console.log(`  [${artifact.type}] ${artifact.id}`);
    console.log(`    Path: ${artifact.path}`);
    console.log(`    Checksum: ${artifact.checksum || 'none'}`);
  }
}

function cmdVerify(repoRoot, strict) {
  const errors = [];
  const warnings = [];
  const contextDir = getContextDir(repoRoot);

  // Check context directory exists
  if (!fs.existsSync(contextDir)) {
    errors.push('docs/context directory does not exist. Run: contextctl init');
  }

  // Check registry exists
  const registryPath = getRegistryPath(repoRoot);
  if (!fs.existsSync(registryPath)) {
    errors.push('registry.json does not exist. Run: contextctl init');
  } else {
    const registry = loadRegistry(repoRoot);

    // Verify each artifact
    for (const artifact of registry.artifacts) {
      const fullPath = resolvePath(repoRoot, artifact.path);
      
      if (!fs.existsSync(fullPath)) {
        errors.push(`Artifact file missing: ${artifact.path} (id: ${artifact.id})`);
        continue;
      }

      const currentChecksum = computeChecksum(fullPath);
      if (artifact.checksum && currentChecksum !== artifact.checksum) {
        warnings.push(`Checksum mismatch for ${artifact.id}: expected ${artifact.checksum}, got ${currentChecksum}. Run: contextctl touch`);
      }
    }
  }

  // Check environment registry
  const envRegistryPath = getEnvRegistryPath(repoRoot);
  if (!fs.existsSync(envRegistryPath)) {
    warnings.push('environment-registry.json does not exist.');
  }

  // Check INDEX.md
  const indexPath = path.join(contextDir, 'INDEX.md');
  if (!fs.existsSync(indexPath)) {
    warnings.push('INDEX.md does not exist.');
  }

  // Report results
  const ok = errors.length === 0 && (!strict || warnings.length === 0);

  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const e of errors) console.log(`  - ${e}`);
  }

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const w of warnings) console.log(`  - ${w}`);
  }

  if (ok) {
    console.log('[ok] Context layer verification passed.');
  } else {
    console.log('[error] Context layer verification failed.');
  }

  process.exit(ok ? 0 : 1);
}

function cmdAddEnv(repoRoot, id, description) {
  if (!id) die('[error] --id is required');

  const envRegistry = loadEnvRegistry(repoRoot);
  
  // Check if environment already exists
  const existing = envRegistry.environments.find(e => e.id === id);
  if (existing) {
    die(`[error] Environment "${id}" already exists.`);
  }

  envRegistry.environments.push({
    id,
    description: description || `${id} environment`,
    permissions: {
      database: { read: true, write: id !== 'prod', migrate: id !== 'prod' },
      deploy: id !== 'dev'
    }
  });

  saveEnvRegistry(repoRoot, envRegistry);
  console.log(`[ok] Added environment: ${id}`);
}

function cmdListEnvs(repoRoot, format) {
  const envRegistry = loadEnvRegistry(repoRoot);

  if (format === 'json') {
    console.log(JSON.stringify(envRegistry, null, 2));
    return;
  }

  console.log(`Environments (${envRegistry.environments.length} total):\n`);

  for (const env of envRegistry.environments) {
    console.log(`  [${env.id}] ${env.description || ''}`);
    const perms = env.permissions || {};
    const dbPerms = perms.database || {};
    console.log(`    Database: read=${dbPerms.read ?? '-'}, write=${dbPerms.write ?? '-'}, migrate=${dbPerms.migrate ?? '-'}`);
    console.log(`    Deploy: ${perms.deploy ?? '-'}`);
  }
}

function cmdVerifyConfig(repoRoot, envId) {
  const envRegistry = loadEnvRegistry(repoRoot);
  const errors = [];
  const warnings = [];

  const envsToCheck = envId 
    ? envRegistry.environments.filter(e => e.id === envId)
    : envRegistry.environments;

  if (envId && envsToCheck.length === 0) {
    die(`[error] Environment "${envId}" not found.`);
  }

  for (const env of envsToCheck) {
    // Check for config template
    const templatePath = path.join(repoRoot, 'config', 'environments', `${env.id}.yaml.template`);
    const configPath = path.join(repoRoot, 'config', 'environments', `${env.id}.yaml`);

    if (!fs.existsSync(templatePath) && !fs.existsSync(configPath)) {
      warnings.push(`No config file found for environment "${env.id}".`);
    }

    // Check permissions are defined
    if (!env.permissions) {
      warnings.push(`Environment "${env.id}" has no permissions defined.`);
    }
  }

  // Report results
  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const e of errors) console.log(`  - ${e}`);
  }

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const w of warnings) console.log(`  - ${w}`);
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('[ok] Environment configuration verification passed.');
  } else if (errors.length === 0) {
    console.log('[ok] Environment configuration verification passed with warnings.');
  } else {
    console.log('[error] Environment configuration verification failed.');
    process.exit(1);
  }
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
    case 'add-artifact':
      cmdAddArtifact(repoRoot, opts['id'], opts['type'], opts['path']);
      break;
    case 'remove-artifact':
      cmdRemoveArtifact(repoRoot, opts['id']);
      break;
    case 'touch':
      cmdTouch(repoRoot);
      break;
    case 'list':
      cmdList(repoRoot, format);
      break;
    case 'verify':
      cmdVerify(repoRoot, !!opts['strict']);
      break;
    case 'add-env':
      cmdAddEnv(repoRoot, opts['id'], opts['description']);
      break;
    case 'list-envs':
      cmdListEnvs(repoRoot, format);
      break;
    case 'verify-config':
      cmdVerifyConfig(repoRoot, opts['env']);
      break;
    default:
      console.error(`[error] Unknown command: ${command}`);
      usage(1);
  }
}

main();
