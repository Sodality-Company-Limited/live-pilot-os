#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * ⚔️ SODA OS ADVERSARIAL STRESS TEST & EMPIRICAL CHALLENGE SUITE
 * ════════════════════════════════════════════════════════════════════════════════
 * Challenger: challenger_wave2_2 (Empirical Adversary)
 * Target Modules: scripts/lib/touch-map-analyzer.mjs, scripts/harness/touch-map-collision-gate.mjs
 * Goal Reference: G-PROOF-004 (Touch-Map Collision Gate)
 * Scope & Hostile Stress Vectors:
 *   1. Hostile Path Pairs & Normalization Invariants (Prefix Bleed, Windows/Unix Slashes, Redundant Slashes)
 *   2. Sibling Directory Isolation vs Parent-Child Containment
 *   3. Complex Glob Permutations (*, **, ?, Extensions, Escaped Special Chars, Negative Globs)
 *   4. Shared Tracking File Filtering & Sanitization Boundaries
 *   5. Large Touch Map Scaling (1,000+ paths, 190-pair matrix, Latency & Memory Bounds)
 *   6. Programmatic & CLI Invocation Verification (Exit Codes 0/1, --json, --strict, Active Goals)
 *   7. Empirical Flaw Reproduction & Vulnerability Oracles (parseTouchMap '**' Drop, Fail-Open Risk)
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

describe('Adversarial Stress Test: Touch Map Collision Gate (G-PROOF-004)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-adversarial-touch-map-'));
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. HOSTILE PATH PAIRS & NORMALIZATION INVARIANTS
  // ════════════════════════════════════════════════════════════════════════════
  describe('1. Hostile Path Pairs & Normalization Invariants', () => {
    it('1.1 Prefix bleed attacks: similar prefixes must never collide across boundaries', () => {
      // Direct root prefixes
      assert.equal(pathsCollide('foo', 'food'), false, 'foo vs food must not collide');
      assert.equal(pathsCollide('food', 'foo'), false, 'food vs foo must not collide');

      // Nested folder prefixes
      assert.equal(pathsCollide('src/foo', 'src/food'), false, 'src/foo vs src/food must not collide');
      assert.equal(pathsCollide('src/food', 'src/foo'), false, 'src/food vs src/foo must not collide');
      assert.equal(pathsCollide('src/foo/bar', 'src/food/bar'), false, 'src/foo/bar vs src/food/bar must not collide');

      // Common prefix bleed patterns in codebases
      assert.equal(pathsCollide('src/app', 'src/apple'), false, 'src/app vs src/apple must not collide');
      assert.equal(pathsCollide('src/auth', 'src/author'), false, 'src/auth vs src/author must not collide');
      assert.equal(pathsCollide('src/user', 'src/users'), false, 'src/user vs src/users must not collide');
      assert.equal(pathsCollide('src/payment', 'src/payments'), false, 'src/payment vs src/payments must not collide');
      assert.equal(pathsCollide('src/test', 'src/test_harness'), false, 'src/test vs src/test_harness must not collide');
    });

    it('1.2 Windows backslash vs Unix forward slash normalization and collision', () => {
      // Exact file match across platform slash representations
      assert.equal(pathsCollide('src\\lib\\core.js', 'src/lib/core.js'), true);
      assert.equal(pathsCollide('src/lib/core.js', 'src\\lib\\core.js'), true);

      // Directory prefix containment with Windows backslashes
      assert.equal(pathsCollide('src\\crates\\kernel', 'src/crates/kernel/index.ts'), true);
      assert.equal(pathsCollide('src/crates/kernel', 'src\\crates\\kernel\\lib.rs'), true);

      // Mixed slash styles
      assert.equal(pathsCollide('src\\crates/kernel\\sub/file.rs', 'src/crates/kernel/sub/file.rs'), true);
      assert.equal(pathsCollide('src\\crates\\*', 'src/crates/kernel/lib.rs'), true);
    });

    it('1.3 Redundant slash collapse and multi-slash stripping', () => {
      assert.equal(pathsCollide('a///b', 'a/b'), true);
      assert.equal(pathsCollide('a////b///c', 'a/b/c'), true);
      assert.equal(pathsCollide('src///crates///kernel///lib.rs', 'src/crates/kernel/lib.rs'), true);
      assert.equal(pathsCollide('src/dir///', 'src/dir'), true);
      assert.equal(pathsCollide('src/dir', 'src/dir///'), true);
    });

    it('1.4 Leading dot slash normalization', () => {
      assert.equal(pathsCollide('./src', 'src'), true);
      assert.equal(pathsCollide('./src/file.js', 'src/file.js'), true);
      assert.equal(pathsCollide('src/file.js', './src/file.js'), true);

      // Windows leading dot backslash
      const winDotSlash = String.raw`.\src\file.js`;
      assert.equal(pathsCollide(winDotSlash, 'src/file.js'), true);
    });

    it('1.5 Trailing slash directory normalization and boundary preservation', () => {
      assert.equal(pathsCollide('src/dir/', 'src/dir'), true);
      assert.equal(pathsCollide('src/dir/', 'src/dir/file.js'), true);
      assert.equal(pathsCollide('src/dir', 'src/dir/file.js'), true);
      assert.equal(pathsCollide('src/dir/', 'src/direct'), false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. SIBLING DIRECTORY ISOLATION VS PARENT-CHILD CONTAINMENT
  // ════════════════════════════════════════════════════════════════════════════
  describe('2. Sibling Directory Isolation vs Parent-Child Containment', () => {
    it('2.1 Sibling directories must remain strictly disjoint', () => {
      assert.equal(pathsCollide('src/crates/kernel', 'src/crates/transport'), false);
      assert.equal(pathsCollide('src/crates/kernel/lib.rs', 'src/crates/transport/lib.rs'), false);
      assert.equal(pathsCollide('apps/backend', 'apps/frontend'), false);
      assert.equal(pathsCollide('docs/01-vision', 'docs/02-product'), false);
      assert.equal(pathsCollide('tests/unit', 'tests/integration'), false);
      assert.equal(pathsCollide('scripts/lib', 'scripts/harness'), false);
    });

    it('2.2 Parent-child directory containment must collide symmetrically', () => {
      // Parent vs deeply nested child
      assert.equal(pathsCollide('src', 'src/crates/kernel/lib.rs'), true);
      assert.equal(pathsCollide('src/crates/kernel/lib.rs', 'src'), true);

      // Immediate parent directory
      assert.equal(pathsCollide('src/crates', 'src/crates/kernel'), true);
      assert.equal(pathsCollide('src/crates/kernel', 'src/crates'), true);

      // Root directory containment
      assert.equal(pathsCollide('docs', 'docs/07-backlog/goals/G-PROOF-004.md'), true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. COMPLEX GLOB PERMUTATIONS & PATTERN OVERLAPS
  // ════════════════════════════════════════════════════════════════════════════
  describe('3. Complex Glob Permutations & Pattern Overlaps', () => {
    it('3.1 Single asterisk wildcard glob collisions and boundaries', () => {
      assert.equal(pathsCollide('src/*', 'src/foo.js'), true);
      assert.equal(pathsCollide('src/*', 'src/*'), true);
      assert.equal(pathsCollide('src/*.js', 'src/foo.js'), true);
      assert.equal(pathsCollide('src/*.js', 'src/sub/foo.js'), false, 'single * must not match subdirectories');
      assert.equal(pathsCollide('src/*.js', 'src/*.ts'), false, 'distinct extensions in single * do not collide');
    });

    it('3.2 Recursive double asterisk wildcard globs', () => {
      assert.equal(pathsCollide('src/**/*.js', 'src/foo.js'), true);
      assert.equal(pathsCollide('src/**/*.js', 'src/sub/foo.js'), true);
      assert.equal(pathsCollide('src/**/*.js', 'src/a/b/c/foo.js'), true);
      assert.equal(pathsCollide('src/**', 'src/a/b/c/foo.js'), true);
      assert.equal(pathsCollide('src/**', 'src'), true);
      assert.equal(pathsCollide('src/**', 'test/**'), false);
      assert.equal(pathsCollide('src/**/test/*.js', 'src/a/b/test/unit.js'), true);
      assert.equal(pathsCollide('src/**/test/*.js', 'src/a/b/spec/unit.js'), false);
    });

    it('3.3 Extension-only wildcards and directory boundaries', () => {
      assert.equal(pathsCollide('*.mjs', 'test.mjs'), true);
      assert.equal(pathsCollide('*.mjs', 'src/test.mjs'), false, '*.mjs only matches root directory');
      assert.equal(pathsCollide('**/*.mjs', 'src/sub/test.mjs'), true);
      assert.equal(pathsCollide('*.js', '*.ts'), false);
    });

    it('3.4 Overlapping cross-glob pattern containment', () => {
      assert.equal(pathsCollide('src/**/*.js', 'src/components/*.js'), true);
      assert.equal(pathsCollide('src/components/*.js', 'src/**/*.js'), true);
      assert.equal(pathsCollide('src/crates/kernel/*', 'src/crates/transport/*'), false);
      assert.equal(pathsCollide('src/crates/kernel/**', 'src/crates/transport/**'), false);
    });

    it('3.5 Character escaping and special regex characters in filenames', () => {
      // Next.js dynamic routing square bracket filenames [id].js
      assert.equal(pathsCollide('src/pages/[id].js', 'src/pages/[id].js'), true);
      assert.equal(pathsCollide('src/pages/[id].js', 'src/pages/123.js'), false, '[id] is escaped, not a character class');
      assert.equal(pathsCollide('src/pages/*', 'src/pages/[id].js'), true);

      // SvelteKit and Nuxt special character files
      assert.equal(pathsCollide('src/pages/+page.svelte', 'src/pages/+page.svelte'), true);
      assert.equal(pathsCollide('src/pages/$param.vue', 'src/pages/$param.vue'), true);
    });

    it('3.6 Question mark single-character wildcards', () => {
      assert.equal(pathsCollide('src/file?.js', 'src/file1.js'), true);
      assert.equal(pathsCollide('src/file?.js', 'src/fileA.js'), true);
      assert.equal(pathsCollide('src/file?.js', 'src/file10.js'), false, '? matches exactly one character');
    });

    it('3.7 Negative globs handling', () => {
      // In touch maps, negative globs are not exclusion expressions, they are treated as literal filenames
      assert.equal(pathsCollide('!src/ignore.js', '!src/ignore.js'), true);
      assert.equal(pathsCollide('!src/ignore.js', 'src/ignore.js'), false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. SHARED TRACKING FILE FILTERING & SANITIZATION
  // ════════════════════════════════════════════════════════════════════════════
  describe('4. Shared Tracking File Filtering & Sanitization', () => {
    it('4.1 Recognized shared tracking patterns are identified', () => {
      assert.equal(isSharedTrackingFile('docs/00-project-snapshot.md'), true);
      assert.equal(isSharedTrackingFile('docs/07-backlog/goals.md'), true);
      assert.equal(isSharedTrackingFile('docs/07-backlog/epics.md'), true);
      assert.equal(isSharedTrackingFile('docs/07-backlog/epics/PROOF.md'), true);
      assert.equal(isSharedTrackingFile('docs/07-backlog/goal-id-registry.yaml'), true);
      assert.equal(isSharedTrackingFile('docs/07-backlog/goal-id-registry.yml'), true);
      assert.equal(isSharedTrackingFile('docs/07-backlog/queues/PROOF.md'), true);
      assert.equal(isSharedTrackingFile('CLARIFICATION.md'), true);
      assert.equal(isSharedTrackingFile('CLARIFICATION-001.md'), true);
      assert.equal(isSharedTrackingFile('docs/06_raw/index.md'), true);
      assert.equal(isSharedTrackingFile('docs/06_raw/log.md'), true);
    });

    it('4.2 Non-tracking domain files with similar names are not stripped', () => {
      assert.equal(isSharedTrackingFile('docs/00-project-snapshot-v2.md'), false);
      assert.equal(isSharedTrackingFile('src/CLARIFICATION.md'), false);
      assert.equal(isSharedTrackingFile('docs/06_raw/20261010_my_report.md'), false);
      assert.equal(isSharedTrackingFile('tests/unit/test-goals.md'), false);
    });

    it('4.3 Touch map sanitization filters tracking files and deduplicates entries', () => {
      const raw = [
        'src/core.js',
        './docs/07-backlog/goals.md',
        'src/core.js',
        'CLARIFICATION.md',
        './src/core.js',
        'tests/core.test.js',
      ];
      const sanitized = sanitizeTouchMap(raw);
      assert.deepEqual(sanitized, ['src/core.js', 'tests/core.test.js']);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. LARGE TOUCH MAP SCALING & MEMORY CONSUMPTION
  // ════════════════════════════════════════════════════════════════════════════
  describe('5. Large Touch Map Scaling (1,000+ Paths)', () => {
    it('5.1 1,000 vs 1,000 distinct disjoint paths executes within latency and memory budget', () => {
      const mapA = [];
      const mapB = [];
      for (let i = 0; i < 1000; i++) {
        mapA.push(`src/domain_a/component_${i}/handler.ts`);
        mapB.push(`src/domain_b/component_${i}/handler.ts`);
      }

      const memBefore = process.memoryUsage().heapUsed;
      const start = performance.now();
      const result = checkTouchMapCollision(mapA, mapB);
      const elapsedMs = performance.now() - start;
      const memDeltaMb = (process.memoryUsage().heapUsed - memBefore) / 1024 / 1024;

      assert.equal(result.colliding, false, '1,000 disjoint paths must report no collision');
      assert.equal(result.overlapCount, 0);
      assert.ok(elapsedMs < 2000, `Execution latency (${elapsedMs.toFixed(2)}ms) must be under 2000ms`);
      assert.ok(memDeltaMb < 50, `Heap memory delta (${memDeltaMb.toFixed(2)}MB) must be under 50MB`);
    });

    it('5.2 1,000 vs 1,000 paths with single boundary collision detected reliably', () => {
      const mapA = [];
      const mapB = [];
      for (let i = 0; i < 1000; i++) {
        mapA.push(`src/domain_a/component_${i}/handler.ts`);
        mapB.push(`src/domain_b/component_${i}/handler.ts`);
      }
      // Inject collision at the 1,000th path
      mapB[999] = 'src/domain_a/component_999/handler.ts';

      const start = performance.now();
      const result = checkTouchMapCollision(mapA, mapB);
      const elapsedMs = performance.now() - start;

      assert.equal(result.colliding, true, 'Injected collision at index 999 must be caught');
      assert.equal(result.overlapCount, 1);
      assert.equal(result.collisions[0].pathA, 'src/domain_a/component_999/handler.ts');
      assert.ok(elapsedMs < 2000, `Latency (${elapsedMs.toFixed(2)}ms) must be under 2000ms`);
    });

    it('5.3 Pairwise collision matrix of 20 goals x 50 paths (190 pairs) executes cleanly', () => {
      const goals = [];
      for (let g = 0; g < 20; g++) {
        const touchMap = [];
        for (let p = 0; p < 50; p++) {
          touchMap.push(`src/isolated_domain_${g}/feature_${p}/index.ts`);
        }
        goals.push({ id: `G-SCALE-${g}`, touchMap });
      }

      const start = performance.now();
      const analysis = analyzePairwiseCollisions(goals);
      const elapsedMs = performance.now() - start;

      assert.equal(analysis.clean, true);
      assert.equal(analysis.totalCollisions, 0);
      assert.equal(analysis.analyzedPairsCount, 190);
      assert.ok(elapsedMs < 1500, `Matrix latency (${elapsedMs.toFixed(2)}ms) must be under 1500ms`);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. PROGRAMMATIC AND CLI CONCURRENCY GATE EXECUTION
  // ════════════════════════════════════════════════════════════════════════════
  describe('6. Programmatic and CLI Concurrency Gate Execution', () => {
    it('6.1 Programmatic execution on disjoint synthetic goals exits 0 with pass: true', () => {
      const gA = path.join(tmpDir, 'G-DISJOINT-1.md');
      const gB = path.join(tmpDir, 'G-DISJOINT-2.md');
      fs.writeFileSync(gA, '# G-DISJOINT-1\n## Touch map\n- `src/domain_a/lib.ts`\n');
      fs.writeFileSync(gB, '# G-DISJOINT-2\n## Touch map\n- `src/domain_b/lib.ts`\n');

      const { exitCode, result } = runCollisionGate({
        targets: [gA, gB],
        baseDir: process.cwd(),
      });

      assert.equal(exitCode, 0);
      assert.equal(result.pass, true);
      assert.equal(result.totalCollisions, 0);
      assert.equal(result.analyzedPairsCount, 1);
    });

    it('6.2 Programmatic execution on colliding goals exits 1 with pass: false', () => {
      const gA = path.join(tmpDir, 'G-COLLIDE-1.md');
      const gB = path.join(tmpDir, 'G-COLLIDE-2.md');
      fs.writeFileSync(gA, '# G-COLLIDE-1\n## Touch map\n- `src/shared/service.ts`\n');
      fs.writeFileSync(gB, '# G-COLLIDE-2\n## Touch map\n- `src/shared/service.ts`\n');

      const { exitCode, result } = runCollisionGate({
        targets: [gA, gB],
        baseDir: process.cwd(),
      });

      assert.equal(exitCode, 1);
      assert.equal(result.pass, false);
      assert.equal(result.totalCollisions, 1);
      assert.equal(result.collisionMatrix.length, 1);
      assert.equal(result.collisionMatrix[0].collisions[0].pathA, 'src/shared/service.ts');
    });

    it('6.3 CLI invocation with disjoint targets exits with code 0', () => {
      const gA = path.join(tmpDir, 'G-CLI-A.md');
      const gB = path.join(tmpDir, 'G-CLI-B.md');
      fs.writeFileSync(gA, '# G-CLI-A\n## Touch map\n- `src/mod_a/file.js`\n');
      fs.writeFileSync(gB, '# G-CLI-B\n## Touch map\n- `src/mod_b/file.js`\n');

      const stdout = execFileSync(
        'node',
        ['scripts/harness/touch-map-collision-gate.mjs', gA, gB],
        { encoding: 'utf8' }
      );
      assert.match(stdout, /ALL TOUCH MAPS DISJOINT/);
    });

    it('6.4 CLI invocation with colliding targets fails with exit code 1', () => {
      const gA = path.join(tmpDir, 'G-CLI-COL-A.md');
      const gB = path.join(tmpDir, 'G-CLI-COL-B.md');
      fs.writeFileSync(gA, '# G-CLI-COL-A\n## Touch map\n- `src/conflict.js`\n');
      fs.writeFileSync(gB, '# G-CLI-COL-B\n## Touch map\n- `src/conflict.js`\n');

      let thrownErr = null;
      try {
        execFileSync(
          'node',
          ['scripts/harness/touch-map-collision-gate.mjs', gA, gB],
          { encoding: 'utf8' }
        );
      } catch (err) {
        thrownErr = err;
      }

      assert.ok(thrownErr !== null, 'CLI must exit non-zero on collision');
      assert.equal(thrownErr.status, 1);
      assert.match(thrownErr.stderr, /TOUCH MAP COLLISION DETECTED/);
      assert.match(thrownErr.stderr, /src\/conflict\.js/);
    });

    it('6.5 CLI with --json outputs valid JSON and correct schema', () => {
      const gA = path.join(tmpDir, 'G-CLI-JSON-A.md');
      const gB = path.join(tmpDir, 'G-CLI-JSON-B.md');
      fs.writeFileSync(gA, '# G-CLI-JSON-A\n## Touch map\n- `src/json_a.js`\n');
      fs.writeFileSync(gB, '# G-CLI-JSON-B\n## Touch map\n- `src/json_b.js`\n');

      const stdout = execFileSync(
        'node',
        ['scripts/harness/touch-map-collision-gate.mjs', '--json', gA, gB],
        { encoding: 'utf8' }
      );
      const parsed = JSON.parse(stdout);
      assert.equal(parsed.pass, true);
      assert.equal(parsed.totalCollisions, 0);
      assert.equal(parsed.goalCount, 2);
    });

    it('6.6 CLI with --strict fails with exit code 1 when a goal has an empty touch map', () => {
      const gEmpty = path.join(tmpDir, 'G-CLI-EMPTY.md');
      const gValid = path.join(tmpDir, 'G-CLI-VALID.md');
      fs.writeFileSync(gEmpty, '# G-CLI-EMPTY\n## Touch map\n<!-- empty -->\n');
      fs.writeFileSync(gValid, '# G-CLI-VALID\n## Touch map\n- `src/valid.js`\n');

      let thrownErr = null;
      try {
        execFileSync(
          'node',
          ['scripts/harness/touch-map-collision-gate.mjs', '--strict', gEmpty, gValid],
          { encoding: 'utf8' }
        );
      } catch (err) {
        thrownErr = err;
      }

      assert.ok(thrownErr !== null, 'CLI must exit with code 1 in strict mode for empty touch maps');
      assert.equal(thrownErr.status, 1);
      assert.match(thrownErr.stderr, /Strict Mode Violation/);
    });

    it('6.7 Repository active goals pass collision gate with 0 collisions', () => {
      const activeGoals = discoverActiveGoals('docs/07-backlog/goals');
      assert.ok(Array.isArray(activeGoals), 'Active goals array returned');

      const { exitCode, result } = runCollisionGate({
        targets: activeGoals,
        baseDir: process.cwd(),
      });

      assert.equal(exitCode, 0);
      assert.equal(result.pass, true);
      assert.equal(result.totalCollisions, 0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 7. EMPIRICAL FLAW REPRODUCTION & REMEDIATION VERIFICATION
  // ════════════════════════════════════════════════════════════════════════════
  describe('7. Empirical Flaw Reproduction & Remediation Verification', () => {
    it('7.1 REMEDIATION VERIFIED: parseTouchMap preserves double asterisk (**) recursive globs from markdown', () => {
      const markdown = `
# G-RECURSIVE-TEST
## Touch map
- \`docs/**\`
- \`src/**/*.ts\`
- \`crates/**/lib.rs\`
- \`src/index.ts\`
- **Declared Files:**
`;
      const parsed = parseTouchMap(markdown);

      // Remediation verified: recursive globs are preserved while bold text headers are ignored
      assert.deepEqual(
        parsed,
        ['docs/**', 'src/**/*.ts', 'crates/**/lib.rs', 'src/index.ts'],
        'REMEDIATION VERIFIED: docs/**, src/**/*.ts, and crates/**/lib.rs are preserved; bold headers stripped'
      );
    });

    it('7.2 REMEDIATION VERIFIED: Concurrency gate detects collision when goal uses recursive glob', () => {
      // Goal A claims all docs recursively
      const goalAMarkdown = `
# G-DOCS-ALL
## Touch map
- \`docs/**\`
`;
      // Goal B touches a specific guide in docs
      const goalBMarkdown = `
# G-DOCS-GUIDE
## Touch map
- \`docs/guide.md\`
`;

      const touchMapA = parseTouchMap(goalAMarkdown);
      const touchMapB = parseTouchMap(goalBMarkdown);

      assert.equal(touchMapA.length, 1, 'Goal A parsed touch map includes docs/**');
      assert.deepEqual(touchMapA, ['docs/**']);

      // The collision detector checks ['docs/**'] against ['docs/guide.md']:
      const result = checkTouchMapCollision(touchMapA, touchMapB);

      // FAIL-CLOSED INVARIANT VERIFIED: reports colliding=true, preventing unsafe parallel execution
      assert.equal(
        result.colliding,
        true,
        'REMEDIATION VERIFIED: Concurrency collision gate correctly detects overlap with recursive glob'
      );
    });

    it('7.3 REMEDIATION VERIFIED: Nested intermediate wildcard cross-glob collision detected', () => {
      // Both patterns match src/crates/kernel/lib.rs:
      // Path A: src/crates/*/lib.rs
      // Path B: src/crates/kernel/*
      const collides = pathsCollide('src/crates/*/lib.rs', 'src/crates/kernel/*');

      assert.equal(
        collides,
        true,
        'REMEDIATION VERIFIED: Cross-glob with intermediate wildcard detects overlap'
      );
    });

    it('7.4 REMEDIATION VERIFIED: Redundant slash normalization after leading dot-slash (.//src)', () => {
      // In normalizePath, redundant slashes are collapsed before stripping leading dot-slash.
      // Therefore, './/src' becomes 'src'.
      const normalized = normalizePath('.//src');
      assert.equal(normalized, 'src', 'REMEDIATION VERIFIED: .//src normalizes cleanly to src');
      assert.equal(pathsCollide('.//src', 'src'), true, './/src collides with src');
    });
  });
});
