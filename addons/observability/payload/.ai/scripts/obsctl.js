#!/usr/bin/env node
/**
 * obsctl.js - Observability Management
 *
 * Manages observability contracts (metrics, logs, traces).
 *
 * Commands:
 *   init                    Initialize observability configuration
 *   add-metric              Add a metric definition
 *   remove-metric           Remove a metric definition
 *   list-metrics            List all metrics
 *   add-log-field           Add a log field definition
 *   remove-log-field        Remove a log field
 *   list-log-fields         List all log fields
 *   generate-instrumentation Generate instrumentation hints
 *   verify                  Verify observability configuration
 *   help                    Show this help message
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const OBS_DIR = 'observability';
const OBS_CONFIG_FILE = 'observability/config.json';
const OBS_WORKDOCS_DIR = 'observability/workdocs';
const CONTEXT_OBS_DIR = 'docs/context/observability';
const METRICS_FILE = 'docs/context/observability/metrics-registry.json';
const LOGS_FILE = 'docs/context/observability/logs-schema.json';
const TRACES_FILE = 'docs/context/observability/traces-config.json';

const METRIC_TYPES = ['counter', 'gauge', 'histogram', 'summary'];

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

function loadMetrics(repoRoot) {
  return loadJson(join(repoRoot, METRICS_FILE));
}

function saveMetrics(repoRoot, metrics) {
  metrics.updatedAt = isoNow();
  saveJson(join(repoRoot, METRICS_FILE), metrics);
}

function loadLogs(repoRoot) {
  return loadJson(join(repoRoot, LOGS_FILE));
}

function saveLogs(repoRoot, logs) {
  logs.updatedAt = isoNow();
  saveJson(join(repoRoot, LOGS_FILE), logs);
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

function cmdInit(repoRoot) {
  console.log(`Initializing observability at ${repoRoot}...`);
  let created = false;

  // Create directories
  const dirs = [OBS_DIR, OBS_WORKDOCS_DIR, CONTEXT_OBS_DIR];
  for (const dir of dirs) {
    const fullPath = join(repoRoot, dir);
    if (ensureDir(fullPath)) {
      console.log(`  Created: ${dir}/`);
      created = true;
    }
  }

  // Create config file
  const configPath = join(repoRoot, OBS_CONFIG_FILE);
  if (!existsSync(configPath)) {
    const initialConfig = {
      version: 1,
      updatedAt: isoNow(),
      metrics: true,
      logs: true,
      traces: true,
      platform: null
    };
    saveJson(configPath, initialConfig);
    console.log(`  Created: ${OBS_CONFIG_FILE}`);
    created = true;
  }

  // Create metrics registry
  const metricsPath = join(repoRoot, METRICS_FILE);
  if (!existsSync(metricsPath)) {
    const initialMetrics = {
      version: 1,
      updatedAt: isoNow(),
      metrics: [
        {
          name: 'http_requests_total',
          type: 'counter',
          description: 'Total HTTP requests',
          labels: ['method', 'path', 'status'],
          unit: 'requests'
        },
        {
          name: 'http_request_duration_seconds',
          type: 'histogram',
          description: 'HTTP request duration',
          labels: ['method', 'path'],
          unit: 'seconds',
          buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
        }
      ]
    };
    saveJson(metricsPath, initialMetrics);
    console.log(`  Created: ${METRICS_FILE}`);
    created = true;
  }

  // Create logs schema
  const logsPath = join(repoRoot, LOGS_FILE);
  if (!existsSync(logsPath)) {
    const initialLogs = {
      version: 1,
      updatedAt: isoNow(),
      format: 'json',
      levels: ['debug', 'info', 'warn', 'error'],
      fields: [
        { name: 'timestamp', type: 'string', format: 'iso8601', required: true },
        { name: 'level', type: 'string', enum: ['debug', 'info', 'warn', 'error'], required: true },
        { name: 'message', type: 'string', required: true },
        { name: 'service', type: 'string', required: true },
        { name: 'trace_id', type: 'string', required: false },
        { name: 'span_id', type: 'string', required: false },
        { name: 'user_id', type: 'string', required: false },
        { name: 'request_id', type: 'string', required: false }
      ]
    };
    saveJson(logsPath, initialLogs);
    console.log(`  Created: ${LOGS_FILE}`);
    created = true;
  }

  // Create traces config
  const tracesPath = join(repoRoot, TRACES_FILE);
  if (!existsSync(tracesPath)) {
    const initialTraces = {
      version: 1,
      updatedAt: isoNow(),
      sampling: {
        default: 0.1,
        errorRate: 1.0
      },
      spanNaming: {
        http: '{method} {route}',
        db: '{operation} {table}',
        external: '{service}.{operation}'
      },
      requiredAttributes: [
        'service.name',
        'service.version',
        'deployment.environment'
      ]
    };
    saveJson(tracesPath, initialTraces);
    console.log(`  Created: ${TRACES_FILE}`);
    created = true;
  }

  // Create AGENTS.md
  const agentsPath = join(repoRoot, OBS_DIR, 'AGENTS.md');
  if (!existsSync(agentsPath)) {
    const agentsContent = `# Observability - AI Guidance

## Conclusions (read first)

- Observability contracts are defined in \`docs/context/observability/\`.
- Use \`obsctl.js\` to manage metrics, logs, and traces definitions.
- AI proposes instrumentation; humans implement.

## Contract Files

- \`metrics-registry.json\` - Metric definitions
- \`logs-schema.json\` - Structured log schema
- \`traces-config.json\` - Tracing configuration

## AI Workflow

1. **Review** existing metrics/logs/traces contracts
2. **Propose** new observability points via \`obsctl\`
3. **Generate** instrumentation hints
4. **Document** in \`workdocs/\`

## Metric Types

- \`counter\` - Monotonically increasing value
- \`gauge\` - Value that can go up and down
- \`histogram\` - Distribution of values
- \`summary\` - Similar to histogram, with quantiles

## Log Levels

- \`debug\` - Detailed debugging information
- \`info\` - General operational information
- \`warn\` - Warning conditions
- \`error\` - Error conditions

## Forbidden Actions

- Adding metrics without proper naming convention
- Logging sensitive data (PII, credentials)
- High-cardinality labels on metrics
`;
    writeFileSync(agentsPath, agentsContent);
    console.log(`  Created: ${OBS_DIR}/AGENTS.md`);
    created = true;
  }

  // Create workdocs
  const workdocsReadme = join(repoRoot, OBS_WORKDOCS_DIR, 'alert-runbooks', 'README.md');
  ensureDir(dirname(workdocsReadme));
  if (!existsSync(workdocsReadme)) {
    writeFileSync(workdocsReadme, '# Alert Runbooks\n\nPlace alert-specific runbooks here.\n');
    console.log(`  Created: ${OBS_WORKDOCS_DIR}/alert-runbooks/README.md`);
    created = true;
  }

  if (!created) {
    console.log('  Observability already initialized (no changes).');
  }

  console.log('Done.');
  return 0;
}

function cmdAddMetric(repoRoot, flags) {
  const { name, type, unit, description, labels } = flags;

  if (!name || !type) {
    console.error('Error: --name and --type are required.');
    console.error(`Types: ${METRIC_TYPES.join(', ')}`);
    return 1;
  }

  if (!METRIC_TYPES.includes(type)) {
    console.error(`Error: Invalid type "${type}".`);
    console.error(`Valid types: ${METRIC_TYPES.join(', ')}`);
    return 1;
  }

  const metrics = loadMetrics(repoRoot);
  if (!metrics) {
    console.error('Error: Metrics registry not found. Run `obsctl init` first.');
    return 1;
  }

  if (metrics.metrics.some(m => m.name === name)) {
    console.error(`Error: Metric "${name}" already exists.`);
    return 1;
  }

  const metric = {
    name,
    type,
    description: description || `${name} metric`,
    unit: unit || undefined,
    labels: labels ? labels.split(',').map(l => l.trim()) : []
  };

  metrics.metrics.push(metric);
  saveMetrics(repoRoot, metrics);

  console.log(`Added metric: ${name}`);
  console.log(`  type: ${type}`);
  if (unit) console.log(`  unit: ${unit}`);
  return 0;
}

function cmdRemoveMetric(repoRoot, flags) {
  const { name } = flags;

  if (!name) {
    console.error('Error: --name is required.');
    return 1;
  }

  const metrics = loadMetrics(repoRoot);
  if (!metrics) {
    console.error('Error: Metrics registry not found.');
    return 1;
  }

  const idx = metrics.metrics.findIndex(m => m.name === name);
  if (idx === -1) {
    console.error(`Error: Metric "${name}" not found.`);
    return 1;
  }

  metrics.metrics.splice(idx, 1);
  saveMetrics(repoRoot, metrics);

  console.log(`Removed metric: ${name}`);
  return 0;
}

function cmdListMetrics(repoRoot) {
  const metrics = loadMetrics(repoRoot);
  if (!metrics) {
    console.error('Error: Metrics registry not found.');
    return 1;
  }

  if (metrics.metrics.length === 0) {
    console.log('No metrics defined.');
    return 0;
  }

  console.log(`Metrics (${metrics.metrics.length}):\n`);
  for (const m of metrics.metrics) {
    console.log(`  ${m.name} (${m.type})`);
    if (m.description) console.log(`    ${m.description}`);
    if (m.unit) console.log(`    unit: ${m.unit}`);
    if (m.labels?.length) console.log(`    labels: ${m.labels.join(', ')}`);
    console.log();
  }
  return 0;
}

function cmdAddLogField(repoRoot, flags) {
  const { name, type = 'string', required } = flags;

  if (!name) {
    console.error('Error: --name is required.');
    return 1;
  }

  const logs = loadLogs(repoRoot);
  if (!logs) {
    console.error('Error: Logs schema not found. Run `obsctl init` first.');
    return 1;
  }

  if (logs.fields.some(f => f.name === name)) {
    console.error(`Error: Field "${name}" already exists.`);
    return 1;
  }

  const field = {
    name,
    type,
    required: required === 'true' || required === true
  };

  logs.fields.push(field);
  saveLogs(repoRoot, logs);

  console.log(`Added log field: ${name}`);
  console.log(`  type: ${type}`);
  return 0;
}

function cmdRemoveLogField(repoRoot, flags) {
  const { name } = flags;

  if (!name) {
    console.error('Error: --name is required.');
    return 1;
  }

  const logs = loadLogs(repoRoot);
  if (!logs) {
    console.error('Error: Logs schema not found.');
    return 1;
  }

  const idx = logs.fields.findIndex(f => f.name === name);
  if (idx === -1) {
    console.error(`Error: Field "${name}" not found.`);
    return 1;
  }

  logs.fields.splice(idx, 1);
  saveLogs(repoRoot, logs);

  console.log(`Removed log field: ${name}`);
  return 0;
}

function cmdListLogFields(repoRoot) {
  const logs = loadLogs(repoRoot);
  if (!logs) {
    console.error('Error: Logs schema not found.');
    return 1;
  }

  if (logs.fields.length === 0) {
    console.log('No log fields defined.');
    return 0;
  }

  console.log(`Log Fields (${logs.fields.length}):\n`);
  for (const f of logs.fields) {
    const req = f.required ? ' (required)' : '';
    console.log(`  ${f.name}: ${f.type}${req}`);
  }
  return 0;
}

function cmdGenerateInstrumentation(repoRoot, flags) {
  const { lang = 'typescript' } = flags;

  const metrics = loadMetrics(repoRoot);
  if (!metrics) {
    console.error('Error: Metrics registry not found.');
    return 1;
  }

  console.log(`\n// Instrumentation hints for ${lang}`);
  console.log(`// Generated by obsctl.js - ${isoNow()}\n`);

  if (lang === 'typescript' || lang === 'javascript') {
    console.log(`// Metrics`);
    for (const m of metrics.metrics) {
      const labels = m.labels?.length ? `{ ${m.labels.join(', ')} }` : '';
      if (m.type === 'counter') {
        console.log(`const ${m.name} = meter.createCounter('${m.name}', { description: '${m.description || ''}' });`);
        console.log(`// Usage: ${m.name}.add(1${labels ? `, ${labels}` : ''});`);
      } else if (m.type === 'histogram') {
        console.log(`const ${m.name} = meter.createHistogram('${m.name}', { description: '${m.description || ''}', unit: '${m.unit || ''}' });`);
        console.log(`// Usage: ${m.name}.record(value${labels ? `, ${labels}` : ''});`);
      } else if (m.type === 'gauge') {
        console.log(`const ${m.name} = meter.createObservableGauge('${m.name}', { description: '${m.description || ''}' });`);
        console.log(`// Usage: ${m.name}.addCallback(observableResult => observableResult.observe(value${labels ? `, ${labels}` : ''}));`);
      }
      console.log();
    }
  }

  return 0;
}

function cmdVerify(repoRoot) {
  console.log('Verifying observability configuration...');
  let errors = 0;

  // Check metrics
  const metrics = loadMetrics(repoRoot);
  if (!metrics) {
    console.error('  ERROR: Metrics registry not found.');
    errors++;
  } else {
    console.log(`  OK: ${metrics.metrics.length} metric(s) defined`);
    
    // Check for invalid types
    for (const m of metrics.metrics) {
      if (!METRIC_TYPES.includes(m.type)) {
        console.error(`  ERROR: Invalid metric type "${m.type}" for "${m.name}"`);
        errors++;
      }
    }
  }

  // Check logs
  const logs = loadLogs(repoRoot);
  if (!logs) {
    console.error('  ERROR: Logs schema not found.');
    errors++;
  } else {
    console.log(`  OK: ${logs.fields.length} log field(s) defined`);
  }

  // Check traces
  const tracesPath = join(repoRoot, TRACES_FILE);
  if (!existsSync(tracesPath)) {
    console.warn('  Warning: Traces config not found.');
  } else {
    console.log(`  OK: Traces config exists`);
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
obsctl.js - Observability Management

Usage: node .ai/scripts/obsctl.js <command> [options]

Commands:
  init                    Initialize observability configuration
  
  add-metric              Add a metric definition
    --name <n>            Metric name (required)
    --type <t>            Type: counter, gauge, histogram, summary (required)
    --unit <u>            Unit (e.g., seconds, bytes)
    --description <d>     Description
    --labels <l>          Comma-separated label names
    
  remove-metric           Remove a metric definition
    --name <n>            Metric name (required)
    
  list-metrics            List all metrics
  
  add-log-field           Add a log field definition
    --name <n>            Field name (required)
    --type <t>            Type (default: string)
    --required <bool>     Required field (default: false)
    
  remove-log-field        Remove a log field
    --name <n>            Field name (required)
    
  list-log-fields         List all log fields
  
  generate-instrumentation Generate instrumentation hints
    --lang <l>            Language: typescript, javascript (default: typescript)
    
  verify                  Verify observability configuration
  
  help                    Show this help message

Global Options:
  --repo-root <path>      Repository root (default: auto-detect)

Examples:
  node .ai/scripts/obsctl.js init
  node .ai/scripts/obsctl.js add-metric --name api_latency --type histogram --unit seconds
  node .ai/scripts/obsctl.js add-log-field --name correlation_id --type string
  node .ai/scripts/obsctl.js generate-instrumentation --lang typescript
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
    case 'add-metric':
      return cmdAddMetric(repoRoot, parsed.flags);
    case 'remove-metric':
      return cmdRemoveMetric(repoRoot, parsed.flags);
    case 'list-metrics':
      return cmdListMetrics(repoRoot);
    case 'add-log-field':
      return cmdAddLogField(repoRoot, parsed.flags);
    case 'remove-log-field':
      return cmdRemoveLogField(repoRoot, parsed.flags);
    case 'list-log-fields':
      return cmdListLogFields(repoRoot);
    case 'generate-instrumentation':
      return cmdGenerateInstrumentation(repoRoot, parsed.flags);
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

