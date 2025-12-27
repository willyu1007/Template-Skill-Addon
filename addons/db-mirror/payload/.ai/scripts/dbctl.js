#!/usr/bin/env node
/**
 * dbctl.js - Database Schema Mirror Management
 *
 * Manages the db/ directory structure for database schema mirroring.
 *
 * Commands:
 *   init                Initialize db mirror structure (idempotent)
 *   add-table           Add a table to the schema mirror
 *   remove-table        Remove a table from the schema mirror
 *   list-tables         List all tables in the schema
 *   generate-migration  Generate a new migration file
 *   verify              Verify schema consistency
 *   help                Show this help message
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const DB_DIR = 'db';
const SCHEMA_DIR = 'db/schema';
const MIGRATIONS_DIR = 'db/migrations';
const CONFIG_DIR = 'db/config';
const SAMPLES_DIR = 'db/samples';
const WORKDOCS_DIR = 'db/workdocs';
const TABLES_FILE = 'db/schema/tables.json';
const DB_ENVS_FILE = 'db/config/db-environments.json';

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

function loadTables(repoRoot) {
  return loadJson(join(repoRoot, TABLES_FILE));
}

function saveTables(repoRoot, tables) {
  tables.updatedAt = isoNow();
  saveJson(join(repoRoot, TABLES_FILE), tables);
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

function cmdInit(repoRoot) {
  console.log(`Initializing database mirror at ${repoRoot}...`);
  let created = false;

  // Create directories
  const dirs = [DB_DIR, SCHEMA_DIR, MIGRATIONS_DIR, CONFIG_DIR, SAMPLES_DIR, WORKDOCS_DIR];
  for (const dir of dirs) {
    const fullPath = join(repoRoot, dir);
    if (ensureDir(fullPath)) {
      console.log(`  Created: ${dir}/`);
      created = true;
    }
  }

  // Create tables.json if missing
  const tablesPath = join(repoRoot, TABLES_FILE);
  if (!existsSync(tablesPath)) {
    const initialTables = {
      version: 1,
      updatedAt: isoNow(),
      tables: []
    };
    saveJson(tablesPath, initialTables);
    console.log(`  Created: ${TABLES_FILE}`);
    created = true;
  }

  // Create db-environments.json if missing
  const envsPath = join(repoRoot, DB_ENVS_FILE);
  if (!existsSync(envsPath)) {
    const initialEnvs = {
      version: 1,
      updatedAt: isoNow(),
      environments: [
        {
          id: 'dev',
          description: 'Local development database',
          connectionTemplate: 'postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}',
          permissions: {
            migrations: true,
            seedData: true,
            directQueries: true
          }
        },
        {
          id: 'staging',
          description: 'Staging database',
          connectionTemplate: 'postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}',
          permissions: {
            migrations: 'review-required',
            seedData: false,
            directQueries: false
          }
        },
        {
          id: 'prod',
          description: 'Production database',
          connectionTemplate: 'postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}',
          permissions: {
            migrations: 'change-request',
            seedData: false,
            directQueries: false
          }
        }
      ]
    };
    saveJson(envsPath, initialEnvs);
    console.log(`  Created: ${DB_ENVS_FILE}`);
    created = true;
  }

  // Create AGENTS.md if missing
  const agentsPath = join(repoRoot, DB_DIR, 'AGENTS.md');
  if (!existsSync(agentsPath)) {
    const agentsContent = `# Database Mirror - AI Guidance

## Conclusions (read first)

- \`db/\` contains the **schema mirror** for this project's database(s).
- Real databases are the **single source of truth**; this directory holds structured descriptions.
- AI MUST use \`dbctl.js\` and \`migrate.js\` scripts for all database operations.
- Never attempt direct database connections or arbitrary SQL execution.

## Directory Structure

- \`db/schema/tables.json\` - Table structure definitions
- \`db/migrations/\` - Migration files
- \`db/config/db-environments.json\` - Environment configuration
- \`db/samples/\` - Sample/seed data
- \`db/workdocs/\` - Design decisions and planning

## AI Workflow

1. **Read** \`db/schema/tables.json\` to understand current schema
2. **Propose** changes by editing schema files
3. **Generate** migrations: \`node .ai/scripts/dbctl.js generate-migration --name <name>\`
4. **Document** intentions in \`db/workdocs/\`
5. **Request human** to apply migrations to non-dev environments

## Environment Permissions

Check \`db/config/db-environments.json\` for what operations are allowed:

- \`dev\`: Full access (migrations, seed data, queries)
- \`staging\`: Migrations require review
- \`prod\`: Migrations require formal change request

## Forbidden Actions

- Direct database connections
- Running arbitrary SQL
- Modifying production without change request
- Storing credentials in code
`;
    writeFileSync(agentsPath, agentsContent);
    console.log(`  Created: ${DB_DIR}/AGENTS.md`);
    created = true;
  }

  // Create workdocs README
  const workdocsReadme = join(repoRoot, WORKDOCS_DIR, 'README.md');
  if (!existsSync(workdocsReadme)) {
    const content = `# Database Workdocs

Use this directory for:

- Schema design decisions
- Migration planning
- Data model proposals
- Database-related notes and discussions

Files here are for documentation and planning, not execution.
`;
    writeFileSync(workdocsReadme, content);
    console.log(`  Created: ${WORKDOCS_DIR}/README.md`);
    created = true;
  }

  // Create .gitkeep files
  for (const dir of [MIGRATIONS_DIR, SAMPLES_DIR]) {
    const gitkeep = join(repoRoot, dir, '.gitkeep');
    if (!existsSync(gitkeep)) {
      writeFileSync(gitkeep, '');
    }
  }

  if (!created) {
    console.log('  Database mirror already initialized (no changes).');
  }

  console.log('Done.');
  return 0;
}

function cmdAddTable(repoRoot, flags) {
  const { name, columns } = flags;

  if (!name) {
    console.error('Error: --name is required.');
    console.error('Usage: dbctl add-table --name <name> --columns "col1:type:constraint,col2:type"');
    return 1;
  }

  const tables = loadTables(repoRoot);
  if (!tables) {
    console.error('Error: Tables file not found. Run `dbctl init` first.');
    return 1;
  }

  // Check for duplicate
  if (tables.tables.some(t => t.name === name)) {
    console.error(`Error: Table "${name}" already exists.`);
    return 1;
  }

  // Parse columns
  const parsedColumns = [];
  if (columns) {
    const colDefs = columns.split(',');
    for (const colDef of colDefs) {
      const parts = colDef.trim().split(':');
      if (parts.length < 2) {
        console.error(`Error: Invalid column format: ${colDef}`);
        console.error('Expected format: name:type[:constraint]');
        return 1;
      }
      const col = {
        name: parts[0],
        type: parts[1]
      };
      if (parts[2]) {
        col.constraints = parts.slice(2);
      }
      parsedColumns.push(col);
    }
  }

  const table = {
    name,
    columns: parsedColumns,
    createdAt: isoNow(),
    updatedAt: isoNow()
  };

  tables.tables.push(table);
  saveTables(repoRoot, tables);

  console.log(`Added table: ${name}`);
  if (parsedColumns.length > 0) {
    console.log(`  columns: ${parsedColumns.map(c => c.name).join(', ')}`);
  }
  return 0;
}

function cmdRemoveTable(repoRoot, flags) {
  const { name } = flags;

  if (!name) {
    console.error('Error: --name is required.');
    return 1;
  }

  const tables = loadTables(repoRoot);
  if (!tables) {
    console.error('Error: Tables file not found.');
    return 1;
  }

  const idx = tables.tables.findIndex(t => t.name === name);
  if (idx === -1) {
    console.error(`Error: Table "${name}" not found.`);
    return 1;
  }

  tables.tables.splice(idx, 1);
  saveTables(repoRoot, tables);

  console.log(`Removed table: ${name}`);
  return 0;
}

function cmdListTables(repoRoot) {
  const tables = loadTables(repoRoot);
  if (!tables) {
    console.error('Error: Tables file not found.');
    return 1;
  }

  if (tables.tables.length === 0) {
    console.log('No tables defined.');
    return 0;
  }

  console.log(`Tables (${tables.tables.length}):\n`);
  for (const t of tables.tables) {
    console.log(`  ${t.name}`);
    if (t.columns && t.columns.length > 0) {
      for (const c of t.columns) {
        const constraints = c.constraints ? ` (${c.constraints.join(', ')})` : '';
        console.log(`    - ${c.name}: ${c.type}${constraints}`);
      }
    }
    console.log();
  }
  return 0;
}

function cmdGenerateMigration(repoRoot, flags) {
  const { name } = flags;

  if (!name) {
    console.error('Error: --name is required.');
    console.error('Usage: dbctl generate-migration --name <migration-name>');
    return 1;
  }

  // Validate name
  if (!/^[a-z][a-z0-9_-]*$/.test(name)) {
    console.error('Error: Migration name must be lowercase alphanumeric with underscores/hyphens.');
    return 1;
  }

  const migrationsDir = join(repoRoot, MIGRATIONS_DIR);
  ensureDir(migrationsDir);

  // Generate timestamp-based filename
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const filename = `${timestamp}_${name}.sql`;
  const filepath = join(migrationsDir, filename);

  if (existsSync(filepath)) {
    console.error(`Error: Migration file already exists: ${filename}`);
    return 1;
  }

  const content = `-- Migration: ${name}
-- Generated: ${isoNow()}
-- 
-- Describe what this migration does:
-- TODO: Add description
--

-- Up migration
-- TODO: Add SQL statements for applying this migration

-- Down migration (rollback)
-- TODO: Add SQL statements for reverting this migration
`;

  writeFileSync(filepath, content);
  console.log(`Created migration: ${filename}`);
  console.log(`  Path: ${MIGRATIONS_DIR}/${filename}`);
  console.log('\nNext steps:');
  console.log('1. Edit the migration file with your SQL statements');
  console.log('2. Run: node .ai/scripts/migrate.js apply --env dev');
  return 0;
}

function cmdVerify(repoRoot, flags) {
  const { env } = flags;

  console.log('Verifying database mirror...');
  let errors = 0;

  // Check tables file exists
  const tables = loadTables(repoRoot);
  if (!tables) {
    console.error('  ERROR: Tables file not found.');
    errors++;
  } else {
    console.log(`  OK: ${tables.tables.length} table(s) defined`);

    // Validate each table
    for (const t of tables.tables) {
      if (!t.name) {
        console.error('  ERROR: Table missing name');
        errors++;
      }
    }
  }

  // Check environments file
  const envsPath = join(repoRoot, DB_ENVS_FILE);
  if (!existsSync(envsPath)) {
    console.warn('  Warning: db-environments.json not found');
  } else {
    const envs = loadJson(envsPath);
    if (envs && envs.environments) {
      console.log(`  OK: ${envs.environments.length} environment(s) configured`);
      
      if (env) {
        const found = envs.environments.find(e => e.id === env);
        if (!found) {
          console.error(`  ERROR: Environment "${env}" not found`);
          errors++;
        } else {
          console.log(`  OK: Environment "${env}" exists`);
        }
      }
    }
  }

  // Check migrations directory
  const migrationsDir = join(repoRoot, MIGRATIONS_DIR);
  if (existsSync(migrationsDir)) {
    const migrations = readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    console.log(`  OK: ${migrations.length} migration(s) found`);
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
dbctl.js - Database Schema Mirror Management

Usage: node .ai/scripts/dbctl.js <command> [options]

Commands:
  init                Initialize db mirror structure (idempotent)
  
  add-table           Add a table to the schema mirror
    --name <name>     Table name (required)
    --columns <cols>  Column definitions: "col1:type:constraint,col2:type"
    
  remove-table        Remove a table from the schema mirror
    --name <name>     Table name (required)
    
  list-tables         List all tables in the schema
  
  generate-migration  Generate a new migration file
    --name <name>     Migration name (required)
    
  verify              Verify schema consistency
    --env <id>        Verify specific environment exists
    
  help                Show this help message

Global Options:
  --repo-root <path>  Repository root (default: auto-detect)

Examples:
  node .ai/scripts/dbctl.js init
  node .ai/scripts/dbctl.js add-table --name users --columns "id:uuid:pk,email:string:unique"
  node .ai/scripts/dbctl.js generate-migration --name add-user-roles
  node .ai/scripts/dbctl.js verify --env staging
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
    case 'add-table':
      return cmdAddTable(repoRoot, parsed.flags);
    case 'remove-table':
      return cmdRemoveTable(repoRoot, parsed.flags);
    case 'list-tables':
      return cmdListTables(repoRoot);
    case 'generate-migration':
      return cmdGenerateMigration(repoRoot, parsed.flags);
    case 'verify':
      return cmdVerify(repoRoot, parsed.flags);
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

