#!/usr/bin/env node

/**
 * agent_builder helper script (dependency-free).
 *
 * Commands:
 *   start
 *   status --workdir <dir>
 *   validate-blueprint --workdir <dir> [--blueprint <path>] [--format json|text]
 *   plan --workdir <dir> --repo-root <repo> [--apply]   (plan is always dry-run; apply is separate)
 *   apply --workdir <dir> --repo-root <repo> --apply
 *   approve --workdir <dir> --stage <A|B|C|D|E>
 *   finish --workdir <dir> [--force]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SKILL_ROOT = path.resolve(__dirname, '..');
const TEMPLATES = path.join(SKILL_ROOT, 'templates');

const STATE_FILE = '.agent-builder-state.json';

function nowIso() {
  return new Date().toISOString();
}

function randId(n = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function ensureDir(p, apply) {
  if (!apply) return { ok: true, action: 'mkdir', path: p, applied: false };
  fs.mkdirSync(p, { recursive: true });
  return { ok: true, action: 'mkdir', path: p, applied: true };
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeText(p, content, apply, overwrite = false) {
  if (fs.existsSync(p) && !overwrite) {
    return { ok: true, action: 'skip', path: p, reason: 'exists' };
  }
  if (!apply) {
    return { ok: true, action: 'write', path: p, applied: false };
  }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
  return { ok: true, action: 'write', path: p, applied: true };
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj, apply, overwrite = false) {
  return writeText(p, JSON.stringify(obj, null, 2) + '\n', apply, overwrite);
}

function loadState(workdir) {
  const p = path.join(workdir, STATE_FILE);
  if (!fs.existsSync(p)) return null;
  return readJson(p);
}

function saveState(workdir, state, apply) {
  const p = path.join(workdir, STATE_FILE);
  writeJson(p, state, apply, true);
}

function recordEvent(state, event, details) {
  state.history = state.history || [];
  state.history.push({ timestamp: nowIso(), event, details: details || {} });
}

function isSafeTempWorkdir(workdir) {
  const normalized = path.resolve(workdir);
  const base = path.resolve(path.join(os.tmpdir(), 'agent_builder'));
  return normalized.startsWith(base + path.sep);
}

function removeDirRecursive(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest, apply, replacements) {
  const ext = path.extname(src).toLowerCase();
  const isText = ['.md', '.txt', '.json', '.js', '.ts', '.yml', '.yaml', '.env', '.gitignore'].includes(ext) || src.endsWith('.template');
  if (fs.existsSync(dest)) return { ok: true, action: 'skip', path: dest, reason: 'exists' };

  if (!apply) return { ok: true, action: 'write', path: dest, applied: false };

  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (isText) {
    let content = fs.readFileSync(src, 'utf8');
    if (replacements) {
      for (const [k, v] of Object.entries(replacements)) {
        content = content.split(k).join(String(v));
      }
    }
    // strip ".template" suffix on write if present in dest path already handled by caller
    fs.writeFileSync(dest, content, 'utf8');
  } else {
    fs.copyFileSync(src, dest);
  }
  return { ok: true, action: 'write', path: dest, applied: true };
}

function walkFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

function pickBlueprintPath(args, workdir, state) {
  if (args.blueprint) return path.resolve(args.blueprint);
  if (state && state.blueprint_path) return path.resolve(workdir, state.blueprint_path);
  return path.join(workdir, 'stageB', 'agent-blueprint.json');
}

function schemaRefKey(ref) {
  // "#/schemas/RunRequest" -> "RunRequest"
  if (typeof ref !== 'string') return null;
  const m = ref.match(/^#\/schemas\/([A-Za-z0-9_]+)$/);
  return m ? m[1] : null;
}

function validateBlueprint(blueprint) {
  const errors = [];
  const warnings = [];

  function req(cond, msg) { if (!cond) errors.push(msg); }
  function warn(cond, msg) { if (!cond) warnings.push(msg); }

  req(blueprint && typeof blueprint === 'object', 'Blueprint must be a JSON object.');
  if (!blueprint || typeof blueprint !== 'object') return { ok: false, errors, warnings };

  req(blueprint.kind === 'agent_blueprint', 'kind must be "agent_blueprint".');
  req(Number.isInteger(blueprint.version) && blueprint.version >= 1, 'version must be an integer >= 1.');

  const agent = blueprint.agent || {};
  req(typeof agent.id === 'string' && agent.id.length > 0, 'agent.id is required (string).');
  req(typeof agent.name === 'string' && agent.name.length > 0, 'agent.name is required (string).');
  req(typeof agent.summary === 'string' && agent.summary.length > 0, 'agent.summary is required (string).');
  req(Array.isArray(agent.owners) && agent.owners.length > 0, 'agent.owners is required (non-empty array).');

  const scope = blueprint.scope || {};
  req(Array.isArray(scope.in_scope) && scope.in_scope.length > 0, 'scope.in_scope is required (non-empty array).');
  req(Array.isArray(scope.out_of_scope) && scope.out_of_scope.length > 0, 'scope.out_of_scope is required (non-empty array).');
  req(typeof scope.definition_of_done === 'string' && scope.definition_of_done.length > 0, 'scope.definition_of_done is required (string).');

  const integration = blueprint.integration || {};
  req(integration.primary === 'api', 'integration.primary must be "api" in v1.');
  const attach = Array.isArray(integration.attach) ? integration.attach : [];
  const allowedAttach = new Set(['worker','sdk','cron','pipeline']);
  for (const a of attach) req(allowedAttach.has(a), `integration.attach contains unsupported value: ${a}`);

  // failure contract
  const failMode = integration.failure_contract?.mode;
  const allowedFail = new Set(['propagate_error','return_fallback','enqueue_retry']);
  req(allowedFail.has(failMode), `integration.failure_contract.mode must be one of: ${Array.from(allowedFail).join(', ')}`);
  // explicit disallow (defense-in-depth)
  req(failMode !== 'suppress_and_alert', 'integration.failure_contract.mode must not be "suppress_and_alert".');

  // rollback contract
  const rb = integration.rollback_or_disable?.method;
  const allowedRb = new Set(['feature_flag','config_toggle','route_switch','deployment_rollback']);
  req(allowedRb.has(rb), `integration.rollback_or_disable.method must be one of: ${Array.from(allowedRb).join(', ')}`);

  // schemas
  const schemas = blueprint.schemas || {};
  req(schemas && typeof schemas === 'object', 'schemas is required (object).');
  req(!!schemas.RunRequest, 'schemas.RunRequest is required.');
  req(!!schemas.RunResponse, 'schemas.RunResponse is required.');
  req(!!schemas.AgentError, 'schemas.AgentError is required.');

  // contract refs
  const upKey = schemaRefKey(integration.upstream_contract_ref);
  const downKey = schemaRefKey(integration.downstream_contract_ref);
  req(!!upKey, 'integration.upstream_contract_ref must match "#/schemas/<Name>".');
  req(!!downKey, 'integration.downstream_contract_ref must match "#/schemas/<Name>".');
  if (upKey) req(!!schemas[upKey], `integration.upstream_contract_ref references missing schema: ${upKey}`);
  if (downKey) req(!!schemas[downKey], `integration.downstream_contract_ref references missing schema: ${downKey}`);

  // interfaces
  const interfaces = Array.isArray(blueprint.interfaces) ? blueprint.interfaces : [];
  req(interfaces.length > 0, 'interfaces is required (non-empty array).');

  const hasType = (t) => interfaces.some((i) => i && i.type === t);
  req(hasType('http'), 'interfaces must include type "http" when primary=api.');

  for (const a of attach) {
    req(hasType(a), `interfaces must include type "${a}" because it is included in integration.attach.`);
  }

  // api config
  const api = blueprint.api || null;
  req(!!api, 'api config block is required when primary=api.');
  if (api) {
    req(typeof api.base_path === 'string' && api.base_path.length > 0, 'api.base_path is required (string).');
    req(Array.isArray(api.routes) && api.routes.length >= 2, 'api.routes must be an array with at least 2 routes.');
    const routeNames = new Set((api.routes || []).map(r => r?.name).filter(Boolean));
    req(routeNames.has('run'), 'api.routes must include name="run".');
    req(routeNames.has('health'), 'api.routes must include name="health".');

    for (const r of api.routes || []) {
      if (!r) continue;
      req(r.name === 'run' || r.name === 'health', 'api.routes[].name must be "run" or "health".');
    }
  }

  // optional blocks required by attach
  if (attach.includes('worker')) req(!!blueprint.worker, 'worker block is required because attach includes "worker".');
  if (attach.includes('sdk')) req(!!blueprint.sdk, 'sdk block is required because attach includes "sdk".');
  if (attach.includes('cron')) req(!!blueprint.cron, 'cron block is required because attach includes "cron".');
  if (attach.includes('pipeline')) req(!!blueprint.pipeline, 'pipeline block is required because attach includes "pipeline".');

  // deliverables
  const del = blueprint.deliverables || {};
  req(typeof del.agent_module_path === 'string' && del.agent_module_path.length > 0, 'deliverables.agent_module_path is required (string).');
  req(typeof del.docs_path === 'string' && del.docs_path.length > 0, 'deliverables.docs_path is required (string).');
  req(typeof del.registry_path === 'string' && del.registry_path.length > 0, 'deliverables.registry_path is required (string).');
  req(del.core_adapter_separation === 'required', 'deliverables.core_adapter_separation must be "required".');

  // acceptance
  const acc = blueprint.acceptance || {};
  req(Array.isArray(acc.scenarios) && acc.scenarios.length >= 3, 'acceptance.scenarios must be an array with at least 3 scenarios.');

  // model
  const model = blueprint.model || {};
  req(!!model.primary, 'model.primary is required.');
  if (model.primary) {
    req(typeof model.primary.model === 'string' && model.primary.model.length > 0, 'model.primary.model is required (string).');
    req(typeof model.primary.reasoning_profile === 'string' && model.primary.reasoning_profile.length > 0, 'model.primary.reasoning_profile is required (string).');
  }

  // config env vars
  const cfg = blueprint.configuration || {};
  const envs = Array.isArray(cfg.env_vars) ? cfg.env_vars : [];
  req(envs.length > 0, 'configuration.env_vars must be a non-empty array.');
  warn(envs.some(e => e?.name === 'AGENT_ENABLED'), 'Recommended env var AGENT_ENABLED not present.');
  warn(envs.some(e => e?.name === 'LLM_API_KEY'), 'Recommended env var LLM_API_KEY not present.');
  warn(envs.some(e => e?.name === 'LLM_MODEL'), 'Recommended env var LLM_MODEL not present.');

  return { ok: errors.length === 0, errors, warnings };
}

function printValidateResult(res, format) {
  if (format === 'json') {
    console.log(JSON.stringify(res, null, 2));
    return;
  }
  if (res.ok) console.log('Blueprint: OK');
  else console.log('Blueprint: INVALID');

  if (res.errors?.length) {
    console.log('\nErrors:');
    for (const e of res.errors) console.log(`- ${e}`);
  }
  if (res.warnings?.length) {
    console.log('\nWarnings:');
    for (const w of res.warnings) console.log(`- ${w}`);
  }
}

function buildReplacements(blueprint) {
  const agent = blueprint.agent || {};
  const api = blueprint.api || {};
  const model = blueprint.model?.primary || {};
  const reasoning = model.reasoning_profile || 'fast';
  const pkgName = (blueprint.sdk && blueprint.sdk.package && blueprint.sdk.package.name)
    ? blueprint.sdk.package.name
    : `agent-${agent.id || 'agent'}`;

  return {
    '__AGENT_ID__': agent.id || 'agent_id',
    '__AGENT_NAME__': agent.name || 'Agent',
    '__AGENT_SUMMARY__': agent.summary || '',
    '__AGENT_BASE_PATH__': api.base_path || `/agent/${agent.id || 'agent'}`,
    '__LLM_MODEL__': model.model || 'gpt-4.1',
    '__LLM_REASONING_PROFILE__': reasoning,
    '__AGENT_PKG_NAME__': pkgName
  };
}

function selectedPromptTier(blueprint) {
  const tier = blueprint.prompting?.complexity_tier;
  if (tier === 'tier1' || tier === 'tier2' || tier === 'tier3') return tier;
  return 'tier2';
}

function planScaffold(repoRoot, blueprint) {
  const ops = [];
  const del = blueprint.deliverables;
  const moduleRoot = path.resolve(repoRoot, del.agent_module_path);
  const docsRoot = path.resolve(repoRoot, del.docs_path);
  const registryPath = path.resolve(repoRoot, del.registry_path);

  ops.push({ action: 'mkdir', path: moduleRoot });
  ops.push({ action: 'mkdir', path: docsRoot });
  ops.push({ action: 'update', path: registryPath, reason: 'agent registry' });

  // agent kit files
  const layout = path.join(TEMPLATES, 'agent-kit', 'node', 'layout');
  const files = walkFiles(layout);
  const attach = new Set(blueprint.integration.attach || []);
  for (const f of files) {
    const rel = path.relative(layout, f).replace(/\\/g, '/');
    if (rel.startsWith('src/adapters/worker') && !attach.has('worker')) continue;
    if (rel.startsWith('src/adapters/sdk') && !attach.has('sdk')) continue;
    if (rel.startsWith('src/adapters/cron') && !attach.has('cron')) continue;
    if (rel.startsWith('src/adapters/pipeline') && !attach.has('pipeline')) continue;

    const destRel = rel.replace(/\.template$/, '');
    ops.push({ action: 'write', path: path.join(moduleRoot, destRel), template: rel });
  }

  // prompt pack files
  const tier = selectedPromptTier(blueprint);
  const promptDir = path.join(TEMPLATES, 'prompt-pack', tier);
  const promptFiles = walkFiles(promptDir);
  for (const f of promptFiles) {
    const rel = path.relative(promptDir, f).replace(/\\/g, '/');
    ops.push({ action: 'write', path: path.join(moduleRoot, 'prompts', rel), template: `prompt-pack/${tier}/${rel}` });
  }

  // schemas written from blueprint.schemas
  ops.push({ action: 'write', path: path.join(moduleRoot, 'schemas', 'RunRequest.schema.json') });
  ops.push({ action: 'write', path: path.join(moduleRoot, 'schemas', 'RunResponse.schema.json') });
  ops.push({ action: 'write', path: path.join(moduleRoot, 'schemas', 'AgentError.schema.json') });

  // docs (generated)
  const docFiles = ['overview.md','integration.md','configuration.md','dataflow.md','runbook.md','evaluation.md'];
  for (const f of docFiles) {
    ops.push({ action: 'write', path: path.join(docsRoot, f) });
  }

  return { ops, moduleRoot, docsRoot, registryPath };
}

function renderDocs(blueprint) {
  const agent = blueprint.agent;
  const integration = blueprint.integration;
  const del = blueprint.deliverables;
  const api = blueprint.api;
  const attach = integration.attach || [];
  const owners = (agent.owners || []).map(o => `- ${o.type}: ${o.id}${o.contact ? ` (${o.contact})` : ''}`).join('\n');

  const inScope = (blueprint.scope.in_scope || []).map(s => `- ${s}`).join('\n');
  const outScope = (blueprint.scope.out_of_scope || []).map(s => `- ${s}`).join('\n');

  const entrypoints = (blueprint.interfaces || [])
    .map(i => `- ${i.type}: ${i.entrypoint}`)
    .join('\n');

  const overview = [
    `# ${agent.name} (${agent.id})`,
    '',
    agent.summary,
    '',
    '## Owners',
    owners || '- (unassigned)',
    '',
    '## Entrypoints',
    entrypoints || '- (none)',
    '',
    '## Scope',
    '### In scope',
    inScope || '- (none)',
    '',
    '### Out of scope',
    outScope || '- (none)',
    '',
    '## Definition of Done',
    blueprint.scope.definition_of_done || '',
    ''
  ].join('\n');

  const integrationMd = [];
  integrationMd.push('# Integration');
  integrationMd.push('');
  integrationMd.push('## Embedding decisions (user-approved)');
  integrationMd.push(`- Primary: ${integration.primary}`);
  integrationMd.push(`- Attach: ${attach.length ? attach.join(', ') : '(none)'}`);
  integrationMd.push(`- Target: ${integration.target?.kind || ''} ${integration.target?.name || ''}`);
  integrationMd.push(`- Trigger: ${integration.trigger?.kind || ''}`);
  integrationMd.push('');
  integrationMd.push('## Contracts');
  integrationMd.push(`- Upstream: ${integration.upstream_contract_ref}`);
  integrationMd.push(`- Downstream: ${integration.downstream_contract_ref}`);
  integrationMd.push('');
  integrationMd.push('## Failure contract');
  integrationMd.push(`- Mode: ${integration.failure_contract?.mode}`);
  integrationMd.push('');
  integrationMd.push('## Rollback / disable');
  integrationMd.push(`- Method: ${integration.rollback_or_disable?.method}`);
  if (integration.rollback_or_disable?.key) integrationMd.push(`- Key: ${integration.rollback_or_disable.key}`);
  integrationMd.push('');

  if (api) {
    integrationMd.push('## API');
    integrationMd.push(`- Base path: ${api.base_path}`);
    integrationMd.push('- Routes:');
    for (const r of api.routes || []) {
      integrationMd.push(`  - ${r.name}: ${String(r.method).toUpperCase()} ${api.base_path}${r.path}`);
    }
    integrationMd.push('');
  }

  if (attach.includes('worker') && blueprint.worker) {
    const w = blueprint.worker;
    integrationMd.push('## Worker (attach)');
    integrationMd.push(`- Source: ${w.source?.kind || ''} ${w.source?.name || ''}`);
    integrationMd.push(`- Concurrency: ${w.execution?.max_concurrency}`);
    integrationMd.push(`- Timeout: ${w.execution?.timeout_ms} ms`);
    integrationMd.push(`- Retries: ${w.retry?.max_attempts} (${w.retry?.backoff?.strategy || ''})`);
    integrationMd.push(`- Idempotency: ${w.idempotency?.strategy} ${w.idempotency?.key_ref || ''}`.trim());
    integrationMd.push('');
  }

  if (attach.includes('cron') && blueprint.cron) {
    const c = blueprint.cron;
    integrationMd.push('## Cron (attach)');
    integrationMd.push(`- Schedule: ${c.schedule} (${c.timezone})`);
    integrationMd.push(`- Input: ${c.input?.mode}${c.input?.env_var ? ` env:${c.input.env_var}` : ''}${c.input?.path ? ` path:${c.input.path}` : ''}`);
    integrationMd.push(`- Output: ${c.output?.mode}${c.output?.path ? ` path:${c.output.path}` : ''}`);
    integrationMd.push('');
  }

  if (attach.includes('pipeline') && blueprint.pipeline) {
    const p = blueprint.pipeline;
    integrationMd.push('## Pipeline (attach)');
    integrationMd.push(`- Kind: ${p.kind}`);
    integrationMd.push(`- IO: ${p.io?.input_mode} -> ${p.io?.output_mode}`);
    integrationMd.push('');
  }

  if (attach.includes('sdk') && blueprint.sdk) {
    const s = blueprint.sdk;
    integrationMd.push('## SDK (attach)');
    integrationMd.push(`- Language: ${s.language}`);
    integrationMd.push(`- Package: ${s.package?.name}@${s.package?.version}`);
    integrationMd.push('- Exports:');
    for (const ex of s.exports || []) {
      integrationMd.push(`  - ${ex.name}(${ex.input_schema_ref}) -> ${ex.output_schema_ref}`);
    }
    integrationMd.push('');
  }

  const envVars = (blueprint.configuration?.env_vars || [])
    .map(v => `| ${v.name} | ${v.required ? 'Yes' : 'No'} | ${v.sensitivity} | ${String(v.description || '').replace(/\n/g, ' ')} |`)
    .join('\n');

  const cfgMd = [
    '# Configuration',
    '',
    '## Environment variables',
    '',
    '| Name | Required | Sensitivity | Description |',
    '|------|----------|-------------|-------------|',
    envVars || '| (none) | | | |',
    '',
    '## Config files',
    ...(blueprint.configuration?.config_files || []).map(f => `- \`${f.path}\`: ${f.purpose}`),
    ''
  ].join('\n');

  const df = blueprint.data_flow || {};
  const dataflowMd = [
    '# Data Flow',
    '',
    '## Summary',
    df.summary || 'TBD: Describe upstream inputs, what is sent to the LLM, and downstream outputs.',
    '',
    '## Data classification',
    (df.data_classes && df.data_classes.length)
      ? df.data_classes.map(x => `- ${x}`).join('\n')
      : '- TBD',
    '',
    '## Mermaid diagram',
    '```mermaid',
    df.diagram_mermaid || 'flowchart LR\n  A[Upstream] --> B[Agent]\n  B --> C[Downstream]',
    '```',
    ''
  ].join('\n');

  const rb = integration.rollback_or_disable || {};
  const runbookMd = [
    '# Runbook',
    '',
    '## Run / start',
    `- API: \`node ${del.agent_module_path}/src/adapters/http/server.js\``,
    attach.includes('worker') ? `- Worker: \`node ${del.agent_module_path}/src/adapters/worker/worker.js\`` : '',
    attach.includes('cron') ? `- Cron: \`node ${del.agent_module_path}/src/adapters/cron/run-cron.js\`` : '',
    attach.includes('pipeline') ? `- Pipeline: \`node ${del.agent_module_path}/src/adapters/pipeline/run-step.js < in.json > out.json\`` : '',
    '',
    '## Health checks',
    api ? `- GET ${api.base_path}/health` : '- TBD',
    '',
    '## Rollback / disable',
    `- Method: ${rb.method || 'TBD'}`,
    rb.key ? `- Key: ${rb.key}` : '',
    '',
    '## Troubleshooting',
    '- Check AGENT_ENABLED',
    '- Check LLM credentials and base URL',
    '- Inspect logs for request_id/correlation fields',
    ''
  ].filter(Boolean).join('\n');

  const scenarios = (blueprint.acceptance?.scenarios || []).map((s, idx) => [
    `${idx + 1}. **${s.title}** (${s.priority})`,
    `   - Given: ${s.given}`,
    `   - When: ${s.when}`,
    `   - Then: ${s.then}`,
    `   - Checks: ${Array.isArray(s.expected_output_checks) ? s.expected_output_checks.join('; ') : ''}`
  ].join('\n')).join('\n\n');

  const evalMd = [
    '# Evaluation',
    '',
    '## Acceptance scenarios',
    '',
    scenarios || 'TBD',
    '',
    '## How to run (suggested)',
    '',
    '```bash',
    `# From repo root:`,
    `cd ${del.agent_module_path}`,
    `node src/tests/smoke.test.js`,
    '```',
    ''
  ].join('\n');

  return {
    'overview.md': overview,
    'integration.md': integrationMd.join('\n'),
    'configuration.md': cfgMd,
    'dataflow.md': dataflowMd,
    'runbook.md': runbookMd,
    'evaluation.md': evalMd,
  };
}

function updateRegistry(registryPath, blueprint, apply) {
  let registry = { version: 1, agents: [] };

  if (fs.existsSync(registryPath)) {
    try {
      registry = readJson(registryPath);
    } catch (e) {
      return { ok: false, action: 'error', path: registryPath, reason: 'failed to parse registry.json' };
    }
  }

  if (!registry || typeof registry !== 'object') registry = { version: 1, agents: [] };
  if (!Array.isArray(registry.agents)) registry.agents = [];

  const id = blueprint.agent.id;
  const entry = {
    id,
    name: blueprint.agent.name,
    summary: blueprint.agent.summary,
    owners: blueprint.agent.owners || [],
    primary: blueprint.integration.primary,
    attach: blueprint.integration.attach || [],
    module_path: blueprint.deliverables.agent_module_path,
    docs_path: blueprint.deliverables.docs_path,
    interfaces: (blueprint.interfaces || []).map(i => ({ type: i.type, entrypoint: i.entrypoint })),
    last_generated_at: nowIso(),
    status: 'active'
  };

  const idx = registry.agents.findIndex(a => a && a.id === id);
  if (idx >= 0) registry.agents[idx] = entry;
  else registry.agents.push(entry);

  return writeJson(registryPath, registry, apply, true);
}

function cmdStart(args) {
  const runId = `ab_${new Date().toISOString().replace(/[:.]/g, '-')}_${randId(5)}`;
  const defaultWorkdir = path.join(os.tmpdir(), 'agent_builder', runId);
  const workdir = path.resolve(args.workdir || defaultWorkdir);

  ensureDir(workdir, true);
  ensureDir(path.join(workdir, 'stageA'), true);
  ensureDir(path.join(workdir, 'stageB'), true);
  ensureDir(path.join(workdir, 'stageC'), true);
  ensureDir(path.join(workdir, 'stageD'), true);
  ensureDir(path.join(workdir, 'stageE'), true);

  // Copy Stage A templates
  writeText(path.join(workdir, 'stageA', 'conversation-prompts.md'), readText(path.join(TEMPLATES, 'conversation-prompts.md')), true, true);
  writeText(path.join(workdir, 'stageA', 'interview-notes.md'), readText(path.join(TEMPLATES, 'interview-notes.template.md')), true, true);
  writeText(path.join(workdir, 'stageA', 'integration-decision.md'), readText(path.join(TEMPLATES, 'integration-decision.template.md')), true, true);

  // Copy Stage B references/examples
  writeText(path.join(workdir, 'stageB', 'agent-blueprint.schema.json'), readText(path.join(TEMPLATES, 'agent-blueprint.schema.json')), true, true);
  for (const ex of [
    'agent-blueprint.example.api-worker.json',
    'agent-blueprint.example.api-sdk.json',
    'agent-blueprint.example.full.json'
  ]) {
    writeText(path.join(workdir, 'stageB', ex), readText(path.join(TEMPLATES, ex)), true, true);
  }

  // Draft blueprint starter (copy the API+worker example by default)
  writeText(
    path.join(workdir, 'stageB', 'agent-blueprint.json'),
    readText(path.join(TEMPLATES, 'agent-blueprint.example.api-worker.json')),
    true,
    false
  );

  const state = {
    version: 1,
    run_id: runId,
    created_at: nowIso(),
    workdir,
    stage: 'A',
    blueprint_path: path.join('stageB', 'agent-blueprint.json'),
    stages: {
      A: { status: 'in_progress', user_approved: false, artifacts: ['stageA/interview-notes.md','stageA/integration-decision.md'] },
      B: { status: 'not_started', user_approved: false, artifacts: ['stageB/agent-blueprint.json'] },
      C: { status: 'not_started', user_approved: false },
      D: { status: 'not_started', user_approved: false },
      E: { status: 'not_started', user_approved: false }
    },
    history: []
  };
  recordEvent(state, 'start', { workdir });
  saveState(workdir, state, true);

  console.log('========================================');
  console.log(' agent_builder run created');
  console.log('========================================');
  console.log(`workdir: ${workdir}`);
  console.log('');
  console.log('Next steps:');
  console.log(`1) Fill Stage A notes: ${path.join(workdir, 'stageA')}`);
  console.log('2) Draft blueprint: stageB/agent-blueprint.json');
  console.log('3) Validate: validate-blueprint --workdir <workdir>');
  console.log('4) Plan/apply scaffold into repo: plan/apply --repo-root <repo>');
  console.log('');
  console.log('NOTE: Stage A must remain temporary; do not commit this workdir.');
}

function cmdStatus(args) {
  const workdir = args.workdir ? path.resolve(args.workdir) : null;
  if (!workdir) {
    console.error('Missing --workdir');
    process.exit(2);
  }
  const state = loadState(workdir);
  if (!state) {
    console.error(`No state file found in workdir: ${workdir}`);
    process.exit(2);
  }

  console.log(`run_id: ${state.run_id}`);
  console.log(`stage: ${state.stage}`);
  console.log('');
  console.log('Stage summary:');
  for (const k of ['A','B','C','D','E']) {
    const s = state.stages?.[k] || {};
    console.log(`- ${k}: status=${s.status || 'n/a'} user_approved=${!!s.user_approved}`);
  }

  console.log('');
  console.log('Suggested next action:');
  if (!state.stages?.A?.user_approved) {
    console.log('- Complete Stage A and run: approve --stage A');
  } else if (!state.stages?.B?.user_approved) {
    console.log('- Draft/validate blueprint and run: approve --stage B');
  } else if (!state.stages?.C?.user_approved) {
    console.log('- Plan/apply scaffold and run: approve --stage C');
  } else if (!state.stages?.D?.user_approved) {
    console.log('- Implement core logic/tools and run: approve --stage D');
  } else if (!state.stages?.E?.user_approved) {
    console.log('- Verify + docs + cleanup and run: approve --stage E, then finish');
  } else {
    console.log('- All stages approved. Run finish to cleanup.');
  }
}

function cmdApprove(args) {
  const workdir = args.workdir ? path.resolve(args.workdir) : null;
  const stage = args.stage;
  if (!workdir) {
    console.error('Missing --workdir');
    process.exit(2);
  }
  if (!stage || !['A','B','C','D','E'].includes(stage)) {
    console.error('Missing/invalid --stage (A|B|C|D|E)');
    process.exit(2);
  }
  const state = loadState(workdir);
  if (!state) {
    console.error(`No state file found in workdir: ${workdir}`);
    process.exit(2);
  }

  state.stages = state.stages || {};
  state.stages[stage] = state.stages[stage] || {};
  state.stages[stage].user_approved = true;
  state.stages[stage].status = 'approved';
  state.stage = stage === 'E' ? 'DONE' : String.fromCharCode(stage.charCodeAt(0) + 1);

  recordEvent(state, 'approve', { stage });
  saveState(workdir, state, true);

  console.log(`Approved stage ${stage}. Current stage is now ${state.stage}.`);
}

function cmdValidateBlueprint(args) {
  const workdir = args.workdir ? path.resolve(args.workdir) : null;
  if (!workdir) {
    console.error('Missing --workdir');
    process.exit(2);
  }
  const state = loadState(workdir);
  const blueprintPath = pickBlueprintPath(args, workdir, state);

  if (!fs.existsSync(blueprintPath)) {
    console.error(`Blueprint not found: ${blueprintPath}`);
    process.exit(2);
  }

  let bp;
  try {
    bp = readJson(blueprintPath);
  } catch (e) {
    console.error(`Failed to parse JSON: ${blueprintPath}`);
    process.exit(2);
  }

  const res = validateBlueprint(bp);
  printValidateResult(res, args.format === 'json' ? 'json' : 'text');

  if (res.ok && state) {
    state.stages.B.status = 'ready_for_review';
    recordEvent(state, 'validate_blueprint', { ok: true, blueprintPath });
    saveState(workdir, state, true);
  }

  if (!res.ok) process.exit(1);
}

function cmdPlan(args) {
  const workdir = args.workdir ? path.resolve(args.workdir) : null;
  const repoRoot = args['repo-root'] ? path.resolve(args['repo-root']) : null;
  if (!workdir) {
    console.error('Missing --workdir');
    process.exit(2);
  }
  if (!repoRoot) {
    console.error('Missing --repo-root');
    process.exit(2);
  }

  const state = loadState(workdir);
  const blueprintPath = pickBlueprintPath(args, workdir, state);
  const bp = readJson(blueprintPath);
  const val = validateBlueprint(bp);
  if (!val.ok) {
    console.error('Blueprint is invalid. Fix errors before planning.');
    printValidateResult(val, 'text');
    process.exit(1);
  }

  const plan = planScaffold(repoRoot, bp);
  console.log('Planned operations (dry-run):');
  for (const op of plan.ops) {
    console.log(`- ${op.action.toUpperCase()} ${path.relative(repoRoot, op.path)}`);
  }
}

function cmdApply(args) {
  const workdir = args.workdir ? path.resolve(args.workdir) : null;
  const repoRoot = args['repo-root'] ? path.resolve(args['repo-root']) : null;
  const apply = !!args.apply;
  if (!workdir) {
    console.error('Missing --workdir');
    process.exit(2);
  }
  if (!repoRoot) {
    console.error('Missing --repo-root');
    process.exit(2);
  }
  if (!apply) {
    console.error('Refusing to write without --apply. (Run `plan` first.)');
    process.exit(2);
  }

  const state = loadState(workdir);
  const blueprintPath = pickBlueprintPath(args, workdir, state);
  const bp = readJson(blueprintPath);
  const val = validateBlueprint(bp);
  if (!val.ok) {
    console.error('Blueprint is invalid. Fix errors before apply.');
    printValidateResult(val, 'text');
    process.exit(1);
  }

  const replacements = buildReplacements(bp);
  const plan = planScaffold(repoRoot, bp);

  // directories
  ensureDir(plan.moduleRoot, true);
  ensureDir(plan.docsRoot, true);

  // copy agent kit files
  const layout = path.join(TEMPLATES, 'agent-kit', 'node', 'layout');
  const files = walkFiles(layout);
  const attach = new Set(bp.integration.attach || []);
  for (const f of files) {
    const rel = path.relative(layout, f).replace(/\\/g, '/');
    if (rel.startsWith('src/adapters/worker') && !attach.has('worker')) continue;
    if (rel.startsWith('src/adapters/sdk') && !attach.has('sdk')) continue;
    if (rel.startsWith('src/adapters/cron') && !attach.has('cron')) continue;
    if (rel.startsWith('src/adapters/pipeline') && !attach.has('pipeline')) continue;

    const destRel = rel.replace(/\.template$/, '');
    const dest = path.join(plan.moduleRoot, destRel);
    copyFile(f, dest, true, replacements);
  }

  // prompt pack copy
  const tier = selectedPromptTier(bp);
  const promptDir = path.join(TEMPLATES, 'prompt-pack', tier);
  const promptFiles = walkFiles(promptDir);
  for (const f of promptFiles) {
    const rel = path.relative(promptDir, f).replace(/\\/g, '/');
    const dest = path.join(plan.moduleRoot, 'prompts', rel);
    copyFile(f, dest, true, replacements);
  }

  // schemas from blueprint.schemas
  writeJson(path.join(plan.moduleRoot, 'schemas', 'RunRequest.schema.json'), bp.schemas.RunRequest, true, false);
  writeJson(path.join(plan.moduleRoot, 'schemas', 'RunResponse.schema.json'), bp.schemas.RunResponse, true, false);
  writeJson(path.join(plan.moduleRoot, 'schemas', 'AgentError.schema.json'), bp.schemas.AgentError, true, false);

  // docs generation
  const docs = renderDocs(bp);
  for (const [name, content] of Object.entries(docs)) {
    writeText(path.join(plan.docsRoot, name), content + '\n', true, false);
  }

  // registry update
  const regRes = updateRegistry(plan.registryPath, bp, true);
  if (!regRes.ok) {
    console.error(`Failed to update registry: ${plan.registryPath}`);
    process.exit(1);
  }

  // update state
  if (state) {
    state.stages.C.status = 'applied';
    recordEvent(state, 'apply', { repoRoot, agentId: bp.agent.id });
    saveState(workdir, state, true);
  }

  console.log('========================================');
  console.log(' Scaffold applied');
  console.log('========================================');
  console.log(`Agent module: ${path.relative(repoRoot, plan.moduleRoot)}`);
  console.log(`Docs:         ${path.relative(repoRoot, plan.docsRoot)}`);
  console.log(`Registry:     ${path.relative(repoRoot, plan.registryPath)}`);
}

function cmdFinish(args) {
  const workdir = args.workdir ? path.resolve(args.workdir) : null;
  const force = !!args.force;
  if (!workdir) {
    console.error('Missing --workdir');
    process.exit(2);
  }
  if (!fs.existsSync(workdir)) {
    console.log(`workdir does not exist: ${workdir}`);
    return;
  }

  const safe = isSafeTempWorkdir(workdir);
  if (!safe && !force) {
    console.error('Refusing to delete a non-default workdir path without --force.');
    console.error(`workdir: ${workdir}`);
    process.exit(2);
  }

  removeDirRecursive(workdir);
  console.log(`Deleted workdir: ${workdir}`);
}

function usage() {
  console.log('agent_builder helper');
  console.log('');
  console.log('Commands:');
  console.log('  start [--workdir <dir>]');
  console.log('  status --workdir <dir>');
  console.log('  approve --workdir <dir> --stage <A|B|C|D|E>');
  console.log('  validate-blueprint --workdir <dir> [--blueprint <path>] [--format json|text]');
  console.log('  plan --workdir <dir> --repo-root <repo>');
  console.log('  apply --workdir <dir> --repo-root <repo> --apply');
  console.log('  finish --workdir <dir> [--force]');
  console.log('');
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const args = parseArgs(argv.slice(1));

  switch (cmd) {
    case 'start': return cmdStart(args);
    case 'status': return cmdStatus(args);
    case 'approve': return cmdApprove(args);
    case 'validate-blueprint': return cmdValidateBlueprint(args);
    case 'plan': return cmdPlan(args);
    case 'apply': return cmdApply(args);
    case 'finish': return cmdFinish(args);
    default:
      usage();
      process.exit(cmd ? 2 : 0);
  }
}

main();
