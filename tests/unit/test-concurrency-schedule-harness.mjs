#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS UNIT TEST SUITE: CONCURRENCY SCHEDULE HARNESS & INVARIANT ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Goal Reference: G-PROOF-011 (Concurrency Verification Profile & Sequentialization)
 * Invariants Verified:
 *   - Article I: Zero Mocks, Zero Stubs, Zero String Simulations
 *   - 64-bit Packed Tagged Pointer (32-bit tag + 32-bit pointer) Packing & Unpacking
 *   - Atomic CAS Tagged Pointer Monotonic Version Progression & Rejection Mechanics
 *   - Empirical Proof of ABA Vulnerability in Naive Pointer vs 100% Immunity in Tagged Pointer
 *   - Lock-Free Treiber Stack LIFO Semantics with ABA Immunity
 *   - Deterministic Schedule Sequentializer Interleaving Correctness & Intra-Task Ordering
 *   - Combinatorial Bound Counting: (sum L_i)! / prod(L_i!)
 *   - Lost Update Race Condition Detection & Serializability Equivalence
 *   - TOCTOU (Time-of-Check to Time-of-Use) Race Window Detection
 *   - Reentrancy & Critical Section Overlap Detection
 *   - Wait-For Graph Deadlock & Circular Wait Cycle Detection
 *   - Livelock Indefinite Cycling Detection
 *   - Monotonic Distributed Fencing Token Enforcement & Stale Write Rejection
 *   - Concurrency Harness Invariant Suite & Proof Receipt Integrity
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

import {
  packTaggedPointer,
  unpackTaggedPointer,
  AtomicTaggedPointer,
  AtomicNaivePointer,
  simulateABAHazard,
  verifyABAImmunity,
  TreiberStack,
  MonotonicFencingStorage,
  DistributedLockManager,
  verifyMonotonicFencingProtocol,
  ScheduleSequentializer
} from '../../scripts/lib/schedule-sequentializer.mjs';

import {
  runConcurrencyVerification,
  buildProofReceipt,
  computeFileSha256,
  getGitCommitSha
} from '../../scripts/harness/concurrency-schedule-harness.mjs';

import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

describe('Concurrency Schedule Verification Engine & Sequentializer (G-PROOF-011)', () => {

  describe('1. 64-Bit Packed Tagged Pointer Mathematics & Bit Packing', () => {
    it('packTaggedPointer and unpackTaggedPointer round-trip integrity', () => {
      const tag = 42;
      const pointer = 1337;
      const packed = packTaggedPointer(tag, pointer);
      const unpacked = unpackTaggedPointer(packed);

      assert.equal(typeof packed, 'bigint');
      assert.equal(unpacked.tag, tag);
      assert.equal(unpacked.pointer, pointer);
    });

    it('packTaggedPointer masks and handles 32-bit unsigned boundaries', () => {
      const max32 = 0xFFFFFFFF;
      const packed = packTaggedPointer(max32, max32);
      const unpacked = unpackTaggedPointer(packed);

      assert.equal(unpacked.tag, max32);
      assert.equal(unpacked.pointer, max32);

      // Verify zero boundaries
      const zeroPacked = packTaggedPointer(0, 0);
      const zeroUnpacked = unpackTaggedPointer(zeroPacked);
      assert.equal(zeroUnpacked.tag, 0);
      assert.equal(zeroUnpacked.pointer, 0);
    });

    it('packTaggedPointer bit shift places tag in high 32 bits and pointer in low 32 bits', () => {
      const tag = 0x12345678;
      const pointer = 0x9ABCDEF0;
      const packed = packTaggedPointer(tag, pointer);

      const highBits = Number(packed >> 32n);
      const lowBits = Number(packed & 0xFFFFFFFFn);

      assert.equal(highBits, tag);
      assert.equal(lowBits, pointer);
    });
  });

  describe('2. Atomic Tagged Pointer Compare-And-Swap Operations', () => {
    it('AtomicTaggedPointer initializes with pointer and tag correctly', () => {
      const atomic = new AtomicTaggedPointer(100, 5);
      assert.equal(atomic.getPointer(), 100);
      assert.equal(atomic.getTag(), 5);

      const snapshot = atomic.load();
      assert.equal(snapshot.pointer, 100);
      assert.equal(snapshot.tag, 5);
    });

    it('AtomicTaggedPointer compareAndSwap succeeds when tag and pointer match, incrementing tag monotonically', () => {
      const atomic = new AtomicTaggedPointer(100, 10);
      const res = atomic.compareAndSwap(10, 100, 200);

      assert.equal(res.success, true);
      assert.equal(res.newTag, 11);
      assert.equal(atomic.getPointer(), 200);
      assert.equal(atomic.getTag(), 11);
    });

    it('AtomicTaggedPointer compareAndSwap fails closed when expected tag mismatches', () => {
      const atomic = new AtomicTaggedPointer(100, 10);
      const res = atomic.compareAndSwap(9, 100, 200); // stale tag 9 instead of 10

      assert.equal(res.success, false);
      assert.equal(res.current.tag, 10);
      assert.equal(res.current.pointer, 100);
      assert.equal(atomic.getPointer(), 100); // untouched
      assert.equal(atomic.getTag(), 10); // untouched
    });

    it('AtomicTaggedPointer compareAndSwap fails closed when expected pointer mismatches', () => {
      const atomic = new AtomicTaggedPointer(100, 10);
      const res = atomic.compareAndSwap(10, 999, 200); // mismatched pointer

      assert.equal(res.success, false);
      assert.equal(atomic.getPointer(), 100);
      assert.equal(atomic.getTag(), 10);
    });

    it('AtomicTaggedPointer compareAndSwapPacked operates on raw 64-bit integer values', () => {
      const atomic = new AtomicTaggedPointer(100, 1);
      const currentPacked = atomic.getPacked();
      const targetPacked = packTaggedPointer(2, 200);

      const successRes = atomic.compareAndSwapPacked(currentPacked, targetPacked);
      assert.equal(successRes.success, true);
      assert.equal(atomic.getPointer(), 200);
      assert.equal(atomic.getTag(), 2);

      const failRes = atomic.compareAndSwapPacked(currentPacked, targetPacked);
      assert.equal(failRes.success, false);
    });

    it('AtomicTaggedPointer store updates pointer and increments tag monotonically', () => {
      const atomic = new AtomicTaggedPointer(50, 1);
      atomic.store(75);
      assert.equal(atomic.getPointer(), 75);
      assert.equal(atomic.getTag(), 2);
    });
  });

  describe('3. ABA Hazard Simulation & Empirical Tagged Pointer Immunity', () => {
    it('AtomicNaivePointer succeeds erroneously during ABA scenario (demonstrating ABA vulnerability)', () => {
      const result = simulateABAHazard(false);
      assert.equal(result.isTagged, false);
      assert.equal(result.abaOccurred, true);
      assert.equal(result.casSucceeded, true, 'Naive pointer must erroneously succeed on ABA reversion');
      assert.equal(result.abaDetectedAndRejected, false);
    });

    it('AtomicTaggedPointer rejects ABA mutation fail-closed (demonstrating ABA immunity)', () => {
      const result = simulateABAHazard(true);
      assert.equal(result.isTagged, true);
      assert.equal(result.abaOccurred, true);
      assert.equal(result.casSucceeded, false, 'Tagged pointer must fail CAS due to tag mismatch');
      assert.equal(result.abaDetectedAndRejected, true);
    });

    it('verifyABAImmunity proves 100% rejection rate across 100 trials with zero false positives', () => {
      const audit = verifyABAImmunity(100);
      assert.equal(audit.totalTrials, 100);
      assert.equal(audit.rejectedCount, 100);
      assert.equal(audit.falseSuccessCount, 0);
      assert.equal(audit.immunityRatio, 1.0);
      assert.equal(audit.passed, true);
    });
  });

  describe('4. Lock-Free Treiber Stack with ABA Protection', () => {
    it('TreiberStack with Tagged Pointer maintains LIFO ordering across push and pop sequences', () => {
      const stack = new TreiberStack(true);
      stack.push('first');
      stack.push('second');
      stack.push('third');

      assert.equal(stack.pop(), 'third');
      assert.equal(stack.pop(), 'second');
      assert.equal(stack.pop(), 'first');
      assert.equal(stack.pop(), null);
    });

    it('TreiberStack returns null when popping from empty stack', () => {
      const stack = new TreiberStack(true);
      assert.equal(stack.pop(), null);
    });

    it('TreiberStack operates correctly with numeric values and interleaved operations', () => {
      const stack = new TreiberStack(true);
      stack.push(10);
      stack.push(20);
      assert.equal(stack.pop(), 20);
      stack.push(30);
      assert.equal(stack.pop(), 30);
      assert.equal(stack.pop(), 10);
      assert.equal(stack.pop(), null);
    });
  });

  describe('5. Deterministic Schedule Sequentializer Interleaving Combinatorics', () => {
    it('ScheduleSequentializer.generateInterleavings preserves intra-task step order across all interleavings', () => {
      const tasks = [
        {
          id: 'T1',
          steps: [{ name: 'T1_s1' }, { name: 'T1_s2' }]
        },
        {
          id: 'T2',
          steps: [{ name: 'T2_s1' }, { name: 'T2_s2' }]
        }
      ];

      const interleavings = ScheduleSequentializer.generateInterleavings(tasks);
      assert.equal(interleavings.length, 6);

      for (const sched of interleavings) {
        let t1StepIndex = -1;
        let t2StepIndex = -1;

        for (const item of sched) {
          if (item.taskId === 'T1') {
            assert.ok(item.stepIndex > t1StepIndex, 'Task T1 step order must be strictly monotonically increasing');
            t1StepIndex = item.stepIndex;
          } else if (item.taskId === 'T2') {
            assert.ok(item.stepIndex > t2StepIndex, 'Task T2 step order must be strictly monotonically increasing');
            t2StepIndex = item.stepIndex;
          }
        }
      }
    });

    it('ScheduleSequentializer.generateInterleavings generates mathematically exact combinatorial permutations', () => {
      // 3 tasks with 1 step each: 3! / (1! * 1! * 1!) = 6
      const tasks3 = [
        { id: 'T1', steps: [{ name: 's1' }] },
        { id: 'T2', steps: [{ name: 's1' }] },
        { id: 'T3', steps: [{ name: 's1' }] }
      ];

      const res3 = ScheduleSequentializer.generateInterleavings(tasks3);
      assert.equal(res3.length, 6);

      // 2 tasks: T1 has 3 steps, T2 has 1 step: 4! / (3! * 1!) = 4
      const tasksUneven = [
        { id: 'T1', steps: [{ name: 's1' }, { name: 's2' }, { name: 's3' }] },
        { id: 'T2', steps: [{ name: 's1' }] }
      ];
      const resUneven = ScheduleSequentializer.generateInterleavings(tasksUneven);
      assert.equal(resUneven.length, 4);
    });

    it('ScheduleSequentializer.generateInterleavings handles single-task and empty-task inputs cleanly', () => {
      assert.deepEqual(ScheduleSequentializer.generateInterleavings([]), []);

      const singleTask = [{ id: 'T1', steps: [{ name: 'a' }, { name: 'b' }] }];
      const singleRes = ScheduleSequentializer.generateInterleavings(singleTask);
      assert.equal(singleRes.length, 1);
      assert.equal(singleRes[0].length, 2);
    });

    it('ScheduleSequentializer.generateInterleavings respects bounded maxDepth parameter', () => {
      const tasks = [
        { id: 'T1', steps: [{ name: 's1' }, { name: 's2' }, { name: 's3' }] },
        { id: 'T2', steps: [{ name: 's1' }, { name: 's2' }, { name: 's3' }] }
      ];

      const res = ScheduleSequentializer.generateInterleavings(tasks, { maxDepth: 2 });
      for (const sched of res) {
        assert.equal(sched.length, 2);
      }
    });

    it('ScheduleSequentializer.executeSchedule executes steps sequentially and captures accurate state trace', () => {
      const tasks = [
        {
          id: 'T1',
          steps: [
            { name: 'add_5', fn: (state) => { state.val += 5; } },
            { name: 'mul_2', fn: (state) => { state.val *= 2; } }
          ]
        }
      ];

      const sched = [
        { taskId: 'T1', stepIndex: 0, step: tasks[0].steps[0] },
        { taskId: 'T1', stepIndex: 1, step: tasks[0].steps[1] }
      ];

      const outcome = ScheduleSequentializer.executeSchedule(sched, { val: 10 });
      assert.equal(outcome.success, true);
      assert.equal(outcome.finalState.val, 30); // (10 + 5) * 2 = 30
      assert.equal(outcome.trace.length, 2);
      assert.equal(outcome.trace[0].stateSnapshot.val, 15);
      assert.equal(outcome.trace[1].stateSnapshot.val, 30);
    });

    it('ScheduleSequentializer.exploreAllSchedules aggregates unique final states across interleavings', () => {
      const tasks = [
        { id: 'T1', steps: [{ name: 'set_A', fn: (s) => { s.x = 'A'; } }] },
        { id: 'T2', steps: [{ name: 'set_B', fn: (s) => { s.x = 'B'; } }] }
      ];

      const exploration = ScheduleSequentializer.exploreAllSchedules(tasks, { x: 'init' });
      assert.equal(exploration.schedulesCount, 2);
      assert.equal(exploration.uniqueFinalStates.length, 2);
      const stateVals = exploration.uniqueFinalStates.map(s => s.x).sort();
      assert.deepEqual(stateVals, ['A', 'B']);
    });
  });

  describe('6. Race Condition & Anomaly Detection Engines', () => {
    it('detectLostUpdates flags non-serializable interleavings causing lost update anomaly', () => {
      const tasks = [
        {
          id: 'T1',
          steps: [
            { name: 'read_1', fn: (s, { context }) => { context.r1 = s.count; } },
            { name: 'write_1', fn: (s, { context }) => { s.count = context.r1 + 1; } }
          ]
        },
        {
          id: 'T2',
          steps: [
            { name: 'read_2', fn: (s, { context }) => { context.r2 = s.count; } },
            { name: 'write_2', fn: (s, { context }) => { s.count = context.r2 + 1; } }
          ]
        }
      ];

      const report = ScheduleSequentializer.detectLostUpdates(tasks, { count: 0 }, 'count');
      assert.equal(report.lostUpdatesDetected, true);
      // Serial executions produce count: 2.
      // Interleavings where both read before either writes produce count: 1 (lost update!).
      assert.ok(report.anomalousSchedulesCount > 0);
      assert.deepEqual(report.serialOutcomes, [2, 2]);
    });

    it('detectLostUpdates reports zero lost updates for atomic / commutative operations', () => {
      const tasks = [
        { id: 'T1', steps: [{ name: 'atomic_inc', fn: (s) => { s.count += 1; } }] },
        { id: 'T2', steps: [{ name: 'atomic_inc', fn: (s) => { s.count += 1; } }] }
      ];

      const report = ScheduleSequentializer.detectLostUpdates(tasks, { count: 0 }, 'count');
      assert.equal(report.lostUpdatesDetected, false);
      assert.equal(report.anomalousSchedulesCount, 0);
    });

    it('detectTOCTOU detects race window between check and use separated by concurrent mutation', () => {
      const tasks = [
        {
          id: 'buyer',
          steps: [
            { name: 'check_stock' },
            { name: 'purchase' }
          ]
        },
        {
          id: 'canceller',
          steps: [
            { name: 'deplete_stock' }
          ]
        }
      ];

      const audit = ScheduleSequentializer.detectTOCTOU(tasks, {}, {
        checkStep: 'check_stock',
        mutationStep: 'deplete_stock',
        useStep: 'purchase'
      });

      assert.equal(audit.toctouDetected, true);
      assert.ok(audit.violationsCount > 0);
    });

    it('detectTOCTOU reports zero violations when no interfering mutation occurs', () => {
      const tasks = [
        {
          id: 'reader',
          steps: [
            { name: 'check_stock' },
            { name: 'purchase' }
          ]
        },
        {
          id: 'harmless_reader',
          steps: [
            { name: 'read_metadata' }
          ]
        }
      ];

      const audit = ScheduleSequentializer.detectTOCTOU(tasks, {}, {
        checkStep: 'check_stock',
        mutationStep: 'deplete_stock',
        useStep: 'purchase'
      });

      assert.equal(audit.toctouDetected, false);
      assert.equal(audit.violationsCount, 0);
    });

    it('detectReentrancyViolations detects overlapping critical section entries', () => {
      const tasks = [
        { id: 'T1', steps: [{ name: 'enter_section' }, { name: 'exit_section' }] },
        { id: 'T2', steps: [{ name: 'enter_section' }, { name: 'exit_section' }] }
      ];

      const audit = ScheduleSequentializer.detectReentrancyViolations(tasks, {}, {
        enterStep: 'enter_section',
        exitStep: 'exit_section'
      });

      assert.equal(audit.reentrancyDetected, true);
      assert.ok(audit.violationsCount > 0);
    });

    it('detectReentrancyViolations reports zero violations for non-overlapping executions', () => {
      // Single task cannot overlap with itself when step order is strictly sequential
      const tasks = [
        { id: 'T1', steps: [{ name: 'enter_section' }, { name: 'exit_section' }] }
      ];

      const audit = ScheduleSequentializer.detectReentrancyViolations(tasks, {}, {
        enterStep: 'enter_section',
        exitStep: 'exit_section'
      });

      assert.equal(audit.reentrancyDetected, false);
      assert.equal(audit.violationsCount, 0);
    });

    it('detectDeadlocks identifies circular wait cycles in Wait-For Graph and outputs thread dump', () => {
      const tasks = [
        {
          id: 'T1',
          steps: [
            { action: 'acquire_lock', lockId: 'L1' },
            { action: 'acquire_lock', lockId: 'L2' },
            { action: 'release_lock', lockId: 'L2' },
            { action: 'release_lock', lockId: 'L1' }
          ]
        },
        {
          id: 'T2',
          steps: [
            { action: 'acquire_lock', lockId: 'L2' },
            { action: 'acquire_lock', lockId: 'L1' },
            { action: 'release_lock', lockId: 'L1' },
            { action: 'release_lock', lockId: 'L2' }
          ]
        }
      ];

      const audit = ScheduleSequentializer.detectDeadlocks(tasks);
      assert.equal(audit.hasDeadlock, true);
      assert.ok(audit.deadlocksCount > 0);
      assert.ok(audit.deadlockTraces[0].threadDump.length > 0);
      assert.ok(Array.isArray(audit.deadlockTraces[0].cycle));
    });

    it('detectDeadlocks reports zero deadlocks for ordered lock hierarchies (L1 then L2 everywhere)', () => {
      const tasks = [
        {
          id: 'T1',
          steps: [
            { action: 'acquire_lock', lockId: 'L1' },
            { action: 'acquire_lock', lockId: 'L2' },
            { action: 'release_lock', lockId: 'L2' },
            { action: 'release_lock', lockId: 'L1' }
          ]
        },
        {
          id: 'T2',
          steps: [
            { action: 'acquire_lock', lockId: 'L1' }, // Respects lock hierarchy order!
            { action: 'acquire_lock', lockId: 'L2' },
            { action: 'release_lock', lockId: 'L2' },
            { action: 'release_lock', lockId: 'L1' }
          ]
        }
      ];

      const audit = ScheduleSequentializer.detectDeadlocks(tasks);
      assert.equal(audit.hasDeadlock, false);
      assert.equal(audit.deadlocksCount, 0);
    });

    it('detectLivelocks detects tasks cycling without making progress beyond step threshold', () => {
      const tasks = [
        {
          id: 'spinner',
          steps: [
            { name: 'spin', fn: (s) => { s.tick++; } },
            { name: 'spin', fn: (s) => { s.tick++; } }
          ]
        }
      ];

      // Condition: progress requires s.done === true, but spinner only increments s.tick
      const audit = ScheduleSequentializer.detectLivelocks(
        tasks,
        { tick: 0, done: false },
        (s) => s.done === true,
        2
      );

      assert.equal(audit.hasLivelock, true);
      assert.ok(audit.livelockTraces.length > 0);
    });
  });

  describe('7. Distributed Monotonic Fencing Tokens Engine', () => {
    it('MonotonicFencingStorage accepts writes with strictly ascending fencing tokens', () => {
      const storage = new MonotonicFencingStorage();

      const w1 = storage.write(1n, 'key_1', 'val_1');
      assert.equal(w1.committed, true);
      assert.equal(storage.getHighWaterMark(), 1n);

      const w2 = storage.write(5n, 'key_1', 'val_2');
      assert.equal(w2.committed, true);
      assert.equal(storage.getHighWaterMark(), 5n);

      const read = storage.read('key_1');
      assert.equal(read.exists, true);
      assert.equal(read.value, 'val_2');
    });

    it('MonotonicFencingStorage rejects writes with stale or equal fencing tokens fail-closed', () => {
      const storage = new MonotonicFencingStorage();
      storage.write(10n, 'account', 'balance_100');

      // Stale write attempt (token 8 < 10)
      const staleWrite = storage.write(8n, 'account', 'stale_write');
      assert.equal(staleWrite.committed, false);
      assert.ok(staleWrite.error.includes('REJECTED'));

      // Duplicate write attempt (token 10 == 10)
      const dupWrite = storage.write(10n, 'account', 'dup_write');
      assert.equal(dupWrite.committed, false);

      // Verify state was not modified
      assert.equal(storage.read('account').value, 'balance_100');
    });

    it('DistributedLockManager issues monotonically increasing fencing tokens across clients', () => {
      const lockManager = new DistributedLockManager();
      const t1 = lockManager.acquireLock('client_A').fencingToken;
      const t2 = lockManager.acquireLock('client_B').fencingToken;
      const t3 = lockManager.acquireLock('client_A').fencingToken;

      assert.ok(t1 < t2, 'Tokens must strictly increase');
      assert.ok(t2 < t3, 'Tokens must strictly increase');
    });

    it('verifyMonotonicFencingProtocol proves 100% rejection of stale split-brain writes across trials', () => {
      const audit = verifyMonotonicFencingProtocol(50);
      assert.equal(audit.totalTrials, 50);
      assert.equal(audit.rejectedStaleCount, 50);
      assert.equal(audit.acceptedAscendingCount, 50);
      assert.equal(audit.passed, true);
    });
  });

  describe('8. Concurrency Verification Harness & Proof Receipt System', () => {
    it('runConcurrencyVerification returns success with all 8 invariant checks passing', () => {
      const report = runConcurrencyVerification({
        tasks: 2,
        depth: 6,
        abaTrials: 50,
        fencingTrials: 25
      });

      assert.equal(report.success, true);
      assert.equal(report.totalChecks, 8);
      assert.equal(report.passedChecks, 8);
      assert.equal(report.failedChecks, 0);
    });

    it('buildProofReceipt produces valid schema version 1 proof receipt matching file SHA256 hashes', () => {
      const report = runConcurrencyVerification();
      const receipt = buildProofReceipt(report);

      assert.equal(receipt.schema_version, 1);
      assert.equal(receipt.goal_id, 'G-PROOF-011');
      assert.equal(receipt.classification, 'executable_invariant');
      assert.equal(receipt.certification, 'PASS');
      assert.equal(receipt.invariants.length, 4);

      // Validate source files hashes
      assert.equal(receipt.source_files.length, 2);
      for (const sf of receipt.source_files) {
        const diskHash = computeFileSha256(sf.path);
        assert.equal(sf.sha256, diskHash, `Receipt hash must match disk hash for ${sf.path}`);
      }

      // Validate through proof-receipt-validator
      const valResult = validateProofReceipt(receipt);
      assert.equal(valResult.valid, true, `Proof receipt must pass validator: ${valResult.errors.join(', ')}`);
    });

    it('concurrency-schedule-harness CLI execution exits code 0 and supports --json and --output-receipt flags', () => {
      const tempReceiptPath = path.join(os.tmpdir(), `test-receipt-${Date.now()}.json`);

      try {
        const cliOutput = execSync(
          `node scripts/harness/concurrency-schedule-harness.mjs --json --output-receipt ${tempReceiptPath}`,
          { encoding: 'utf8' }
        );

        const parsedJson = JSON.parse(cliOutput);
        assert.equal(parsedJson.success, true);
        assert.equal(parsedJson.passedChecks, 8);

        // Verify receipt was written to temporary path
        assert.ok(fs.existsSync(tempReceiptPath));
        const receiptContent = JSON.parse(fs.readFileSync(tempReceiptPath, 'utf8'));
        assert.equal(receiptContent.goal_id, 'G-PROOF-011');
        assert.equal(receiptContent.certification, 'PASS');
      } finally {
        if (fs.existsSync(tempReceiptPath)) {
          fs.unlinkSync(tempReceiptPath);
        }
      }
    });
  });

});
