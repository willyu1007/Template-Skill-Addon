#!/usr/bin/env node
/**
 * migrate.js - Database Migration Management
 *
 * Manages migration execution and status.
 * Note: This script provides structure for migration management.
 * Actual database connections should be configured per project.
 *
 * Commands:
 *   list      List all migrations and their status
 *   status    Show migration status for an environment
 *   apply     Apply pending migrations (placeholder)
 *   rollback  Rollback last migration (placeholder)
 *   help      Show this help message
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const MIGRATIONS_DIR = 'db/migrations';
const DB_ENVS_FILE = 'db/config/db-environments.json';
const MIGRATION_STATUS_FILE = 'db/migrations/.migration-status.json';

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
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getMigrations(repoRoot) {
  const dir = join(repoRoot, MIGRATIONS_DIR);
  if (!existsSync(dir)) return [];
  
  return readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

function loadMigrationStatus(repoRoot) {
  const statusPath = join(repoRoot, MIGRATION_STATUS_FILE);
  return loadJson(statusPath) || { applied: {} };
}

function saveMigrationStatus(repoRoot, status) {
  const statusPath = join(repoRoot, MIGRATION_STATUS_FILE);
  saveJson(statusPath, status);
}

function getEnvConfig(repoRoot, envId) {
  const envsPath = join(repoRoot, DB_ENVS_FILE);
  const envs = loadJson(envsPath);
  if (!envs || !envs.environments) return null;
  return envs.environments.find(e => e.id === envId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

function cmdList(repoRoot) {
  const migrations = getMigrations(repoRoot);
  const status = loadMigrationStatus(repoRoot);

  if (migrations.length === 0) {
    console.log('No migrations found.');
    return 0;
  }

  console.log(`Migrations (${migrations.length}):\n`);
  for (const m of migrations) {
    const appliedEnvs = [];
    for (const [env, applied] of Object.entries(status.applied || {})) {
      if (applied.includes(m)) {
        appliedEnvs.push(env);
      }
    }
    
    const appliedStr = appliedEnvs.length > 0 
      ? `[applied: ${appliedEnvs.join(', ')}]`
      : '[pending]';
    
    console.log(`  ${m} ${appliedStr}`);
  }
  return 0;
}

function cmdStatus(repoRoot, flags) {
  const { env } = flags;

  if (!env) {
    console.error('Error: --env is required.');
    return 1;
  }

  const envConfig = getEnvConfig(repoRoot, env);
  if (!envConfig) {
    console.error(`Error: Environment "${env}" not found.`);
    return 1;
  }

  const migrations = getMigrations(repoRoot);
  const status = loadMigrationStatus(repoRoot);
  const applied = status.applied?.[env] || [];

  console.log(`Migration status for: ${env}`);
  console.log(`Environment: ${envConfig.description}`);
  console.log(`Permissions: migrations=${envConfig.permissions?.migrations || 'unknown'}\n`);

  const pending = migrations.filter(m => !applied.includes(m));
  
  console.log(`Applied: ${applied.length}`);
  console.log(`Pending: ${pending.length}`);
  
  if (pending.length > 0) {
    console.log('\nPending migrations:');
    for (const m of pending) {
      console.log(`  - ${m}`);
    }
  }

  return 0;
}

function cmdApply(repoRoot, flags) {
  const { env, confirm } = flags;

  if (!env) {
    console.error('Error: --env is required.');
    return 1;
  }

  const envConfig = getEnvConfig(repoRoot, env);
  if (!envConfig) {
    console.error(`Error: Environment "${env}" not found.`);
    return 1;
  }

  // Check permissions
  const migrationPerm = envConfig.permissions?.migrations;
  if (migrationPerm === false) {
    console.error(`Error: Migrations are not allowed for environment "${env}".`);
    return 1;
  }

  if (migrationPerm === 'review-required' || migrationPerm === 'change-request') {
    console.warn(`Warning: Environment "${env}" requires ${migrationPerm} for migrations.`);
    if (!confirm) {
      console.log('\nTo proceed, run with --confirm flag after obtaining approval.');
      return 1;
    }
  }

  const migrations = getMigrations(repoRoot);
  const status = loadMigrationStatus(repoRoot);
  const applied = status.applied?.[env] || [];
  const pending = migrations.filter(m => !applied.includes(m));

  if (pending.length === 0) {
    console.log('No pending migrations.');
    return 0;
  }

  console.log(`\nApplying ${pending.length} migration(s) to ${env}...`);
  console.log('\n⚠️  NOTE: This is a placeholder implementation.');
  console.log('In a real project, this would connect to the database and execute SQL.\n');

  // Simulate applying migrations (just mark as applied)
  if (!status.applied) status.applied = {};
  if (!status.applied[env]) status.applied[env] = [];

  for (const m of pending) {
    console.log(`  Applying: ${m}`);
    // In real implementation: execute SQL here
    status.applied[env].push(m);
  }

  saveMigrationStatus(repoRoot, status);

  console.log(`\nMarked ${pending.length} migration(s) as applied.`);
  console.log('In production: connect your database and execute the SQL files.');
  return 0;
}

function cmdRollback(repoRoot, flags) {
  const { env, confirm } = flags;

  if (!env) {
    console.error('Error: --env is required.');
    return 1;
  }

  const envConfig = getEnvConfig(repoRoot, env);
  if (!envConfig) {
    console.error(`Error: Environment "${env}" not found.`);
    return 1;
  }

  const status = loadMigrationStatus(repoRoot);
  const applied = status.applied?.[env] || [];

  if (applied.length === 0) {
    console.log('No migrations to rollback.');
    return 0;
  }

  const lastMigration = applied[applied.length - 1];

  console.log(`Rolling back: ${lastMigration}`);
  console.log('\n⚠️  NOTE: This is a placeholder implementation.');
  console.log('In a real project, this would execute the down migration.\n');

  if (!confirm) {
    console.log('To proceed, run with --confirm flag.');
    return 1;
  }

  // Remove from applied list
  status.applied[env] = applied.slice(0, -1);
  saveMigrationStatus(repoRoot, status);

  console.log(`Marked ${lastMigration} as rolled back.`);
  return 0;
}

function cmdHelp() {
  console.log(`
migrate.js - Database Migration Management

Usage: node .ai/scripts/migrate.js <command> [options]

Commands:
  list              List all migrations and their status
  
  status            Show migration status for an environment
    --env <id>      Environment ID (required)
    
  apply             Apply pending migrations
    --env <id>      Environment ID (required)
    --confirm       Confirm application (required for non-dev)
    
  rollback          Rollback last migration
    --env <id>      Environment ID (required)
    --confirm       Confirm rollback
    
  help              Show this help message

Global Options:
  --repo-root <path>  Repository root (default: auto-detect)

Notes:
  This script provides migration management structure.
  Actual database execution should be configured per project.
  
Examples:
  node .ai/scripts/migrate.js list
  node .ai/scripts/migrate.js status --env staging
  node .ai/scripts/migrate.js apply --env dev
  node .ai/scripts/migrate.js apply --env staging --confirm
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
    case 'list':
      return cmdList(repoRoot);
    case 'status':
      return cmdStatus(repoRoot, parsed.flags);
    case 'apply':
      return cmdApply(repoRoot, parsed.flags);
    case 'rollback':
      return cmdRollback(repoRoot, parsed.flags);
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

