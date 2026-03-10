/**
 * convex-fixture.mjs
 * Shared helpers for Convex database smoke tests.
 */
import fs from 'fs';
import path from 'path';

import { runCommand } from '../../lib/exec.mjs';

const DB_SSOT_CONFIG = {
  version: 1,
  updatedAt: '2026-03-11T00:00:00.000Z',
  mode: 'convex',
  policy: {
    managedPaths: 'fixed-defaults-v1',
  },
  paths: {
    prismaSchema: 'prisma/schema.prisma',
    dbSchemaTables: 'db/schema/tables.json',
    dbContextContract: 'docs/context/db/schema.json',
    convexSchema: 'convex/schema.ts',
    convexFunctionsContract: 'docs/context/convex/functions.json',
  },
  db: {
    ssot: 'convex',
    kind: 'convex',
    source: {
      kind: 'convex-schema',
      path: 'convex/schema.ts',
    },
    contracts: {
      dbSchema: 'docs/context/db/schema.json',
      convexFunctions: 'docs/context/convex/functions.json',
    },
    generated: {
      typesDir: 'convex/_generated',
    },
  },
};

const CONVEX_SCHEMA = `import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  channels: defineTable({
    name: v.string(),
    slug: v.string(),
  })
    .index("by_slug", ["slug"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["slug"],
    }),
  messages: defineTable({
    channelId: v.id("channels"),
    body: v.string(),
    author: v.string(),
    embedding: v.array(v.float64()),
  })
    .index("by_channelId", ["channelId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 3,
      filterFields: ["channelId"],
    }),
});
`;

const CONVEX_MESSAGES = `import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.array(
    v.object({
      body: v.string(),
      author: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx
      .db
      .query("messages")
      .collect();
    return rows.filter((row) => row.channelId === args.channelId);
  },
});

export const create = mutation({
  args: {
    channelId: v.id("channels"),
    body: v.string(),
    author: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      channelId: args.channelId,
      body: args.body,
      author: args.author,
      embedding: [0, 0, 0],
    });
    return null;
  },
});
`;

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, 'utf8');
}

function ensureAiSymlink(rootDir, repoRoot) {
  const linkPath = path.join(rootDir, '.ai');
  if (fs.existsSync(linkPath)) return;
  fs.symlinkSync(path.join(repoRoot, '.ai'), linkPath, 'dir');
}

export function createTestDir(ctx, name) {
  const testDir = path.join(ctx.evidenceDir, name);
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

export function scriptPaths(repoRoot) {
  return {
    initPipeline: path.join(repoRoot, 'init', '_tools', 'skills', 'initialize-project-from-requirements', 'scripts', 'init-pipeline.mjs'),
    contextCtl: path.join(repoRoot, '.ai', 'skills', 'features', 'context-awareness', 'scripts', 'ctl-context.mjs'),
    dbSsotCtl: path.join(repoRoot, '.ai', 'scripts', 'ctl-db-ssot.mjs'),
    convexCtl: path.join(repoRoot, '.ai', 'skills', 'features', 'database', 'convex-as-ssot', 'scripts', 'ctl-convex.mjs'),
    dbDocCtl: path.join(repoRoot, '.ai', 'skills', 'features', 'database', 'db-human-interface', 'scripts', 'ctl-db-doc.mjs'),
    exampleBlueprint: path.join(
      repoRoot,
      'init',
      '_tools',
      'skills',
      'initialize-project-from-requirements',
      'templates',
      'project-blueprint.example.json'
    ),
  };
}

export function runNodeScript({ script, args, cwd, evidenceDir, label }) {
  return runCommand({
    cmd: 'node',
    args: [script, ...args],
    cwd,
    evidenceDir,
    label,
  });
}

export function expectOk(result, label) {
  if (result.error || result.code !== 0) {
    const detail = result.error ? String(result.error) : result.stderr || result.stdout;
    throw new Error(`${label} failed: ${detail}`);
  }
}

export function materializeConvexFixture(ctx, name, { syncContext = true } = {}) {
  const testDir = createTestDir(ctx, name);
  const rootDir = path.join(testDir, 'fixture');
  fs.mkdirSync(rootDir, { recursive: true });
  ensureAiSymlink(rootDir, ctx.repoRoot);

  const scripts = scriptPaths(ctx.repoRoot);

  writeJson(path.join(rootDir, 'package.json'), {
    name,
    private: true,
    version: '0.0.0',
  });

  const initContext = runNodeScript({
    script: scripts.contextCtl,
    args: ['init', '--repo-root', rootDir],
    cwd: rootDir,
    evidenceDir: testDir,
    label: `${name}.context-init`,
  });
  expectOk(initContext, `${name} context init`);

  writeJson(path.join(rootDir, 'docs', 'project', 'db-ssot.json'), DB_SSOT_CONFIG);

  const initConvex = runNodeScript({
    script: scripts.convexCtl,
    args: ['init', '--repo-root', rootDir],
    cwd: rootDir,
    evidenceDir: testDir,
    label: `${name}.convex-init`,
  });
  expectOk(initConvex, `${name} convex init`);

  writeText(path.join(rootDir, 'convex', 'schema.ts'), CONVEX_SCHEMA);
  writeText(path.join(rootDir, 'convex', 'messages.ts'), CONVEX_MESSAGES);
  writeText(path.join(rootDir, 'convex', '_generated', 'server.d.ts'), '// test placeholder\n');

  if (syncContext) {
    const sync = runNodeScript({
      script: scripts.dbSsotCtl,
      args: ['sync-to-context', '--repo-root', rootDir],
      cwd: rootDir,
      evidenceDir: testDir,
      label: `${name}.sync-to-context`,
    });
    expectOk(sync, `${name} sync-to-context`);
  }

  return {
    name,
    testDir,
    rootDir,
    scripts,
    paths: {
      schema: path.join(rootDir, 'convex', 'schema.ts'),
      messages: path.join(rootDir, 'convex', 'messages.ts'),
      generatedDir: path.join(rootDir, 'convex', '_generated'),
      dbContract: path.join(rootDir, 'docs', 'context', 'db', 'schema.json'),
      functionsContract: path.join(rootDir, 'docs', 'context', 'convex', 'functions.json'),
      registry: path.join(rootDir, 'docs', 'context', 'registry.json'),
    },
  };
}
