/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS TOUCH-MAP COLLISION GATE UNIT TEST SUITE (ZERO-MOCK)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: DAVE Concurrency Assurance & Formal Verification (G-PROOF-004)
 * Invariant: Global Engineering Constitution Article I (Zero Mocks, Zero Stubs)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

import {
  normalizePath,
  isSharedTrackingFile,
  sanitizeTouchMap,
  pathsCollide,
  globToRegex,
  parseTouchMap,
  checkTouchMapCollision,
  analyzePairwiseCollisions,
  SHARED_TRACKING_PATTERNS,
} from '../../scripts/lib/touch-map-analyzer.mjs';

import {
  discoverActiveGoals,
  runCollisionGate,
} from '../../scripts/harness/touch-map-collision-gate.mjs';

describe('Touch Map Analyzer & Collision Gate Suite (Zero-Mock)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-touch-map-test-'));
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ── 1. Path Normalization ──────────────────────────────────────────────────
  it('1. should normalize path slashes, strip leading ./ and collapse consecutive slashes', () => {
    assert.equal(normalizePath('src\\lib\\core.js'), 'src/lib/core.js');
    assert.equal(normalizePath('./src//crates///kernel/'), 'src/crates/kernel/');
    assert.equal(normalizePath('   ./tests/unit/test.mjs  '), 'tests/unit/test.mjs');
    assert.equal(normalizePath(null), '');
    assert.equal(normalizePath(undefined), '');
  });

  // ── 2. Shared Tracking File Filtering ───────────────────────────────────────
  it('2. should recognize repository-wide shared tracking files', () => {
    assert.equal(isSharedTrackingFile('docs/00-project-snapshot.md'), true);
    assert.equal(isSharedTrackingFile('./docs/07-backlog/goals.md'), true);
    assert.equal(isSharedTrackingFile('docs/07-backlog/epics/PROOF.md'), true);
    assert.equal(isSharedTrackingFile('docs/07-backlog/goal-id-registry.yaml'), true);
    assert.equal(isSharedTrackingFile('docs/07-backlog/queues/PROOF.md'), true);
    assert.equal(isSharedTrackingFile('CLARIFICATION.md'), true);
    assert.equal(isSharedTrackingFile('CLARIFICATION-001.md'), true);
    assert.equal(isSharedTrackingFile('docs/06_raw/index.md'), true);
    assert.equal(isSharedTrackingFile('docs/06_raw/log.md'), true);
  });

  it('3. should not flag domain production source code as shared tracking files', () => {
    assert.equal(isSharedTrackingFile('src/kernel.rs'), false);
    assert.equal(isSharedTrackingFile('scripts/lib/touch-map-analyzer.mjs'), false);
    assert.equal(isSharedTrackingFile('docs/03-architecture/overview.md'), false);
    assert.equal(isSharedTrackingFile('tests/unit/test-gate.mjs'), false);
  });

  // ── 3. Touch Map Sanitization ──────────────────────────────────────────────
  it('4. should filter shared tracking files and normalize paths in sanitizeTouchMap', () => {
    const raw = [
      'src/crates/kernel/lib.rs',
      './docs/07-backlog/goals.md',
      'CLARIFICATION.md',
      'tests/unit/test-kernel.mjs',
      'docs/06_raw/index.md',
    ];
    const sanitized = sanitizeTouchMap(raw);
    assert.deepEqual(sanitized, [
      'src/crates/kernel/lib.rs',
      'tests/unit/test-kernel.mjs',
    ]);
  });

  it('5. should deduplicate repeated paths and support Set inputs in sanitizeTouchMap', () => {
    const set = new Set([
      'src/app.ts',
      './src/app.ts',
      'src\\app.ts',
      'tests/app.test.ts',
    ]);
    const sanitized = sanitizeTouchMap(set);
    assert.deepEqual(sanitized, [
      'src/app.ts',
      'tests/app.test.ts',
    ]);
  });

  // ── 4. Path Collision Detection (Exact, Prefix, Boundary) ───────────────────
  it('6. should detect exact path collision between identical files', () => {
    assert.equal(pathsCollide('src/kernel.rs', 'src/kernel.rs'), true);
    assert.equal(pathsCollide('scripts/lib/engine.mjs', 'scripts/lib/engine.mjs'), true);
  });

  it('7. should report no collision for distinct, disjoint file paths', () => {
    assert.equal(pathsCollide('src/kernel.rs', 'src/other.rs'), false);
    assert.equal(pathsCollide('scripts/lib/a.mjs', 'scripts/lib/b.mjs'), false);
  });

  it('8. should detect directory prefix overlap when parent directory is touched', () => {
    assert.equal(pathsCollide('src/crates/kernel', 'src/crates/kernel/lib.rs'), true);
    assert.equal(pathsCollide('docs/07-backlog', 'docs/07-backlog/goals/G-001.md'), true);
  });

  it('9. should detect directory prefix overlap symmetrically (child vs parent)', () => {
    assert.equal(pathsCollide('src/crates/kernel/lib.rs', 'src/crates/kernel'), true);
    assert.equal(pathsCollide('docs/07-backlog/goals/G-001.md', 'docs/07-backlog'), true);
  });

  it('10. should report no collision between distinct sibling directory branches', () => {
    assert.equal(pathsCollide('src/crates/kernel', 'src/crates/gate'), false);
    assert.equal(pathsCollide('docs/02-product', 'docs/03-architecture'), false);
  });

  it('11. should preserve strict directory boundaries without prefix bleed (foo vs food)', () => {
    assert.equal(pathsCollide('src/foo', 'src/food'), false);
    assert.equal(pathsCollide('src/core', 'src/core-utils/index.js'), false);
    assert.equal(pathsCollide('scripts/test', 'scripts/test-runner.mjs'), false);
  });

  // ── 5. Glob Wildcard Collisions ─────────────────────────────────────────────
  it('12. should detect single asterisk wildcard glob collisions', () => {
    assert.equal(pathsCollide('src/crates/*', 'src/crates/aether-kernel/lib.rs'), true);
    assert.equal(pathsCollide('src/crates/aether-kernel/lib.rs', 'src/crates/*'), true);
  });

  it('13. should detect recursive double asterisk wildcard glob collisions', () => {
    assert.equal(pathsCollide('docs/**', 'docs/02-product/brief.md'), true);
    assert.equal(pathsCollide('tests/**', 'tests/unit/sub/test.mjs'), true);
  });

  it('14. should detect file extension wildcard glob collisions in the same directory', () => {
    assert.equal(pathsCollide('tests/unit/*.mjs', 'tests/unit/test-touch-map.mjs'), true);
    assert.equal(pathsCollide('src/*.ts', 'src/index.ts'), true);
  });

  it('15. should report no collision for extension globs in distinct directories', () => {
    assert.equal(pathsCollide('tests/unit/*.mjs', 'tests/integration/test-touch-map.mjs'), false);
    assert.equal(pathsCollide('src/*.ts', 'lib/index.ts'), false);
  });

  it('16. should detect collision between overlapping glob patterns', () => {
    assert.equal(pathsCollide('src/crates/*', 'src/crates/sub/*'), true);
    assert.equal(pathsCollide('scripts/**/*.mjs', 'scripts/lib/*.mjs'), true);
  });

  // ── 6. Parsing Section 2 Touch Maps from Goal Cards ────────────────────────
  it('17. should parse backticked touch map items from markdown content', () => {
    const markdown = `
# G-TEST-001: Sample Goal
## Context
Sample context.
## Touch map
- \`src/engine.js\`
- \`tests/unit/test-engine.mjs\`
- \`docs/03-architecture/engine.md\`
## Work steps
1. Do work
`;
    const touchMap = parseTouchMap(markdown);
    assert.deepEqual(touchMap, [
      'src/engine.js',
      'tests/unit/test-engine.mjs',
      'docs/03-architecture/engine.md',
    ]);
  });

  it('18. should parse unbackticked bullets, ignore HTML comments and placeholders', () => {
    const markdown = `
# G-TEST-002: Another Goal
## Touch map
<!-- comment -->
- src/adapter.rs
- * \`tests/test_adapter.rs\`
- —
- *(declared on goal card)*
## Notes
`;
    const touchMap = parseTouchMap(markdown);
    assert.deepEqual(touchMap, [
      'src/adapter.rs',
      'tests/test_adapter.rs',
    ]);
  });

  it('19. should parse touch map directly from a filesystem file path', () => {
    const goalFile = path.join(tmpDir, 'G-TEST-003.md');
    fs.writeFileSync(
      goalFile,
      `# G-TEST-003
## Touch map
- \`src/a.ts\`
- \`src/b.ts\`
`,
      'utf8'
    );
    const parsed = parseTouchMap(goalFile);
    assert.deepEqual(parsed, ['src/a.ts', 'src/b.ts']);
    assert.equal(parsed.filePath, goalFile);
  });

  it('19b. should parse recursive globs (docs/**, src/**/*.ts) from markdown cards and collide with child paths', () => {
    const cardA = `# G-RECURSIVE-A\n## Touch map\n- \`docs/**\`\n- \`src/**/*.ts\`\n- **Declared Files:**\n`;
    const cardB = `# G-CHILD-B\n## Touch map\n- \`docs/guide.md\`\n- \`src/index.ts\`\n`;

    const touchMapA = parseTouchMap(cardA);
    assert.deepEqual(touchMapA, ['docs/**', 'src/**/*.ts']);

    const touchMapB = parseTouchMap(cardB);
    assert.deepEqual(touchMapB, ['docs/guide.md', 'src/index.ts']);

    const collision = checkTouchMapCollision(touchMapA, touchMapB);
    assert.equal(collision.colliding, true);
    assert.equal(collision.overlapCount, 2);
    assert.ok(collision.collisions.some((c) => c.pathA === 'docs/**' && c.pathB === 'docs/guide.md'));
    assert.ok(collision.collisions.some((c) => c.pathA === 'src/**/*.ts' && c.pathB === 'src/index.ts'));
  });

  // ── 7. Pairwise Goal Touch Map Collision Checks ─────────────────────────────
  it('20. should report clean when two goals have completely disjoint touch maps', () => {
    const goalA = {
      id: 'G-GOAL-A',
      touchMap: ['src/services/billing.ts', 'tests/billing.test.ts'],
    };
    const goalB = {
      id: 'G-GOAL-B',
      touchMap: ['src/services/auth.ts', 'tests/auth.test.ts'],
    };
    const res = checkTouchMapCollision(goalA, goalB);
    assert.equal(res.colliding, false);
    assert.equal(res.overlapCount, 0);
    assert.deepEqual(res.collisions, []);
  });

  it('21. should detect collision when two goals share a common write target', () => {
    const goalA = {
      id: 'G-GOAL-A',
      touchMap: ['src/shared/db.ts', 'tests/db.test.ts'],
    };
    const goalB = {
      id: 'G-GOAL-B',
      touchMap: ['src/shared/db.ts', 'tests/other.test.ts'],
    };
    const res = checkTouchMapCollision(goalA, goalB);
    assert.equal(res.colliding, true);
    assert.equal(res.overlapCount, 1);
    assert.equal(res.collisions[0].pathA, 'src/shared/db.ts');
    assert.equal(res.collisions[0].pathB, 'src/shared/db.ts');
    assert.equal(res.collisions[0].reason, 'exact_path_match');
  });

  it('22. should not trigger collision on shared tracking files present in raw inputs', () => {
    const goalA = {
      id: 'G-GOAL-A',
      touchMap: ['src/feature_a.ts', 'docs/07-backlog/goals.md'],
    };
    const goalB = {
      id: 'G-GOAL-B',
      touchMap: ['src/feature_b.ts', 'docs/07-backlog/goals.md'],
    };
    const res = checkTouchMapCollision(goalA, goalB);
    assert.equal(res.colliding, false);
  });

  // ── 8. Multi-Goal Collision Matrix Analysis ─────────────────────────────────
  it('23. should analyze multi-goal list and find zero collisions when all are disjoint', () => {
    const goals = [
      { id: 'G-001', touchMap: ['src/module_1.ts'] },
      { id: 'G-002', touchMap: ['src/module_2.ts'] },
      { id: 'G-003', touchMap: ['src/module_3.ts'] },
    ];
    const analysis = analyzePairwiseCollisions(goals);
    assert.equal(analysis.clean, true);
    assert.equal(analysis.hasCollision, false);
    assert.equal(analysis.totalCollisions, 0);
    assert.equal(analysis.analyzedPairsCount, 3);
  });

  it('24. should pinpoint specific colliding pair in a multi-goal set', () => {
    const goals = [
      { id: 'G-001', touchMap: ['src/module_1.ts'] },
      { id: 'G-002', touchMap: ['src/shared_util.ts'] },
      { id: 'G-003', touchMap: ['src/module_3.ts', 'src/shared_util.ts'] },
    ];
    const analysis = analyzePairwiseCollisions(goals);
    assert.equal(analysis.clean, false);
    assert.equal(analysis.hasCollision, true);
    assert.equal(analysis.totalCollisions, 1);
    assert.equal(analysis.collisionMatrix[0].goalA, 'G-002');
    assert.equal(analysis.collisionMatrix[0].goalB, 'G-003');
  });

  it('25. should flag empty touch maps when strict mode is active in analyzePairwiseCollisions', () => {
    const goals = [
      { id: 'G-001', touchMap: ['src/module_1.ts'] },
      { id: 'G-002', touchMap: [] },
    ];
    const nonStrict = analyzePairwiseCollisions(goals, { strict: false });
    assert.equal(nonStrict.clean, true);
    assert.deepEqual(nonStrict.emptyTouchMapGoals, ['G-002']);

    const strict = analyzePairwiseCollisions(goals, { strict: true });
    assert.equal(strict.clean, false);
    assert.equal(strict.hasCollision, true);
    assert.deepEqual(strict.emptyTouchMapGoals, ['G-002']);
  });

  // ── 9. Active Backlog Goal Discovery & Collision Gate Runner ────────────────
  it('26. should discover active goal markdown files and ignore _template.md and dotfiles', () => {
    const mockGoalsDir = path.join(tmpDir, 'docs/07-backlog/goals');
    fs.mkdirSync(mockGoalsDir, { recursive: true });
    fs.writeFileSync(path.join(mockGoalsDir, '_template.md'), '# Template', 'utf8');
    fs.writeFileSync(path.join(mockGoalsDir, '.DS_Store'), '', 'utf8');
    fs.writeFileSync(path.join(mockGoalsDir, 'G-ALPHA-001.md'), '# Alpha\n## Touch map\n- `src/a.ts`\n', 'utf8');
    fs.writeFileSync(path.join(mockGoalsDir, 'G-BETA-001.md'), '# Beta\n## Touch map\n- `src/b.ts`\n', 'utf8');

    const discovered = discoverActiveGoals(mockGoalsDir);
    assert.equal(discovered.length, 2);
    assert.ok(discovered[0].endsWith('G-ALPHA-001.md'));
    assert.ok(discovered[1].endsWith('G-BETA-001.md'));
  });

  it('27. should run collision gate programmatically with exitCode 0 on disjoint goals', () => {
    const fileA = path.join(tmpDir, 'G-DISJOINT-1.md');
    const fileB = path.join(tmpDir, 'G-DISJOINT-2.md');
    fs.writeFileSync(fileA, '# G-DISJOINT-1\n## Touch map\n- `src/one.ts`\n', 'utf8');
    fs.writeFileSync(fileB, '# G-DISJOINT-2\n## Touch map\n- `src/two.ts`\n', 'utf8');

    const gateResult = runCollisionGate({
      targets: [fileA, fileB],
      strict: true,
      baseDir: tmpDir,
    });

    assert.equal(gateResult.exitCode, 0);
    assert.equal(gateResult.result.pass, true);
    assert.equal(gateResult.result.totalCollisions, 0);
  });

  it('28. should run collision gate programmatically with exitCode 1 on colliding goals', () => {
    const fileA = path.join(tmpDir, 'G-COLLIDE-1.md');
    const fileB = path.join(tmpDir, 'G-COLLIDE-2.md');
    fs.writeFileSync(fileA, '# G-COLLIDE-1\n## Touch map\n- `src/conflict.ts`\n', 'utf8');
    fs.writeFileSync(fileB, '# G-COLLIDE-2\n## Touch map\n- `src/conflict.ts`\n', 'utf8');

    const gateResult = runCollisionGate({
      targets: [fileA, fileB],
      baseDir: tmpDir,
    });

    assert.equal(gateResult.exitCode, 1);
    assert.equal(gateResult.result.pass, false);
    assert.equal(gateResult.result.totalCollisions, 1);
    assert.equal(gateResult.result.collisionMatrix[0].goalA, 'G-COLLIDE-1');
    assert.equal(gateResult.result.collisionMatrix[0].goalB, 'G-COLLIDE-2');
  });

  // ── 10. CLI Subprocess Verification ─────────────────────────────────────────
  it('29. should execute touch-map-collision-gate.mjs CLI against active repository goals with exit code 0', () => {
    const cliScript = path.resolve('scripts/harness/touch-map-collision-gate.mjs');
    const output = execFileSync('node', [cliScript], { encoding: 'utf8' });
    assert.ok(output.includes('ALL TOUCH MAPS DISJOINT'));
    assert.ok(output.includes('Pairwise isolation invariant'));
  });

  it('30. should execute touch-map-collision-gate.mjs CLI with --json and output valid JSON', () => {
    const cliScript = path.resolve('scripts/harness/touch-map-collision-gate.mjs');
    const output = execFileSync('node', [cliScript, '--json'], { encoding: 'utf8' });
    const parsed = JSON.parse(output);
    assert.equal(parsed.pass, true);
    assert.equal(parsed.totalCollisions, 0);
    assert.ok(Array.isArray(parsed.goals));
    assert.ok(parsed.goalCount >= 0);
  });

  it('31. should execute touch-map-collision-gate.mjs CLI with colliding target arguments and fail with exit code 1', () => {
    const fileA = path.join(tmpDir, 'G-FAIL-A.md');
    const fileB = path.join(tmpDir, 'G-FAIL-B.md');
    fs.writeFileSync(fileA, '# G-FAIL-A\n## Touch map\n- `src/clash.mjs`\n', 'utf8');
    fs.writeFileSync(fileB, '# G-FAIL-B\n## Touch map\n- `src/clash.mjs`\n', 'utf8');

    const cliScript = path.resolve('scripts/harness/touch-map-collision-gate.mjs');
    let exitCode = 0;
    try {
      execFileSync('node', [cliScript, fileA, fileB], { encoding: 'utf8', stdio: 'pipe' });
    } catch (err) {
      exitCode = err.status;
    }
    assert.equal(exitCode, 1);
  });
});
