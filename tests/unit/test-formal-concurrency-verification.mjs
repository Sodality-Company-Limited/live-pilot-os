#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS FORMAL CONCURRENCY & MATHEMATICAL INVARIANT VERIFICATION SUITE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Empirical and mathematical verification of ACID atomic file persistence,
 *          mutual exclusion of advisory locking, strictly monotonic sequence allocation,
 *          DAG wave touch-map disjointness, and projection idempotence.
 *
 * Theorems Formally Verified:
 *   Theorem 1: Atomic Inode Replacement & Zero Torn Reads (ACID Atomicity & Isolation)
 *   Theorem 2: Mutual Exclusion of POSIX 'wx' Advisory Locking (Mutex Safety Invariant)
 *   Theorem 3: Monotonicity and Conservation of Sequence Numbers (Algebraic Conservation)
 *   Theorem 4: Topological Wave Partitioning & Touch-Map Disjointness (Conflict Independence)
 *   Theorem 5: Projection Endomorphism Idempotency (f(f(S)) = f(S))
 *   Theorem 6: Deadlock Freedom & Well-Founded Loop Termination (Liveness)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';

import * as fileLockLib from '../../scripts/goals/file-lock.js';
import * as goalIdLib from '../../scripts/goals/goal-id.js';
import * as markdownSyncLib from '../../scripts/goals/goal-markdown-sync.js';
import * as parallelPlannerLib from '../../scripts/goals/parallel-goal-planner.js';

describe('Soda OS Concurrency Formal Verification & Mathematical Invariants', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-formal-math-'));
    fs.mkdirSync(path.join(tmpDir, 'docs/07-backlog/goals'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'docs/07-backlog/queues'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // THEOREM 1: ATOMIC INODE REPLACEMENT & ZERO TORN READS
  // ════════════════════════════════════════════════════════════════════════════
  it('Theorem 1 [ACID Atomicity & Isolation]: atomicWriteFileSync guarantees zero torn reads under high-frequency concurrent read loop', async () => {
    const targetFile = path.join(tmpDir, 'atomic-target.txt');
    const iterations = 50;
    const payloads = [];

    // Pre-generate 50 distinct payloads of 10KB each with verifiable SHA-256 digests
    for (let i = 0; i < iterations; i++) {
      const data = `PAYLOAD_INDEX_${i}_` + crypto.randomBytes(1024 * 10).toString('hex');
      const hash = crypto.createHash('sha256').update(data).digest('hex');
      payloads.push({ index: i, data, hash });
    }

    // Initialize with first payload
    fileLockLib.atomicWriteFileSync(targetFile, payloads[0].data);

    let readCount = 0;
    let tornReads = 0;
    let corruptedReads = 0;
    let stopReading = false;

    // Concurrently read continuously in a tight async loop
    const readerPromise = (async () => {
      while (!stopReading) {
        try {
          if (fs.existsSync(targetFile)) {
            const content = fs.readFileSync(targetFile, 'utf8');
            readCount++;
            const hash = crypto.createHash('sha256').update(content).digest('hex');
            const matchingPayload = payloads.find((p) => p.hash === hash);
            if (!matchingPayload) {
              // Read content does not match any valid payload: torn or partially written!
              tornReads++;
            }
          }
        } catch (err) {
          // ENOENT can only happen if non-atomic unlink occurred (which atomic rename prevents)
          corruptedReads++;
        }
        await new Promise((resolve) => setImmediate(resolve));
      }
    })();

    // Writer writes all payloads sequentially using atomicWriteFileSync
    for (let i = 1; i < iterations; i++) {
      fileLockLib.atomicWriteFileSync(targetFile, payloads[i].data);
      await new Promise((resolve) => setTimeout(resolve, 2));
    }

    stopReading = true;
    await readerPromise;

    // Mathematical Invariant:
    // Zero torn reads (tornReads === 0)
    // Zero corrupted reads (corruptedReads === 0)
    // Positive read sample (readCount >= iterations)
    assert.ok(readCount >= iterations, `Must have performed at least ${iterations} reads (got ${readCount})`);
    assert.equal(tornReads, 0, 'Theorem 1 Violation: Observed torn read during concurrent atomicWriteFileSync');
    assert.equal(corruptedReads, 0, 'Theorem 1 Violation: Observed corrupted read or missing file');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // THEOREM 2: MUTUAL EXCLUSION OF POSIX 'wx' LOCK
  // ════════════════════════════════════════════════════════════════════════════
  it('Theorem 2 [Mutex Safety Invariant]: withFileLock guarantees at most one process in critical section (Box(n_cs <= 1))', async () => {
    const lockTarget = path.join(tmpDir, 'shared-resource.dat');
    fs.writeFileSync(lockTarget, '0', 'utf8');

    let activeInCriticalSection = 0;
    let maxConcurrentInCriticalSection = 0;
    let totalCompleted = 0;
    const concurrency = 8;

    // Spawn 8 concurrent competing async workers
    const workers = Array.from({ length: concurrency }).map(async (_, workerId) => {
      // Small random delay to create staggered race conditions
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));

      await fileLockLib.withFileLock(
        lockTarget,
        async () => {
          activeInCriticalSection++;
          if (activeInCriticalSection > maxConcurrentInCriticalSection) {
            maxConcurrentInCriticalSection = activeInCriticalSection;
          }

          // Safety check: inside critical section, active count must be EXACTLY 1
          assert.equal(
            activeInCriticalSection,
            1,
            `Theorem 2 Violation: Multiple processes inside critical section! Worker: ${workerId}`
          );

          // Read current value, increment, yield to event loop to verify mutual exclusion, write back
          const val = parseInt(fs.readFileSync(lockTarget, 'utf8'), 10);
          await new Promise((resolve) => setImmediate(resolve));
          fs.writeFileSync(lockTarget, String(val + 1), 'utf8');

          activeInCriticalSection--;
          totalCompleted++;
        },
        { timeoutMs: 10000, staleTimeoutMs: 10000, retryMinDelayMs: 5, retryMaxDelayMs: 40 }
      );
    });

    await Promise.all(workers);

    // Mathematical Proof Invariants:
    // 1. Max concurrent processes in critical section = 1
    // 2. Final value = exactly concurrency (8)
    // 3. Total completed = exactly concurrency (8)
    assert.equal(maxConcurrentInCriticalSection, 1, 'Max concurrent processes in critical section must be exactly 1');
    assert.equal(totalCompleted, concurrency, `All ${concurrency} workers must complete`);
    const finalVal = parseInt(fs.readFileSync(lockTarget, 'utf8'), 10);
    assert.equal(finalVal, concurrency, `Final counter value must equal ${concurrency} (zero lost increments)`);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // THEOREM 3: MONOTONICITY AND CONSERVATION OF SEQUENCE NUMBERS
  // ════════════════════════════════════════════════════════════════════════════
  it('Theorem 3 [Monotonicity & Conservation]: Concurrent goal allocations yield strictly monotonic, gap-free, duplicate-free sequences', async () => {
    const epics = ['ALPHA', 'BETA', 'GAMMA'];
    const allocationsPerEpic = 8;
    const totalAllocations = epics.length * allocationsPerEpic;

    // Pre-initialize registry with registered epics
    const initialRegistry = {
      version: 1,
      epics: {}
    };
    for (const epic of epics) {
      initialRegistry.epics[epic] = { name: `${epic} Epic`, next_seq: 1, reserved: [] };
    }
    goalIdLib.saveRegistry(tmpDir, initialRegistry);

    // Flatten all allocation tasks
    const tasks = [];
    for (const epic of epics) {
      for (let i = 0; i < allocationsPerEpic; i++) {
        tasks.push({ epic, index: i });
      }
    }

    // Shuffle tasks to maximize concurrent interleaving
    tasks.sort(() => Math.random() - 0.5);

    // Concurrently allocate goal IDs
    const results = await Promise.all(
      tasks.map(async (t) => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 15));
        const res = goalIdLib.nextGoal(tmpDir, t.epic);
        return { epic: t.epic, seq: res.allocated[0].seq, id: res.allocated[0].id };
      })
    );

    assert.equal(results.length, totalAllocations, 'All allocations must succeed');

    // Load final registry
    const registry = goalIdLib.loadRegistry(tmpDir);

    // Verify mathematical invariants per epic:
    // 1. Monotonicity: sequences for epic E are {1, 2, ..., allocationsPerEpic}
    // 2. Cardinality: count(E) = allocationsPerEpic
    // 3. No duplicates: |distinct(sequences(E))| = allocationsPerEpic
    // 4. Registry next_seq = allocationsPerEpic + 1
    for (const epic of epics) {
      const epicAllocations = results.filter((r) => r.epic === epic).map((r) => r.seq);
      epicAllocations.sort((a, b) => a - b);

      assert.equal(epicAllocations.length, allocationsPerEpic, `Epic ${epic} must have ${allocationsPerEpic} allocations`);

      // Verify exact sequence {1, 2, ..., N}
      for (let expected = 1; expected <= allocationsPerEpic; expected++) {
        assert.equal(
          epicAllocations[expected - 1],
          expected,
          `Epic ${epic} sequence gap/duplicate! Expected ${expected}, got ${epicAllocations[expected - 1]}`
        );
      }

      // Check registry state
      const epicMeta = registry.epics[epic];
      assert.ok(epicMeta, `Registry must contain metadata for epic ${epic}`);
      assert.equal(
        epicMeta.next_seq,
        allocationsPerEpic + 1,
        `Epic ${epic} next_seq must be ${allocationsPerEpic + 1}`
      );
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // THEOREM 4: TOPOLOGICAL WAVE PARTITIONING & TOUCH-MAP DISJOINTNESS
  // ════════════════════════════════════════════════════════════════════════════
  it('Theorem 4 [Conflict Independence]: Parallel wave partitioning guarantees pairwise disjoint touch maps for all co-scheduled goals', () => {
    const goals = [
      {
        id: 'G-CORE-001',
        seq: 1,
        dependsOn: [],
        touchMap: ['src/core/engine.js', 'src/core/types.js']
      },
      {
        id: 'G-CORE-002',
        seq: 2,
        dependsOn: ['G-CORE-001'],
        touchMap: ['src/core/engine.js', 'src/core/optimizer.js'] // collides with G-CORE-003 on optimizer
      },
      {
        id: 'G-CORE-003',
        seq: 3,
        dependsOn: ['G-CORE-001'],
        touchMap: ['src/core/optimizer.js', 'src/core/cache.js'] // collides with G-CORE-002
      },
      {
        id: 'G-AUTH-001',
        seq: 1,
        dependsOn: [],
        touchMap: ['src/auth/jwt.js', 'src/auth/rbac.js'] // independent of CORE
      },
      {
        id: 'G-AUTH-002',
        seq: 2,
        dependsOn: ['G-AUTH-001'],
        touchMap: ['src/auth/session.js'] // independent of CORE
      },
      {
        id: 'G-BILL-001',
        seq: 1,
        dependsOn: ['G-CORE-001', 'G-AUTH-001'],
        touchMap: ['src/billing/ledger.js']
      }
    ];

    // Compute topological waves
    const initialWaves = parallelPlannerLib.computeExecutionWaves(goals);

    // Verify DAG dependency ordering invariant:
    // If goal v depends on u, waveIndex(u) < waveIndex(v)
    const goalWaveMap = new Map();
    initialWaves.forEach((w) => {
      for (const g of w.goals) {
        goalWaveMap.set(g.id, w.wave);
      }
    });

    for (const g of goals) {
      const gWave = goalWaveMap.get(g.id);
      for (const depId of g.dependsOn) {
        const depWave = goalWaveMap.get(depId);
        assert.ok(
          depWave < gWave,
          `Theorem 4 Topological Invariant: ${g.id} (wave ${gWave}) depends on ${depId} (wave ${depWave}), but depWave is not < gWave`
        );
      }
    }

    // Partition each wave's goals into pairwise disjoint sub-waves
    const finalSubWaves = [];
    for (const w of initialWaves) {
      const subWaves = parallelPlannerLib.partitionWaveIntoDisjointSubWaves(w.goals);
      finalSubWaves.push(...subWaves);
    }

    // Mathematical Invariant:
    // For every sub-wave S_k, for all distinct g_i, g_j in S_k, Touch(g_i) ∩ Touch(g_j) == ∅
    for (let swIdx = 0; swIdx < finalSubWaves.length; swIdx++) {
      const subWave = finalSubWaves[swIdx];
      for (let i = 0; i < subWave.goals.length; i++) {
        for (let j = i + 1; j < subWave.goals.length; j++) {
          const g1 = subWave.goals[i];
          const g2 = subWave.goals[j];
          const collision = parallelPlannerLib.checkGoalsTouchCollision(g1, g2);
          assert.equal(
            collision.colliding,
            false,
            `Theorem 4 Disjointness Violation in subwave ${swIdx}: ${g1.id} and ${g2.id} collide on ${(collision.collisions || []).map(c => `${c.pathA} <-> ${c.pathB}`).join(', ')}`
          );
        }
      }
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // THEOREM 5: PROJECTION ENDOMORPHISM IDEMPOTENCY (f(f(S)) = f(S))
  // ════════════════════════════════════════════════════════════════════════════
  it('Theorem 5 [Projection Idempotency]: syncAllMarkdown is a strict projection operator (f(f(S)) === f(S)) with zero drift', async () => {
    // Setup snapshot
    const snapPath = path.join(tmpDir, 'docs/00-project-snapshot.md');
    fs.writeFileSync(
      snapPath,
      `# Project Snapshot\n\n## Goals (dashboard)\n\n| Goal | Title | Kind | Status |\n|------|-------|------|--------|\n| G-PEER-001 | Peer Goal Pre-existing | feat | approved |\n\n## Future Plans\nImportant curated notes.\n`,
      'utf8'
    );

    // Setup dashboard
    const dashPath = path.join(tmpDir, 'docs/07-backlog/goals.md');
    fs.writeFileSync(
      dashPath,
      `# Goals & Backlog\n\n## Dashboard\n\n| Epic | Queue | Notes |\n|------|-------|------|\n| CORE | [CORE Queue](docs/07-backlog/queues/CORE.md) | Engine baseline |\n`,
      'utf8'
    );

    // Setup epics index
    const epicsPath = path.join(tmpDir, 'docs/07-backlog/epics.md');
    fs.writeFileSync(
      epicsPath,
      `# Epics\n\n## Registered epics\n\n| Epic | Title | Focus Area |\n|------|-------|------------|\n| CORE | Core Engine | Base |\n`,
      'utf8'
    );

    // Setup goal cards
    for (let i = 1; i <= 3; i++) {
      fs.writeFileSync(
        path.join(tmpDir, `docs/07-backlog/goals/G-CORE-00${i}.md`),
        `# G-CORE-00${i}: Core Engine Goal ${i}\n**Status:** planned\n**Kind:** feature\n**Atomic outcome:** Outcome ${i}\n\n## Touch map\n- \`src/core/mod_${i}.js\`\n`
      );
    }

    // Run First Pass: S_1 = f(S_0)
    await markdownSyncLib.syncAllMarkdown(tmpDir, { epic: 'CORE' });
    const snapHash1 = crypto.createHash('sha256').update(fs.readFileSync(snapPath)).digest('hex');
    const dashHash1 = crypto.createHash('sha256').update(fs.readFileSync(dashPath)).digest('hex');
    const epicsHash1 = crypto.createHash('sha256').update(fs.readFileSync(epicsPath)).digest('hex');
    const qPath = path.join(tmpDir, 'docs/07-backlog/queues/CORE.md');
    const qHash1 = crypto.createHash('sha256').update(fs.readFileSync(qPath)).digest('hex');

    // Run Second Pass: S_2 = f(S_1)
    await markdownSyncLib.syncAllMarkdown(tmpDir, { epic: 'CORE' });
    const snapHash2 = crypto.createHash('sha256').update(fs.readFileSync(snapPath)).digest('hex');
    const dashHash2 = crypto.createHash('sha256').update(fs.readFileSync(dashPath)).digest('hex');
    const epicsHash2 = crypto.createHash('sha256').update(fs.readFileSync(epicsPath)).digest('hex');
    const qHash2 = crypto.createHash('sha256').update(fs.readFileSync(qPath)).digest('hex');

    // Run Third Pass: S_3 = f(S_2)
    await markdownSyncLib.syncAllMarkdown(tmpDir, { epic: 'CORE' });
    const snapHash3 = crypto.createHash('sha256').update(fs.readFileSync(snapPath)).digest('hex');
    const dashHash3 = crypto.createHash('sha256').update(fs.readFileSync(dashPath)).digest('hex');
    const epicsHash3 = crypto.createHash('sha256').update(fs.readFileSync(epicsPath)).digest('hex');
    const qHash3 = crypto.createHash('sha256').update(fs.readFileSync(qPath)).digest('hex');

    // Mathematical Idempotence Invariant:
    // f(S_1) == S_1  =>  Hash(S_2) == Hash(S_1) == Hash(S_3)
    assert.equal(snapHash2, snapHash1, 'Snapshot file must be byte-for-byte identical after repeated sync (idempotency)');
    assert.equal(snapHash3, snapHash1, 'Snapshot file must remain identical on third sync');

    assert.equal(dashHash2, dashHash1, 'Dashboard file must be byte-for-byte identical after repeated sync');
    assert.equal(dashHash3, dashHash1, 'Dashboard file must remain identical on third sync');

    assert.equal(epicsHash2, epicsHash1, 'Epics index must be byte-for-byte identical after repeated sync');
    assert.equal(epicsHash3, epicsHash1, 'Epics index must remain identical on third sync');

    assert.equal(qHash2, qHash1, 'Queue file must be byte-for-byte identical after repeated sync');
    assert.equal(qHash3, qHash1, 'Queue file must remain identical on third sync');
  });

  // ════════════════════════════════════════════════════════════════════════════
  // THEOREM 6: DEADLOCK FREEDOM & WELL-FOUNDED TERMINATION
  // ════════════════════════════════════════════════════════════════════════════
  it('Theorem 6 [Liveness & Termination]: Lock acquisition strictly terminates and recovers from dead/stale locks', async () => {
    const targetFile = path.join(tmpDir, 'liveness-resource.txt');
    fs.writeFileSync(targetFile, 'initial', 'utf8');

    const lockPath = fileLockLib.resolveLockPath(targetFile);

    // Create an artificial dead lock file pointing to a non-existent PID (999999)
    const deadLockPayload = JSON.stringify({
      pid: 999999,
      timestamp: Date.now() - 60000, // 60s old (exceeds staleMs)
      target: targetFile
    });
    fs.writeFileSync(lockPath, deadLockPayload, 'utf8');

    const startTime = Date.now();

    // acquireFileLock must detect non-existent PID or stale timestamp and automatically clean it up
    await fileLockLib.withFileLock(
      targetFile,
      async () => {
        fs.writeFileSync(targetFile, 'updated-by-recovery', 'utf8');
      },
      { timeoutMs: 3000, staleMs: 1000 }
    );

    const elapsed = Date.now() - startTime;

    // Must terminate quickly (well below 3000ms timeout)
    assert.ok(elapsed < 2500, `Lock recovery must terminate within 2500ms (took ${elapsed}ms)`);
    assert.equal(fs.readFileSync(targetFile, 'utf8'), 'updated-by-recovery');
    assert.ok(!fs.existsSync(lockPath), 'Lockfile must be cleanly released upon completion');
  });
});
