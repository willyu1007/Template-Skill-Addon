/**
 * convex-init-contract-smoke.mjs
 * Validate root-only Convex blueprints and contract bootstrap flow.
 */
import fs from 'fs';
import path from 'path';

import { assertIncludes } from '../../lib/text.mjs';
import {
  createTestDir,
  expectOk,
  materializeConvexFixture,
  runNodeScript,
  scriptPaths,
} from './convex-fixture.mjs';

export const name = 'database-convex-init-contract-smoke';

export function run(ctx) {
  const testDir = createTestDir(ctx, name);
  const scripts = scriptPaths(ctx.repoRoot);
  const blueprintRepoRoot = path.join(testDir, 'blueprint-root');
  fs.mkdirSync(blueprintRepoRoot, { recursive: true });
  const validBlueprintPath = path.join(blueprintRepoRoot, 'project-blueprint.example.json');
  fs.copyFileSync(scripts.exampleBlueprint, validBlueprintPath);

  const validateSingle = runNodeScript({
    script: scripts.initPipeline,
    args: ['validate', '--repo-root', blueprintRepoRoot, '--blueprint', validBlueprintPath],
    cwd: ctx.repoRoot,
    evidenceDir: testDir,
    label: `${name}.validate-single`,
  });
  expectOk(validateSingle, `${name} validate single`);
  assertIncludes(validateSingle.stdout, '[ok] Blueprint is valid', 'Expected valid Convex single-layout blueprint');

  const invalidBlueprintPath = path.join(blueprintRepoRoot, 'convex-monorepo.blueprint.json');
  const invalidBlueprint = JSON.parse(fs.readFileSync(validBlueprintPath, 'utf8'));
  invalidBlueprint.repo.layout = 'monorepo';
  fs.writeFileSync(invalidBlueprintPath, JSON.stringify(invalidBlueprint, null, 2) + '\n', 'utf8');

  const validateMonorepo = runNodeScript({
    script: scripts.initPipeline,
    args: ['validate', '--repo-root', blueprintRepoRoot, '--blueprint', invalidBlueprintPath],
    cwd: ctx.repoRoot,
    evidenceDir: testDir,
    label: `${name}.validate-monorepo`,
  });
  if (validateMonorepo.error || validateMonorepo.code === 0) {
    const detail = validateMonorepo.error ? String(validateMonorepo.error) : validateMonorepo.stderr || validateMonorepo.stdout;
    return { name, status: 'FAIL', error: `expected monorepo Convex blueprint validation to fail: ${detail}` };
  }
  assertIncludes(
    `${validateMonorepo.stdout}\n${validateMonorepo.stderr}`,
    'repo.layout="single"',
    'Expected monorepo validation error to mention single-layout requirement'
  );

  const fixture = materializeConvexFixture(ctx, name);

  const status = runNodeScript({
    script: fixture.scripts.dbSsotCtl,
    args: ['status', '--repo-root', fixture.rootDir, '--format', 'json'],
    cwd: fixture.rootDir,
    evidenceDir: fixture.testDir,
    label: `${name}.db-ssot-status`,
  });
  expectOk(status, `${name} db-ssot status`);
  const statusJson = JSON.parse(status.stdout);
  if (statusJson.mode !== 'convex') {
    return { name, status: 'FAIL', error: `Expected db.ssot status mode=convex, got ${statusJson.mode}` };
  }
  if (!statusJson.exists || statusJson.exists.convexFunctions !== true) {
    return { name, status: 'FAIL', error: 'Expected Convex functions contract to exist after sync-to-context' };
  }

  const verify = runNodeScript({
    script: fixture.scripts.convexCtl,
    args: ['verify', '--repo-root', fixture.rootDir],
    cwd: fixture.rootDir,
    evidenceDir: fixture.testDir,
    label: `${name}.verify`,
  });
  expectOk(verify, `${name} verify`);

  const verifyStrict = runNodeScript({
    script: fixture.scripts.convexCtl,
    args: ['verify', '--repo-root', fixture.rootDir, '--strict'],
    cwd: fixture.rootDir,
    evidenceDir: fixture.testDir,
    label: `${name}.verify-strict`,
  });
  expectOk(verifyStrict, `${name} verify strict`);

  const functionsContract = JSON.parse(fs.readFileSync(fixture.paths.functionsContract, 'utf8'));
  const functionIds = (functionsContract.functions || []).map((fn) => fn.functionId);
  if (!functionIds.includes('messages:list') || !functionIds.includes('messages:create')) {
    return { name, status: 'FAIL', error: 'Expected messages:list and messages:create in generated Convex functions contract' };
  }

  ctx.log(`[${name}] PASS`);
  return { name, status: 'PASS' };
}
