/**
 * convex-drift-verify-smoke.mjs
 * Verify warning/error behavior for missing generated output and contract drift.
 */
import fs from 'fs';
import path from 'path';

import { assertIncludes, assertNotIncludes } from '../../lib/text.mjs';
import {
  expectOk,
  materializeConvexFixture,
  runNodeScript,
} from './convex-fixture.mjs';

export const name = 'database-convex-drift-verify-smoke';

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

export function run(ctx) {
  const fixture = materializeConvexFixture(ctx, name);

  fs.rmSync(fixture.paths.generatedDir, { recursive: true, force: true });

  const verifyMissingGenerated = runNodeScript({
    script: fixture.scripts.convexCtl,
    args: ['verify', '--repo-root', fixture.rootDir],
    cwd: fixture.rootDir,
    evidenceDir: fixture.testDir,
    label: `${name}.verify-missing-generated`,
  });
  expectOk(verifyMissingGenerated, `${name} verify missing generated`);
  assertIncludes(
    verifyMissingGenerated.stdout,
    'convex/_generated/ is missing',
    'Expected missing _generated warning during non-strict verify'
  );

  const verifyMissingGeneratedStrict = runNodeScript({
    script: fixture.scripts.convexCtl,
    args: ['verify', '--repo-root', fixture.rootDir, '--strict'],
    cwd: fixture.rootDir,
    evidenceDir: fixture.testDir,
    label: `${name}.verify-missing-generated-strict`,
  });
  if (verifyMissingGeneratedStrict.error || verifyMissingGeneratedStrict.code !== 2) {
    const detail = verifyMissingGeneratedStrict.error
      ? String(verifyMissingGeneratedStrict.error)
      : verifyMissingGeneratedStrict.stderr || verifyMissingGeneratedStrict.stdout;
    return { name, status: 'FAIL', error: `Expected strict verify to exit 2 for missing _generated: ${detail}` };
  }
  assertIncludes(
    verifyMissingGeneratedStrict.stdout,
    'convex/_generated/ is missing',
    'Expected strict verify output to retain missing _generated warning'
  );

  fs.mkdirSync(fixture.paths.generatedDir, { recursive: true });
  fs.writeFileSync(path.join(fixture.paths.generatedDir, 'server.d.ts'), '// regenerated placeholder\n', 'utf8');

  const verifyRecovered = runNodeScript({
    script: fixture.scripts.convexCtl,
    args: ['verify', '--repo-root', fixture.rootDir, '--strict'],
    cwd: fixture.rootDir,
    evidenceDir: fixture.testDir,
    label: `${name}.verify-recovered`,
  });
  expectOk(verifyRecovered, `${name} verify recovered`);

  const dbContract = JSON.parse(fs.readFileSync(fixture.paths.dbContract, 'utf8'));
  const fnContract = JSON.parse(fs.readFileSync(fixture.paths.functionsContract, 'utf8'));
  dbContract.updatedAt = '2030-01-01T00:00:00.000Z';
  fnContract.updatedAt = '2030-01-01T00:00:00.000Z';
  writeJson(fixture.paths.dbContract, dbContract);
  writeJson(fixture.paths.functionsContract, fnContract);

  const verifyUpdatedAtOnly = runNodeScript({
    script: fixture.scripts.convexCtl,
    args: ['verify', '--repo-root', fixture.rootDir, '--strict'],
    cwd: fixture.rootDir,
    evidenceDir: fixture.testDir,
    label: `${name}.verify-updated-at-only`,
  });
  expectOk(verifyUpdatedAtOnly, `${name} verify updatedAt only`);
  assertNotIncludes(
    verifyUpdatedAtOnly.stdout,
    'out of date',
    'Expected updatedAt-only changes to be ignored during verify'
  );

  const schemaText = fs.readFileSync(fixture.paths.schema, 'utf8');
  fs.writeFileSync(
    fixture.paths.schema,
    schemaText.replace(
      '});\n',
      `  audits: defineTable({
    kind: v.string(),
  }),
});
`
    ),
    'utf8'
  );
  fs.appendFileSync(
    fixture.paths.messages,
    `
export const latest = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("messages").collect();
  },
});
`,
    'utf8'
  );

  const verifyDrift = runNodeScript({
    script: fixture.scripts.convexCtl,
    args: ['verify', '--repo-root', fixture.rootDir],
    cwd: fixture.rootDir,
    evidenceDir: fixture.testDir,
    label: `${name}.verify-drift`,
  });
  expectOk(verifyDrift, `${name} verify drift`);
  assertIncludes(verifyDrift.stdout, 'docs/context/db/schema.json is out of date', 'Expected DB drift warning');
  assertIncludes(verifyDrift.stdout, 'DB tables added: audits', 'Expected DB drift summary for audits table');
  assertIncludes(
    verifyDrift.stdout,
    'docs/context/convex/functions.json is out of date',
    'Expected functions contract drift warning'
  );
  assertIncludes(verifyDrift.stdout, 'Functions added: messages:latest', 'Expected function drift summary');

  const verifyDriftStrict = runNodeScript({
    script: fixture.scripts.convexCtl,
    args: ['verify', '--repo-root', fixture.rootDir, '--strict'],
    cwd: fixture.rootDir,
    evidenceDir: fixture.testDir,
    label: `${name}.verify-drift-strict`,
  });
  if (verifyDriftStrict.error || verifyDriftStrict.code !== 2) {
    const detail = verifyDriftStrict.error ? String(verifyDriftStrict.error) : verifyDriftStrict.stderr || verifyDriftStrict.stdout;
    return { name, status: 'FAIL', error: `Expected strict verify to exit 2 for drift: ${detail}` };
  }
  assertIncludes(verifyDriftStrict.stdout, 'DB tables added: audits', 'Expected strict verify to print DB drift summary');
  assertIncludes(
    verifyDriftStrict.stdout,
    'Functions added: messages:latest',
    'Expected strict verify to print function drift summary'
  );

  const monorepoRoot = path.join(fixture.testDir, 'monorepo-fixture');
  fs.mkdirSync(monorepoRoot, { recursive: true });
  fs.cpSync(fixture.rootDir, monorepoRoot, { recursive: true });
  const pkgPath = path.join(monorepoRoot, 'package.json');
  const monorepoPkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  monorepoPkg.workspaces = ['apps/*', 'packages/*'];
  writeJson(pkgPath, monorepoPkg);

  const verifyMonorepo = runNodeScript({
    script: fixture.scripts.convexCtl,
    args: ['verify', '--repo-root', monorepoRoot],
    cwd: monorepoRoot,
    evidenceDir: fixture.testDir,
    label: `${name}.verify-monorepo`,
  });
  if (verifyMonorepo.error || verifyMonorepo.code === 0) {
    const detail = verifyMonorepo.error ? String(verifyMonorepo.error) : verifyMonorepo.stderr || verifyMonorepo.stdout;
    return { name, status: 'FAIL', error: `Expected monorepo verify to fail: ${detail}` };
  }
  assertIncludes(
    `${verifyMonorepo.stdout}\n${verifyMonorepo.stderr}`,
    'workspace/monorepo roots',
    'Expected monorepo verify error'
  );

  ctx.log(`[${name}] PASS`);
  return { name, status: 'PASS' };
}
