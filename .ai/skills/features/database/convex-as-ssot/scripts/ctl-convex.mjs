#!/usr/bin/env node
/**
 * ctl-convex.mjs
 *
 * Convex scaffolding + contract generation for Convex-as-SSOT mode.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  ensureDir,
  parseArgs,
  readJsonIfExists,
  readTextIfExists,
  resolvePath,
  toPosixPath,
  writeJson,
  writeTextIfMissing,
} from "./lib/file-utils.mjs";
import { extractConvexFunctions, parseConvexSchema } from "./lib/convex-parser.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.resolve(__dirname, "..", "templates");
const CONVEX_PACKAGE_VERSION = "^1.26.2";
const CONVEX_FUNCTIONS_ARTIFACT_ID = "convex-functions";
const CANONICAL_PATHS = Object.freeze({
  schema: "convex/schema.ts",
  dbContract: "docs/context/db/schema.json",
  functionContract: "docs/context/convex/functions.json",
});

function stableStringifyForCompare(value) {
  const seen = new WeakSet();
  function normalize(v) {
    if (v && typeof v === "object") {
      if (seen.has(v)) return "[Circular]";
      seen.add(v);
      if (Array.isArray(v)) return v.map(normalize);
      const out = {};
      for (const key of Object.keys(v).sort()) {
        out[key] = normalize(v[key]);
      }
      return out;
    }
    return v;
  }
  return JSON.stringify(normalize(value));
}

function withoutUpdatedAt(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const copy = { ...obj };
  delete copy.updatedAt;
  return copy;
}

function writeGeneratedJsonStable(filePath, data) {
  const existing = readJsonIfExists(filePath);
  if (existing && typeof existing === "object") {
    const previous = stableStringifyForCompare(withoutUpdatedAt(existing));
    const next = stableStringifyForCompare(withoutUpdatedAt(data));
    if (previous === next && typeof existing.updatedAt === "string" && existing.updatedAt) {
      data.updatedAt = existing.updatedAt;
    }
  }
  writeJson(filePath, data);
}

function usage(exitCode = 0) {
  const msg = `
Usage: node .ai/skills/features/database/convex-as-ssot/scripts/ctl-convex.mjs <command> [options]

Commands:
  help
    Show this help.

  init
    --repo-root <path>     Repo root (default: cwd)
    --dry-run              Show planned writes without modifying files
    Initialize Convex scaffolding and context skeleton.

  status
    --repo-root <path>     Repo root (default: cwd)
    --format <text|json>   Output format (default: text)
    Show low-level Convex artifact status for troubleshooting.

  verify
    --repo-root <path>     Repo root (default: cwd)
    --strict               Treat warnings as errors
    Verify Convex mode artifacts and contracts after the public DB refresh flow has run.

Notes:
  Public DB contract refresh is routed only through:
    node .ai/scripts/ctl-db-ssot.mjs sync-to-context
  Internal delegate subcommands used by ctl-db-ssot are intentionally omitted from help.

Examples:
  node .ai/skills/features/database/convex-as-ssot/scripts/ctl-convex.mjs init --repo-root .
  node .ai/skills/features/database/convex-as-ssot/scripts/ctl-convex.mjs status --repo-root .
  node .ai/skills/features/database/convex-as-ssot/scripts/ctl-convex.mjs verify --repo-root .
`;
  console.log(msg.trim());
  process.exit(exitCode);
}

function die(message, exitCode = 1) {
  console.error(message);
  process.exit(exitCode);
}

function getRepoRoot(opts) {
  return resolvePath(process.cwd(), opts["repo-root"] || process.cwd());
}

function requireInternalRefreshDelegate(command, repoRoot, opts) {
  if (opts["internal-caller"] === "ctl-db-ssot") return;
  const repoRootArg = toPosixPath(path.resolve(repoRoot));
  die(
    `[error] \`${command}\` is an internal Convex implementation command.\n` +
    `Use the canonical public entrypoint instead:\n` +
    `  node .ai/scripts/ctl-db-ssot.mjs sync-to-context --repo-root ${repoRootArg}`
  );
}

function templateFiles() {
  return [
    ["convex/AGENTS.md", "convex/AGENTS.md"],
    ["convex/README.md", "convex/README.md"],
    ["convex/schema.ts", "convex/schema.ts"],
    ["convex/auth.config.ts", "convex/auth.config.ts"],
    ["docs/context/convex/INDEX.md", "docs/context/convex/INDEX.md"],
    ["docs/context/convex/functions.json", "docs/context/convex/functions.json"],
    ["docs/context/convex/functions.schema.json", "docs/context/convex/functions.schema.json"],
  ];
}

function packageJsonPath(repoRoot) {
  return path.join(repoRoot, "package.json");
}

function collectUnsupportedPathWarnings(raw, mode) {
  if (!raw || typeof raw !== "object") return [];

  const warnings = [];
  const compare = (label, value, expected) => {
    const actual = typeof value === "string" ? value.trim() : "";
    if (actual && expected && actual !== expected) {
      warnings.push(`${label}=${actual} is ignored in v1; Convex DB contracts use canonical path ${expected}.`);
    }
  };

  compare("paths.dbContextContract", raw?.paths?.dbContextContract, CANONICAL_PATHS.dbContract);
  compare("paths.convexSchema", raw?.paths?.convexSchema, CANONICAL_PATHS.schema);
  compare("paths.convexFunctionsContract", raw?.paths?.convexFunctionsContract, CANONICAL_PATHS.functionContract);
  compare("db.contracts.dbSchema", raw?.db?.contracts?.dbSchema, CANONICAL_PATHS.dbContract);
  compare("db.contracts.convexFunctions", raw?.db?.contracts?.convexFunctions, CANONICAL_PATHS.functionContract);
  if (mode === "convex") compare("db.source.path", raw?.db?.source?.path, CANONICAL_PATHS.schema);

  return warnings;
}

function copyTemplates(repoRoot, dryRun = false) {
  const actions = [];
  const dirs = [
    path.join(repoRoot, "convex"),
    path.join(repoRoot, "docs", "context", "db"),
    path.join(repoRoot, "docs", "context", "convex"),
  ];
  for (const dir of dirs) {
    if (dryRun) {
      actions.push({ op: "mkdir", path: dir, mode: "dry-run" });
    } else {
      actions.push(ensureDir(dir));
    }
  }

  for (const [fromRel, toRel] of templateFiles()) {
    const src = path.join(templatesDir, fromRel);
    const dest = path.join(repoRoot, toRel);
    const content = readTextIfExists(src);
    if (content == null) {
      actions.push({ op: "warn", path: src, reason: "missing-template" });
      continue;
    }
    if (dryRun) {
      actions.push({ op: "write", path: dest, mode: "dry-run" });
    } else {
      actions.push(writeTextIfMissing(dest, content));
    }
  }

  return actions;
}

function ensureConvexPackageManifest(repoRoot, dryRun = false) {
  const pkgPath = packageJsonPath(repoRoot);
  if (!fs.existsSync(pkgPath)) {
    return {
      actions: [{ op: "skip", path: pkgPath, reason: "package.json missing" }],
      warnings: ["package.json is missing; skipping Convex dependency and script injection."],
    };
  }

  const pkg = readJsonIfExists(pkgPath);
  if (!pkg || typeof pkg !== "object" || Array.isArray(pkg)) {
    return {
      actions: [{ op: "warn", path: pkgPath, reason: "invalid-package-json" }],
      warnings: ["package.json could not be parsed; skipping Convex dependency and script injection."],
    };
  }

  const next = { ...pkg };
  const warnings = [];
  let changed = false;

  const dependencies = next.dependencies && typeof next.dependencies === "object" && !Array.isArray(next.dependencies)
    ? { ...next.dependencies }
    : {};
  const devDependencies = next.devDependencies && typeof next.devDependencies === "object" && !Array.isArray(next.devDependencies)
    ? { ...next.devDependencies }
    : {};
  const scripts = next.scripts && typeof next.scripts === "object" && !Array.isArray(next.scripts)
    ? { ...next.scripts }
    : {};

  const existingConvexVersion = dependencies.convex || devDependencies.convex || null;
  if (!existingConvexVersion) {
    dependencies.convex = CONVEX_PACKAGE_VERSION;
    next.dependencies = dependencies;
    changed = true;
  }

  const desiredScripts = {
    "convex:dev": "convex dev",
    "convex:codegen": "convex codegen",
  };

  for (const [name, command] of Object.entries(desiredScripts)) {
    if (!Object.prototype.hasOwnProperty.call(scripts, name)) {
      scripts[name] = command;
      changed = true;
      continue;
    }
    if (scripts[name] !== command) {
      warnings.push(`package.json already defines script "${name}" as "${scripts[name]}"; preserving it.`);
    }
  }

  next.scripts = scripts;

  if (!dryRun && changed) {
    writeJson(pkgPath, next);
  }

  const actions = [];
  if (!existingConvexVersion) {
    actions.push({
      op: "update",
      path: pkgPath,
      note: `dependencies.convex=${CONVEX_PACKAGE_VERSION}`,
      ...(dryRun ? { mode: "dry-run" } : {}),
    });
  }
  for (const [name, command] of Object.entries(desiredScripts)) {
    if (!pkg.scripts || !Object.prototype.hasOwnProperty.call(pkg.scripts, name)) {
      actions.push({
        op: "update",
        path: pkgPath,
        note: `scripts.${name}=${command}`,
        ...(dryRun ? { mode: "dry-run" } : {}),
      });
    }
  }
  if (actions.length === 0) {
    actions.push({ op: "skip", path: pkgPath, reason: changed ? "unknown-state" : "package-json-up-to-date" });
  }

  return { actions, warnings };
}

function loadDbSsotConfig(repoRoot) {
  const configPath = path.join(repoRoot, "docs", "project", "db-ssot.json");
  const raw = readJsonIfExists(configPath);
  if (!raw) {
    return {
      path: configPath,
      config: null,
      mode: null,
      sourcePath: CANONICAL_PATHS.schema,
      dbContractPath: CANONICAL_PATHS.dbContract,
      fnContractPath: CANONICAL_PATHS.functionContract,
      warnings: [],
    };
  }
  const db = raw.db || raw;
  const mode = typeof db.ssot === "string"
    ? db.ssot
    : typeof raw.ssot === "string"
      ? raw.ssot
      : null;
  return {
    path: configPath,
    config: raw,
    mode,
    sourcePath: CANONICAL_PATHS.schema,
    dbContractPath: CANONICAL_PATHS.dbContract,
    fnContractPath: CANONICAL_PATHS.functionContract,
    warnings: collectUnsupportedPathWarnings(raw, mode),
  };
}

function inferMode(repoRoot) {
  const schemaPath = path.join(repoRoot, "convex", "schema.ts");
  if (fs.existsSync(schemaPath)) return "convex";
  return "none";
}

function resolveMode(repoRoot) {
  const loaded = loadDbSsotConfig(repoRoot);
  if (loaded.mode === "convex") {
    return { mode: "convex", source: "config", configPath: loaded.path, sourcePath: loaded.sourcePath || "convex/schema.ts" };
  }
  const inferred = inferMode(repoRoot);
  return {
    mode: inferred,
    source: loaded.config ? "infer (non-convex config)" : "infer (no config)",
    configPath: loaded.path,
    sourcePath: loaded.sourcePath || "convex/schema.ts",
  };
}

function buildStatus(repoRoot) {
  const mode = resolveMode(repoRoot);
  const loaded = loadDbSsotConfig(repoRoot);
  const schemaPath = path.join(repoRoot, mode.sourcePath || "convex/schema.ts");
  const dbContractPath = path.join(repoRoot, loaded.dbContractPath || "docs/context/db/schema.json");
  const fnContractPath = path.join(repoRoot, loaded.fnContractPath || "docs/context/convex/functions.json");
  const pkgPath = packageJsonPath(repoRoot);
  const pkg = readJsonIfExists(pkgPath);
  const dbContract = readJsonIfExists(dbContractPath);
  const fnContract = readJsonIfExists(fnContractPath);

  return {
    mode: mode.mode,
    modeSource: mode.source,
    dbSsotConfig: toPosixPath(path.relative(repoRoot, mode.configPath)),
    sourcePath: mode.sourcePath,
    artifacts: {
      schema: {
        exists: fs.existsSync(schemaPath),
        path: toPosixPath(path.relative(repoRoot, schemaPath)),
      },
      dbContract: {
        exists: fs.existsSync(dbContractPath),
        path: toPosixPath(path.relative(repoRoot, dbContractPath)),
        tables: Array.isArray(dbContract?.tables) ? dbContract.tables.length : null,
      },
      functionContract: {
        exists: fs.existsSync(fnContractPath),
        path: toPosixPath(path.relative(repoRoot, fnContractPath)),
        functions: Array.isArray(fnContract?.functions) ? fnContract.functions.length : null,
      },
      packageJson: {
        exists: fs.existsSync(pkgPath),
        path: "package.json",
        hasConvexDependency: !!(pkg?.dependencies?.convex || pkg?.devDependencies?.convex),
        hasConvexDevScript: pkg?.scripts?.["convex:dev"] === "convex dev",
        hasConvexCodegenScript: pkg?.scripts?.["convex:codegen"] === "convex codegen",
      },
      generated: {
        exists: fs.existsSync(path.join(repoRoot, "convex", "_generated")),
        path: "convex/_generated",
      },
    },
    warnings: loaded.warnings || [],
  };
}

function cmdInit(repoRoot, dryRun) {
  const actions = copyTemplates(repoRoot, dryRun);
  const pkg = ensureConvexPackageManifest(repoRoot, dryRun);
  actions.push(...pkg.actions);

  console.log("[ok] Convex skeleton initialized.");
  for (const action of actions) {
    const rel = action.path ? toPosixPath(path.relative(repoRoot, action.path)) : "";
    const mode = action.mode ? ` (${action.mode})` : "";
    const reason = action.reason ? ` [${action.reason}]` : "";
    const note = action.note ? ` {${action.note}}` : "";
    console.log(`  ${action.op}: ${rel}${mode}${reason}${note}`);
  }
  for (const warning of pkg.warnings) {
    console.log(`[warn] ${warning}`);
  }
}

function maybeRegisterConvexFunctionsArtifact(repoRoot, fnOutPath) {
  const registryPath = path.join(repoRoot, "docs", "context", "registry.json");
  if (!fs.existsSync(registryPath)) {
    return { status: "skipped", reason: "context registry missing" };
  }

  const registry = readJsonIfExists(registryPath);
  if (!registry || !Array.isArray(registry.artifacts)) {
    return { status: "skipped", reason: "invalid context registry" };
  }

  if (registry.artifacts.some((artifact) => artifact && artifact.id === CONVEX_FUNCTIONS_ARTIFACT_ID)) {
    return { status: "skipped", reason: "artifact already registered" };
  }

  const contextCtl = path.join(repoRoot, ".ai", "skills", "features", "context-awareness", "scripts", "ctl-context.mjs");
  if (!fs.existsSync(contextCtl)) {
    return { status: "skipped", reason: "ctl-context.mjs missing" };
  }

  const relPath = toPosixPath(path.relative(repoRoot, fnOutPath));
  const res = spawnSync("node", [
    contextCtl,
    "add-artifact",
    "--repo-root",
    repoRoot,
    "--id",
    CONVEX_FUNCTIONS_ARTIFACT_ID,
    "--type",
    "json",
    "--path",
    relPath,
    "--mode",
    "generated",
    "--format",
    "convex-functions-v1",
    "--tags",
    "db,convex,llm",
  ], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (res.status !== 0) {
    const message = String(res.stderr || res.stdout || "").trim();
    return { status: "failed", reason: message || "ctl-context add-artifact failed" };
  }

  return { status: "registered", path: relPath };
}

function cmdSyncToContext(repoRoot, schemaPathOpt, dbOutOpt, fnOutOpt) {
  const loaded = loadDbSsotConfig(repoRoot);
  const schemaPath = resolvePath(repoRoot, schemaPathOpt || CANONICAL_PATHS.schema);
  if (!fs.existsSync(schemaPath)) {
    die(`[error] Convex schema not found: ${toPosixPath(path.relative(repoRoot, schemaPath))}`);
  }

  if (dbOutOpt) {
    const requestedDbOut = resolvePath(repoRoot, dbOutOpt);
    const requestedDbRel = toPosixPath(path.relative(repoRoot, requestedDbOut));
    if (requestedDbRel !== CANONICAL_PATHS.dbContract) {
      die(`[error] ctl-convex v1 uses fixed DB contract path ${CANONICAL_PATHS.dbContract}; custom --db-out is not supported.`);
    }
  }
  if (fnOutOpt) {
    const requestedFnOut = resolvePath(repoRoot, fnOutOpt);
    const requestedFnRel = toPosixPath(path.relative(repoRoot, requestedFnOut));
    if (requestedFnRel !== CANONICAL_PATHS.functionContract) {
      die(`[error] ctl-convex v1 uses fixed function contract path ${CANONICAL_PATHS.functionContract}; custom --fn-out is not supported.`);
    }
  }

  const dbOut = resolvePath(repoRoot, CANONICAL_PATHS.dbContract);
  const fnOut = resolvePath(repoRoot, CANONICAL_PATHS.functionContract);
  const schemaText = readTextIfExists(schemaPath) || "";

  const dbContract = parseConvexSchema(schemaText, {
    sourcePath: toPosixPath(path.relative(repoRoot, schemaPath)),
  });
  const functionContract = extractConvexFunctions({ repoRoot });

  writeGeneratedJsonStable(dbOut, dbContract);
  writeGeneratedJsonStable(fnOut, functionContract);
  const registryResult = maybeRegisterConvexFunctionsArtifact(repoRoot, fnOut);

  console.log("[ok] Convex context contracts refreshed.");
  console.log(`  db: ${toPosixPath(path.relative(repoRoot, dbOut))} (tables: ${dbContract.tables.length})`);
  console.log(`  functions: ${toPosixPath(path.relative(repoRoot, fnOut))} (functions: ${functionContract.functions.length})`);
  for (const warning of loaded.warnings || []) {
    console.log(`[warn] ${warning}`);
  }
  if (registryResult.status === "registered") {
    console.log(`  registry: ${registryResult.path} (registered as ${CONVEX_FUNCTIONS_ARTIFACT_ID})`);
  } else if (registryResult.status === "failed") {
    console.log(`[warn] Convex function artifact registration failed: ${registryResult.reason}`);
  }
}

function cmdExtractFunctions(repoRoot, outOpt) {
  const loaded = loadDbSsotConfig(repoRoot);
  if (outOpt) {
    const requestedOut = resolvePath(repoRoot, outOpt);
    const requestedRel = toPosixPath(path.relative(repoRoot, requestedOut));
    if (requestedRel !== CANONICAL_PATHS.functionContract) {
      die(`[error] ctl-convex v1 uses fixed function contract path ${CANONICAL_PATHS.functionContract}; custom --out is not supported.`);
    }
  }
  const out = resolvePath(repoRoot, CANONICAL_PATHS.functionContract);
  const functionContract = extractConvexFunctions({ repoRoot });
  writeGeneratedJsonStable(out, functionContract);
  console.log("[ok] Convex function contract refreshed.");
  console.log(`  path: ${toPosixPath(path.relative(repoRoot, out))}`);
  console.log(`  functions: ${functionContract.functions.length}`);
  for (const warning of loaded.warnings || []) {
    console.log(`[warn] ${warning}`);
  }
}

function cmdStatus(repoRoot, format = "text") {
  const status = buildStatus(repoRoot);
  if (format === "json") {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log("Convex status (low-level troubleshooting view)");
  console.log("  public SSOT status: node .ai/scripts/ctl-db-ssot.mjs status --repo-root .");
  console.log(`  mode: ${status.mode} (${status.modeSource})`);
  console.log(`  db-ssot: ${status.dbSsotConfig}`);
  console.log(`  sourcePath: ${status.sourcePath}`);
  console.log(`  schema: ${status.artifacts.schema.exists ? "yes" : "no"} (${status.artifacts.schema.path})`);
  console.log(`  db contract: ${status.artifacts.dbContract.exists ? "yes" : "no"} (${status.artifacts.dbContract.path})`);
  console.log(`  function contract: ${status.artifacts.functionContract.exists ? "yes" : "no"} (${status.artifacts.functionContract.path})`);
  console.log(`  package.json: ${status.artifacts.packageJson.exists ? "yes" : "no"} (${status.artifacts.packageJson.path})`);
  console.log(`  generated: ${status.artifacts.generated.exists ? "yes" : "no"} (${status.artifacts.generated.path})`);
  if (status.warnings.length > 0) {
    for (const warning of status.warnings) {
      console.log(`[warn] ${warning}`);
    }
  }
}

function cmdVerify(repoRoot, strict = false) {
  const errors = [];
  const warnings = [];

  const mode = resolveMode(repoRoot);
  const loaded = loadDbSsotConfig(repoRoot);
  const schemaPath = path.join(repoRoot, mode.sourcePath || "convex/schema.ts");
  const dbContractPath = path.join(repoRoot, loaded.dbContractPath || "docs/context/db/schema.json");
  const fnContractPath = path.join(repoRoot, loaded.fnContractPath || "docs/context/convex/functions.json");
  const pkgPath = packageJsonPath(repoRoot);
  const pkg = readJsonIfExists(pkgPath);

  if (mode.mode !== "convex") {
    warnings.push(`Resolved DB SSOT mode is "${mode.mode}", not "convex".`);
  }
  if (loaded.warnings && loaded.warnings.length > 0) {
    errors.push(...loaded.warnings.map((warning) => `Unsupported db-ssot path override: ${warning}`));
  }

  if (!fs.existsSync(schemaPath)) {
    errors.push("Missing convex/schema.ts");
  }

  if (fs.existsSync(pkgPath)) {
    if (!(pkg?.dependencies?.convex || pkg?.devDependencies?.convex)) {
      errors.push('package.json is present but does not declare the "convex" package.');
    }
    if (pkg?.scripts?.["convex:dev"] !== "convex dev") {
      warnings.push('package.json is present but script "convex:dev" is missing or customized.');
    }
    if (pkg?.scripts?.["convex:codegen"] !== "convex codegen") {
      warnings.push('package.json is present but script "convex:codegen" is missing or customized.');
    }
  } else {
    warnings.push("package.json is missing; Convex dependency injection could not be verified.");
  }

  const dbContract = readJsonIfExists(dbContractPath);
  if (!dbContract) {
    errors.push("Missing docs/context/db/schema.json");
  } else {
    const sourceKind = dbContract?.ssot?.source?.kind || dbContract?.source?.kind || null;
    if (sourceKind && sourceKind !== "convex-schema") {
      warnings.push(`docs/context/db/schema.json was generated from source kind "${sourceKind}", not "convex-schema".`);
    }
  }

  const fnContract = readJsonIfExists(fnContractPath);
  if (!fnContract) {
    errors.push("Missing docs/context/convex/functions.json");
  } else if (!Array.isArray(fnContract.functions)) {
    errors.push("docs/context/convex/functions.json does not contain a top-level functions[] array");
  }

  if (!fs.existsSync(path.join(repoRoot, "convex", "_generated"))) {
    warnings.push("convex/_generated/ is missing; run `npx convex dev` or `npx convex codegen` if typed surfaces changed.");
  }

  if (errors.length === 0 && (warnings.length === 0 || !strict)) {
    console.log("[ok] Convex verification passed.");
  }

  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.log(`[warn] ${warning}`);
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[error] ${error}`);
    }
    process.exit(1);
  }

  if (strict && warnings.length > 0) {
    process.exit(2);
  }
}

function main() {
  const { command, opts } = parseArgs(process.argv);
  if (command === "help") usage(0);

  const repoRoot = getRepoRoot(opts);

  switch (command) {
    case "init":
      cmdInit(repoRoot, !!opts["dry-run"]);
      break;
    case "status":
      cmdStatus(repoRoot, opts["format"] || "text");
      break;
    case "sync-to-context":
      requireInternalRefreshDelegate("sync-to-context", repoRoot, opts);
      cmdSyncToContext(repoRoot, opts["schema-path"], opts["db-out"], opts["fn-out"]);
      break;
    case "extract-functions":
      requireInternalRefreshDelegate("extract-functions", repoRoot, opts);
      cmdExtractFunctions(repoRoot, opts["out"]);
      break;
    case "verify":
      cmdVerify(repoRoot, !!opts["strict"]);
      break;
    default:
      usage(1);
  }
}

main();
