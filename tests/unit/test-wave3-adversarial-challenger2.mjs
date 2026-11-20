/**
 * ════════════════════════════════════════════════════════════════════════════════
 * ⚔️ SODA OS ADVERSARIAL CHALLENGER SUITE — WAVE 3 (G-PROOF-007 & G-PROOF-011)
 * ════════════════════════════════════════════════════════════════════════════════
 * Challenger: challenger_wave3_2 (Empirical Adversary)
 * Target Goals:
 *   - G-PROOF-007: Adversarial Boundary & Extremal Arithmetic Mutation Harness
 *   - G-PROOF-011: Concurrency Verification Profile & Schedule Sequentialization
 *
 * Scope:
 *   1. Arithmetic Extremes: BigInt boundaries (2^63-1, 2^64-1, 2^128-1, 2^256-1) & under/overflow
 *   2. Precision Dust Draining: 10,000, 25,000, and 50,000 iterations asserting zero balance drift
 *   3. Identity Aliasing: Self-transfers, circular graphs (1, 2, 3, 5 nodes), DAG acyclicity
 *   4. Zero-Divisors & Non-Canonical Floats: NaN, Inf, subnormals, decimal fractions fail-closed
 *   5. ReDoS Safety & Homoglyphs: Sub-50ms execution ceiling, Unicode spoofing detection
 *   6. Atomic CAS Tagged Pointer ABA Immunity: 500 trials ABA simulation, 32-bit tag wrap-around
 *   7. Concurrency Combinatorics: Exact mathematical interleaving counts & intra-task ordering
 *   8. Race Condition Detectors: TOCTOU, Reentrancy, Lost Updates anomaly detection & false-negative checks
 *   9. Deadlock Detection: 2, 3, and 4-task circular Wait-For cycles vs ordered hierarchies
 *  10. Monotonic Fencing Tokens: 1,000 randomized tokens, split-brain rejection, boundary tokens
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  INT32_MIN,
  INT32_MAX,
  UINT32_MAX,
  INT64_MIN,
  INT64_MAX,
  UINT64_MAX,
  UINT128_MAX,
  UINT256_MAX,
  generateExtremalArithmeticProbes,
  generateUnsignedBoundaryProbes,
  generateIdentityAliasingProbes,
  detectIdentityAliasing,
  detectTransferCycle,
  simulateDustDraining,
  generateZeroDivisorProbes,
  generateNonCanonicalFloatProbes,
  generatePathologyProbes,
  detectHomoglyphs,
  safeRegexEvaluate,
  AdversarialProbeGenerator
} from '../../scripts/lib/adversarial-probe-generator.mjs';

import {
  validateMinorUnitArithmetic,
  validateTransfer,
  validateDivision,
  validatePayloadSanity,
  runAdversarialBoundaryHarness
} from '../../scripts/harness/adversarial-boundary-harness.mjs';

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
  runConcurrencyVerification
} from '../../scripts/harness/concurrency-schedule-harness.mjs';

describe('⚔️ Adversarial Challenge Suite — Wave 3 (Challenger 2)', () => {

  // ════════════════════════════════════════════════════════════════════════════
  // 1. G-PROOF-007: ARITHMETIC EXTREMES & BIGINT BOUNDARIES
  // ════════════════════════════════════════════════════════════════════════════
  describe('1. Arithmetic Extremes & Boundary Mutation Stress Tests', () => {
    it('1.1 BigInt boundary values (2^63-1, 2^64-1, 2^128-1, 2^256-1) pass under matching bitWidth', () => {
      // 2^63 - 1 (INT64_MAX)
      const res63 = validateMinorUnitArithmetic(INT64_MAX, { unsigned: true, bitWidth: 64 });
      assert.equal(res63.valid, true);
      assert.equal(res63.sanitizedAmount, 9223372036854775807n);

      // 2^64 - 1 (UINT64_MAX)
      const res64 = validateMinorUnitArithmetic(UINT64_MAX, { unsigned: true, bitWidth: 64 });
      assert.equal(res64.valid, true);
      assert.equal(res64.sanitizedAmount, 18446744073709551615n);

      // 2^128 - 1 (UINT128_MAX)
      const res128 = validateMinorUnitArithmetic(UINT128_MAX, { unsigned: true, bitWidth: 128 });
      assert.equal(res128.valid, true);
      assert.equal(res128.sanitizedAmount, 340282366920938463463374607431768211455n);

      // 2^256 - 1 (UINT256_MAX)
      const res256 = validateMinorUnitArithmetic(UINT256_MAX, { unsigned: true, bitWidth: 256 });
      assert.equal(res256.valid, true);
      assert.equal(res256.sanitizedAmount, UINT256_MAX);
    });

    it('1.2 Unsigned overflow past boundary ceiling fails closed', () => {
      // 2^64 (UINT64_MAX + 1) on bitWidth 64
      const over64 = validateMinorUnitArithmetic(UINT64_MAX + 1n, { unsigned: true, bitWidth: 64 });
      assert.equal(over64.valid, false);
      assert.match(over64.error, /exceeds ceiling/i);

      // 2^128 (UINT128_MAX + 1) on bitWidth 128
      const over128 = validateMinorUnitArithmetic(UINT128_MAX + 1n, { unsigned: true, bitWidth: 128 });
      assert.equal(over128.valid, false);
      assert.match(over128.error, /exceeds ceiling/i);

      // 2^256 (UINT256_MAX + 1) on bitWidth 256
      const over256 = validateMinorUnitArithmetic(UINT256_MAX + 1n, { unsigned: true, bitWidth: 256 });
      assert.equal(over256.valid, false);
      assert.match(over256.error, /exceeds ceiling/i);
    });

    it('1.3 Unsigned negative underflow probes fail closed', () => {
      const underflows = [
        -1n,
        -1,
        INT64_MIN,
        -9223372036854775807n,
        -1n * UINT128_MAX,
        -1n * UINT256_MAX
      ];

      for (const val of underflows) {
        const res = validateMinorUnitArithmetic(val, { unsigned: true });
        assert.equal(res.valid, false, `Value ${val} must be rejected on unsigned domain`);
        assert.match(res.error, /negative/i);
      }
    });

    it('1.4 Unsafe float precision beyond Number.MAX_SAFE_INTEGER fails closed', () => {
      const unsafeValues = [
        Number.MAX_SAFE_INTEGER + 1,
        Number.MAX_SAFE_INTEGER + 2,
        Number.MIN_SAFE_INTEGER - 1,
        1e20 // float representation loses integer precision
      ];

      for (const val of unsafeValues) {
        const res = validateMinorUnitArithmetic(val, { unsigned: false });
        assert.equal(res.valid, false, `Unsafe float ${val} must be rejected`);
        assert.match(res.error, /unsafe integer precision/i);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. G-PROOF-007: PRECISION DUST DRAINING (MASS CONSERVATION)
  // ════════════════════════════════════════════════════════════════════════════
  describe('2. Precision Dust Draining & Mathematical Invariant Conservation', () => {
    it('2.1 Standard 10,000 micro-transfers with 3-way remainder split preserves zero drift', () => {
      const sim = simulateDustDraining({ iterations: 10000, initialBalance: 1000000n });
      assert.equal(sim.totalConserved, true);
      assert.equal(sim.drift, 0n);
      assert.equal(sim.finalBalance, 1000000n);
      assert.equal(sim.splitsVerified, 10000);
    });

    it('2.2 Stress test: 25,000 iterations with large prime initial balance (999,983)', () => {
      const primeBalance = 999983n;
      const sim = simulateDustDraining({ iterations: 25000, initialBalance: primeBalance });
      assert.equal(sim.totalConserved, true);
      assert.equal(sim.drift, 0n);
      assert.equal(sim.finalBalance, primeBalance);
      assert.equal(sim.splitsVerified, 25000);
    });

    it('2.3 Stress test: 50,000 iterations with 2^63-1 initial balance preserves exact BigInt sum', () => {
      const hugeBalance = INT64_MAX; // 9223372036854775807n
      const sim = simulateDustDraining({ iterations: 50000, initialBalance: hugeBalance });
      assert.equal(sim.totalConserved, true);
      assert.equal(sim.drift, 0n);
      assert.equal(sim.finalBalance, hugeBalance);
      assert.equal(sim.splitsVerified, 50000);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. G-PROOF-007: IDENTITY ALIASING, CIRCULAR GRAPHS & DAGS
  // ════════════════════════════════════════════════════════════════════════════
  describe('3. Identity Aliasing & Circular Settlement Graphs', () => {
    it('3.1 Direct and normalized self-transfers fail closed', () => {
      const selfTransfers = [
        { from: 'vault_alpha', to: 'vault_alpha', amount: 1000n },
        { from: '  VAULT_ALPHA  ', to: 'vault_alpha', amount: 500n },
        { from: 'user_123', to: 'USER_123', amount: 100n },
        { from: '\tvault_beta\n', to: 'vault_beta', amount: 250n }
      ];

      for (const t of selfTransfers) {
        const aliasRes = detectIdentityAliasing(t);
        assert.equal(aliasRes.aliased, true);

        const xferRes = validateTransfer(t);
        assert.equal(xferRes.valid, false);
        assert.match(xferRes.error, /IDENTITY_ALIASING_REJECTED/i);
      }
    });

    it('3.2 Single-node self-loops and multi-node circular cycles are flagged', () => {
      // 1-node self-loop in batch transfers
      const loop1 = [{ from: 'node_a', to: 'node_a', amount: 100n }];
      assert.equal(detectTransferCycle(loop1).hasCycle, true);

      // 2-node reciprocal wash trading (A -> B -> A)
      const loop2 = [
        { from: 'node_a', to: 'node_b', amount: 100n },
        { from: 'node_b', to: 'node_a', amount: 100n }
      ];
      assert.equal(detectTransferCycle(loop2).hasCycle, true);

      // 3-node circular loop (A -> B -> C -> A)
      const loop3 = [
        { from: 'node_a', to: 'node_b', amount: 100n },
        { from: 'node_b', to: 'node_c', amount: 100n },
        { from: 'node_c', to: 'node_a', amount: 100n }
      ];
      assert.equal(detectTransferCycle(loop3).hasCycle, true);

      // 5-node extended circular loop (A -> B -> C -> D -> E -> A)
      const loop5 = [
        { from: 'node_1', to: 'node_2', amount: 10n },
        { from: 'node_2', to: 'node_3', amount: 20n },
        { from: 'node_3', to: 'node_4', amount: 30n },
        { from: 'node_4', to: 'node_5', amount: 40n },
        { from: 'node_5', to: 'node_1', amount: 50n }
      ];
      assert.equal(detectTransferCycle(loop5).hasCycle, true);
    });

    it('3.3 Disconnected graph containing a cycle in second component is detected', () => {
      const disconnectedGraph = [
        { from: 'acc_x', to: 'acc_y', amount: 100n }, // Disconnected acyclic component
        { from: 'acc_y', to: 'acc_z', amount: 50n },
        { from: 'acc_p', to: 'acc_q', amount: 200n }, // Disconnected cyclic component
        { from: 'acc_q', to: 'acc_r', amount: 200n },
        { from: 'acc_r', to: 'acc_p', amount: 200n }
      ];

      const res = detectTransferCycle(disconnectedGraph);
      assert.equal(res.hasCycle, true);
      assert.ok(res.cycle.includes('acc_p'));
    });

    it('3.4 Acyclic DAGs (trees and diamond topologies) pass without false positive cycles', () => {
      // Tree topology
      const treeTransfers = [
        { from: 'root', to: 'child_1', amount: 100n },
        { from: 'root', to: 'child_2', amount: 200n },
        { from: 'child_1', to: 'leaf_1a', amount: 50n },
        { from: 'child_1', to: 'leaf_1b', amount: 50n }
      ];
      assert.equal(detectTransferCycle(treeTransfers).hasCycle, false);

      // Diamond DAG topology (A -> B, A -> C, B -> D, C -> D)
      const diamondTransfers = [
        { from: 'origin_a', to: 'split_b', amount: 100n },
        { from: 'origin_a', to: 'split_c', amount: 100n },
        { from: 'split_b', to: 'join_d', amount: 100n },
        { from: 'split_c', to: 'join_d', amount: 100n }
      ];
      assert.equal(detectTransferCycle(diamondTransfers).hasCycle, false);

      const batchVal = validateTransfer(diamondTransfers);
      assert.equal(batchVal.valid, true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. G-PROOF-007: ZERO DIVISORS & NON-CANONICAL FLOATS
  // ════════════════════════════════════════════════════════════════════════════
  describe('4. Zero Divisors & Non-Canonical Floating Point Rejection', () => {
    it('4.1 All zero denominator representations (0, 0n, -0, 0.0) fail closed in division', () => {
      const zeros = [0, 0n, -0, +0, 0.0];
      for (const z of zeros) {
        const res = validateDivision(100n, z);
        assert.equal(res.valid, false);
        assert.match(res.error, /DIVISION_BY_ZERO_REJECTED/i);
      }
    });

    it('4.2 Non-canonical floats (NaN, +Inf, -Inf, subnormals) fail closed', () => {
      const nonCanonical = [NaN, Infinity, -Infinity];

      for (const val of nonCanonical) {
        // As numerator
        const resNum = validateDivision(val, 10n);
        assert.equal(resNum.valid, false);
        assert.match(resNum.error, /NON_CANONICAL_FLOAT_REJECTED/i);

        // As denominator
        const resDen = validateDivision(100n, val);
        assert.equal(resDen.valid, false);
        assert.match(resDen.error, /NON_CANONICAL_FLOAT_REJECTED/i);

        // In minor-unit arithmetic
        const resArith = validateMinorUnitArithmetic(val);
        assert.equal(resArith.valid, false);
      }

      // Subnormal float (Number.MIN_VALUE = 5e-324)
      const subnormalRes = validateMinorUnitArithmetic(Number.MIN_VALUE);
      assert.equal(subnormalRes.valid, false);
      assert.match(subnormalRes.error, /fractional float drift/i);

      // Decimal fractions
      const decimalRes = validateMinorUnitArithmetic(12.345);
      assert.equal(decimalRes.valid, false);
      assert.match(decimalRes.error, /fractional float drift/i);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. G-PROOF-007: REDOS SAFETY & PATHOLOGICAL PAYLOADS
  // ════════════════════════════════════════════════════════════════════════════
  describe('5. ReDoS Payload Safety & Pathology Defense', () => {
    it('5.1 Catastrophic polynomial and exponential ReDoS inputs are caught defensively < 50ms', () => {
      const redosAttacks = [
        { pattern: '^([a-zA-Z0-9]+)+$', input: 'a'.repeat(30) + '!' },
        { pattern: '^(a|aa)+$', input: 'a'.repeat(28) + 'X' },
        { pattern: '^(a+)+$', input: 'a'.repeat(35) + '!' },
        { pattern: '^(?:[0-9]+)+$', input: '1'.repeat(32) + '!' }
      ];

      for (const atk of redosAttacks) {
        const start = performance.now();
        const evalRes = safeRegexEvaluate(atk.pattern, atk.input, 50);
        const duration = performance.now() - start;

        assert.ok(duration < 50, `ReDoS execution took ${duration}ms, exceeding 50ms safe budget`);
        assert.equal(evalRes.matched, false);
        assert.equal(evalRes.rejectedAsDangerous, true);
      }
    });

    it('5.2 Confusable homoglyphs, zero-width spaces, and bidi overrides are flagged', () => {
      // Cyrillic spoof
      const cyrillic = detectHomoglyphs('\u0430dmin');
      assert.equal(cyrillic.suspicious, true);
      assert.ok(cyrillic.violations.some(v => v.includes('homoglyph')));

      // Zero-width space
      const zws = detectHomoglyphs('trans\u200Bfer');
      assert.equal(zws.suspicious, true);
      assert.ok(zws.violations.some(v => v.includes('zero-width')));

      // RTL override
      const bidi = detectHomoglyphs('\u202E321_acc');
      assert.equal(bidi.suspicious, true);
      assert.ok(bidi.violations.some(v => v.includes('bidirectional')));

      // Valid clean ASCII string
      const clean = detectHomoglyphs('account_transfer_123');
      assert.equal(clean.suspicious, false);
      assert.equal(clean.violations.length, 0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. G-PROOF-011: ATOMIC CAS TAGGED POINTER ABA IMMUNITY
  // ════════════════════════════════════════════════════════════════════════════
  describe('6. Atomic CAS Tagged Pointer ABA Immunity Stress Tests', () => {
    it('6.1 500 empirical trials of ABA mutation: naive CAS 0% immunity, tagged CAS 100% immunity', () => {
      const trials = 500;
      let naiveVulnerableCount = 0;
      let taggedImmuneCount = 0;

      for (let i = 0; i < trials; i++) {
        const naiveRes = simulateABAHazard(false);
        if (naiveRes.casSucceeded) naiveVulnerableCount++;

        const taggedRes = simulateABAHazard(true);
        if (taggedRes.abaDetectedAndRejected) taggedImmuneCount++;
      }

      assert.equal(naiveVulnerableCount, trials, 'Naive CAS must be 100% vulnerable to ABA');
      assert.equal(taggedImmuneCount, trials, 'Tagged CAS must be 100% immune to ABA');

      const immunityAudit = verifyABAImmunity(trials);
      assert.equal(immunityAudit.immunityRatio, 1.0);
      assert.equal(immunityAudit.falseSuccessCount, 0);
      assert.equal(immunityAudit.passed, true);
    });

    it('6.2 32-bit tag overflow wrap-around (2^32-1 -> 0) maintains monotonicity and CAS integrity', () => {
      const maxTag32 = 0xFFFFFFFF; // 4294967295
      const pointer = new AtomicTaggedPointer(100, maxTag32);

      assert.equal(pointer.getTag(), maxTag32);
      assert.equal(pointer.getPointer(), 100);

      // CAS increment causes 32-bit unsigned wrap to 0
      const casRes = pointer.compareAndSwap(maxTag32, 100, 200);
      assert.equal(casRes.success, true);
      assert.equal(pointer.getTag(), 0, 'Tag must wrap cleanly to 0 at 2^32');
      assert.equal(pointer.getPointer(), 200);

      // Subsequent CAS expecting wrapped tag 0 succeeds and increments to 1
      const casRes2 = pointer.compareAndSwap(0, 200, 300);
      assert.equal(casRes2.success, true);
      assert.equal(pointer.getTag(), 1);
      assert.equal(pointer.getPointer(), 300);
    });

    it('6.3 Raw 64-bit packed CAS (compareAndSwapPacked) fails closed on tag or pointer alteration', () => {
      const tagged = new AtomicTaggedPointer(555, 10);
      const packed = tagged.getPacked();

      // Modify tag in expected value (mismatch)
      const tamperedTagPacked = packTaggedPointer(11, 555);
      const resTamperedTag = tagged.compareAndSwapPacked(tamperedTagPacked, packTaggedPointer(12, 777));
      assert.equal(resTamperedTag.success, false);

      // Modify pointer in expected value (mismatch)
      const tamperedPtrPacked = packTaggedPointer(10, 556);
      const resTamperedPtr = tagged.compareAndSwapPacked(tamperedPtrPacked, packTaggedPointer(11, 777));
      assert.equal(resTamperedPtr.success, false);

      // Exact match succeeds
      const newPacked = packTaggedPointer(11, 888);
      const resExact = tagged.compareAndSwapPacked(packed, newPacked);
      assert.equal(resExact.success, true);
      assert.equal(tagged.getPointer(), 888);
      assert.equal(tagged.getTag(), 11);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 7. G-PROOF-011: CONCURRENCY COMBINATORICS & INTERLEAVINGS
  // ════════════════════════════════════════════════════════════════════════════
  describe('7. Concurrency Sequentializer Combinatorics & Order Preservation', () => {
    it('7.1 Combinatorial counts match multinomial theorem exactly', () => {
      // 2 tasks x 2 steps = 4! / (2! * 2!) = 6
      const tasks2x2 = [
        { id: 'T1', steps: [{ name: 's1' }, { name: 's2' }] },
        { id: 'T2', steps: [{ name: 's1' }, { name: 's2' }] }
      ];
      const res2x2 = ScheduleSequentializer.generateInterleavings(tasks2x2);
      assert.equal(res2x2.length, 6);

      // 2 tasks x 3 steps = 6! / (3! * 3!) = 20
      const tasks2x3 = [
        { id: 'T1', steps: [{ name: 's1' }, { name: 's2' }, { name: 's3' }] },
        { id: 'T2', steps: [{ name: 's1' }, { name: 's2' }, { name: 's3' }] }
      ];
      const res2x3 = ScheduleSequentializer.generateInterleavings(tasks2x3, { maxDepth: 10 });
      assert.equal(res2x3.length, 20);

      // 3 tasks x 2 steps = 6! / (2! * 2! * 2!) = 90
      const tasks3x2 = [
        { id: 'T1', steps: [{ name: 's1' }, { name: 's2' }] },
        { id: 'T2', steps: [{ name: 's1' }, { name: 's2' }] },
        { id: 'T3', steps: [{ name: 's1' }, { name: 's2' }] }
      ];
      const res3x2 = ScheduleSequentializer.generateInterleavings(tasks3x2, { maxDepth: 10 });
      assert.equal(res3x2.length, 90);
    });

    it('7.2 Intra-task step execution order is strictly preserved in 100% of generated interleavings', () => {
      const tasks = [
        { id: 'T1', steps: [{ name: 'A1' }, { name: 'A2' }, { name: 'A3' }] },
        { id: 'T2', steps: [{ name: 'B1' }, { name: 'B2' }] }
      ];
      const interleavings = ScheduleSequentializer.generateInterleavings(tasks);
      assert.equal(interleavings.length, 10); // 5! / (3! * 2!) = 10

      for (const schedule of interleavings) {
        // Extract steps for T1
        const t1Indices = schedule.filter(item => item.taskId === 'T1').map(item => item.stepIndex);
        assert.deepEqual(t1Indices, [0, 1, 2], 'T1 steps must appear in order 0, 1, 2');

        // Extract steps for T2
        const t2Indices = schedule.filter(item => item.taskId === 'T2').map(item => item.stepIndex);
        assert.deepEqual(t2Indices, [0, 1], 'T2 steps must appear in order 0, 1');
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 8. G-PROOF-011: RACE CONDITION DETECTORS (TOCTOU, REENTRANCY, LOST UPDATES)
  // ════════════════════════════════════════════════════════════════════════════
  describe('8. Race Condition & Anomaly Detection Engines', () => {
    it('8.1 TOCTOU detector catches concurrent check-mutation-use race window', () => {
      const toctouTasks = [
        {
          id: 'checker_task',
          steps: [
            { name: 'verify_balance', fn: (state) => { state.canWithdraw = state.balance >= 100; } },
            { name: 'withdraw_cash', fn: (state) => { if (state.canWithdraw) state.balance -= 100; } }
          ]
        },
        {
          id: 'interfering_task',
          steps: [
            { name: 'freeze_or_drain', fn: (state) => { state.balance = 0; } }
          ]
        }
      ];

      const audit = ScheduleSequentializer.detectTOCTOU(toctouTasks, { balance: 100 }, {
        checkStep: 'verify_balance',
        useStep: 'withdraw_cash',
        mutationStep: 'freeze_or_drain'
      });

      assert.equal(audit.toctouDetected, true);
      assert.ok(audit.violationsCount >= 1);
      assert.equal(audit.violations[0].mutatingTaskId, 'interfering_task');
    });

    it('8.2 TOCTOU detector reports zero violations when no interfering mutation exists', () => {
      const cleanTasks = [
        {
          id: 'checker_task',
          steps: [
            { name: 'verify_balance', fn: () => {} },
            { name: 'withdraw_cash', fn: () => {} }
          ]
        },
        {
          id: 'harmless_reader',
          steps: [
            { name: 'read_status', fn: () => {} }
          ]
        }
      ];

      const audit = ScheduleSequentializer.detectTOCTOU(cleanTasks, { balance: 100 }, {
        checkStep: 'verify_balance',
        useStep: 'withdraw_cash',
        mutationStep: 'freeze_or_drain'
      });

      assert.equal(audit.toctouDetected, false);
      assert.equal(audit.violationsCount, 0);
    });

    it('8.3 Reentrancy detector catches overlapping critical section entries', () => {
      const reentrantTasks = [
        {
          id: 'actor_1',
          steps: [
            { name: 'lock_resource' },
            { name: 'unlock_resource' }
          ]
        },
        {
          id: 'actor_2',
          steps: [
            { name: 'lock_resource' },
            { name: 'unlock_resource' }
          ]
        }
      ];

      const audit = ScheduleSequentializer.detectReentrancyViolations(reentrantTasks, {}, {
        enterStep: 'lock_resource',
        exitStep: 'unlock_resource'
      });

      assert.equal(audit.reentrancyDetected, true);
      assert.ok(audit.violationsCount >= 1);
    });

    it('8.4 Lost updates detected in concurrent counter increments vs commutative atomic operations', () => {
      // Non-atomic read-modify-write causes lost updates
      const nonAtomicTasks = [
        {
          id: 'task_1',
          steps: [
            { name: 'read', fn: (state, { context }) => { context.r1 = state.count; } },
            { name: 'write', fn: (state, { context }) => { state.count = context.r1 + 1; } }
          ]
        },
        {
          id: 'task_2',
          steps: [
            { name: 'read', fn: (state, { context }) => { context.r2 = state.count; } },
            { name: 'write', fn: (state, { context }) => { state.count = context.r2 + 1; } }
          ]
        }
      ];

      const auditNonAtomic = ScheduleSequentializer.detectLostUpdates(nonAtomicTasks, { count: 0 }, 'count');
      assert.equal(auditNonAtomic.lostUpdatesDetected, true);
      assert.ok(auditNonAtomic.anomalousSchedulesCount > 0);

      // Commutative direct atomic increments cause NO lost updates
      const atomicTasks = [
        {
          id: 'task_1',
          steps: [
            { name: 'atomic_inc', fn: (state) => { state.count += 1; } }
          ]
        },
        {
          id: 'task_2',
          steps: [
            { name: 'atomic_inc', fn: (state) => { state.count += 1; } }
          ]
        }
      ];

      const auditAtomic = ScheduleSequentializer.detectLostUpdates(atomicTasks, { count: 0 }, 'count');
      assert.equal(auditAtomic.lostUpdatesDetected, false);
      assert.equal(auditAtomic.anomalousSchedulesCount, 0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 9. G-PROOF-011: DEADLOCK DETECTION IN WAIT-FOR GRAPHS
  // ════════════════════════════════════════════════════════════════════════════
  describe('9. Wait-For Graph Deadlock Detection vs Ordered Hierarchies', () => {
    it('9.1 2-task circular dependency (L1, L2 inversion) triggers deadlock detection', () => {
      const tasks2 = [
        {
          id: 'task_A',
          steps: [
            { action: 'acquire_lock', lockId: 'L1' },
            { action: 'acquire_lock', lockId: 'L2' },
            { action: 'release_lock', lockId: 'L2' },
            { action: 'release_lock', lockId: 'L1' }
          ]
        },
        {
          id: 'task_B',
          steps: [
            { action: 'acquire_lock', lockId: 'L2' },
            { action: 'acquire_lock', lockId: 'L1' },
            { action: 'release_lock', lockId: 'L1' },
            { action: 'release_lock', lockId: 'L2' }
          ]
        }
      ];

      const audit = ScheduleSequentializer.detectDeadlocks(tasks2);
      assert.equal(audit.hasDeadlock, true);
      assert.ok(audit.deadlocksCount > 0);
      assert.ok(audit.deadlockTraces[0].cycle.includes('task_A'));
      assert.ok(audit.deadlockTraces[0].cycle.includes('task_B'));
    });

    it('9.2 3-task circular dependency (T1->T2->T3->T1) triggers deadlock detection', () => {
      const tasks3 = [
        {
          id: 'task_1',
          steps: [
            { action: 'acquire_lock', lockId: 'L1' },
            { action: 'acquire_lock', lockId: 'L2' }
          ]
        },
        {
          id: 'task_2',
          steps: [
            { action: 'acquire_lock', lockId: 'L2' },
            { action: 'acquire_lock', lockId: 'L3' }
          ]
        },
        {
          id: 'task_3',
          steps: [
            { action: 'acquire_lock', lockId: 'L3' },
            { action: 'acquire_lock', lockId: 'L1' }
          ]
        }
      ];

      const audit = ScheduleSequentializer.detectDeadlocks(tasks3);
      assert.equal(audit.hasDeadlock, true);
      assert.ok(audit.deadlocksCount > 0);
    });

    it('9.3 4-task circular dependency (T1->T2->T3->T4->T1) triggers deadlock detection', () => {
      const tasks4 = [
        { id: 'task_1', steps: [{ action: 'acquire_lock', lockId: 'L1' }, { action: 'acquire_lock', lockId: 'L2' }] },
        { id: 'task_2', steps: [{ action: 'acquire_lock', lockId: 'L2' }, { action: 'acquire_lock', lockId: 'L3' }] },
        { id: 'task_3', steps: [{ action: 'acquire_lock', lockId: 'L3' }, { action: 'acquire_lock', lockId: 'L4' }] },
        { id: 'task_4', steps: [{ action: 'acquire_lock', lockId: 'L4' }, { action: 'acquire_lock', lockId: 'L1' }] }
      ];

      const audit = ScheduleSequentializer.detectDeadlocks(tasks4, { maxDepth: 10 });
      assert.equal(audit.hasDeadlock, true);
      assert.ok(audit.deadlocksCount > 0);
    });

    it('9.4 Ordered lock hierarchy (L1 then L2 everywhere) reports zero deadlocks', () => {
      const orderedTasks = [
        {
          id: 'worker_1',
          steps: [
            { action: 'acquire_lock', lockId: 'L1' },
            { action: 'acquire_lock', lockId: 'L2' },
            { action: 'release_lock', lockId: 'L2' },
            { action: 'release_lock', lockId: 'L1' }
          ]
        },
        {
          id: 'worker_2',
          steps: [
            { action: 'acquire_lock', lockId: 'L1' },
            { action: 'acquire_lock', lockId: 'L2' },
            { action: 'release_lock', lockId: 'L2' },
            { action: 'release_lock', lockId: 'L1' }
          ]
        }
      ];

      const audit = ScheduleSequentializer.detectDeadlocks(orderedTasks);
      assert.equal(audit.hasDeadlock, false);
      assert.equal(audit.deadlocksCount, 0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 10. G-PROOF-011: MONOTONIC FENCING TOKENS
  // ════════════════════════════════════════════════════════════════════════════
  describe('10. Distributed Monotonic Fencing Tokens Engine', () => {
    it('10.1 1,000 randomized tokens: stale writes rejected 100%, ascending committed 100%', () => {
      const storage = new MonotonicFencingStorage();
      let maxAcceptedToken = 0n;

      // Seed-based pseudo-random generator
      let seed = 12345;
      function nextRand() {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed;
      }

      for (let i = 0; i < 1000; i++) {
        const candidateToken = BigInt(nextRand() % 5000);
        const writeRes = storage.write(candidateToken, 'test_key', `val_${i}`);

        if (candidateToken <= maxAcceptedToken) {
          assert.equal(writeRes.committed, false, `Token ${candidateToken} <= ${maxAcceptedToken} must be rejected`);
          assert.match(writeRes.error, /stale fencing token/i);
        } else {
          assert.equal(writeRes.committed, true, `Token ${candidateToken} > ${maxAcceptedToken} must commit`);
          maxAcceptedToken = candidateToken;
          assert.equal(storage.getHighWaterMark(), maxAcceptedToken);
        }
      }
    });

    it('10.2 Boundary fencing tokens (UINT64_MAX, UINT128_MAX) advance high water mark and block subsequent', () => {
      const storage = new MonotonicFencingStorage();

      // Write with UINT64_MAX
      const write64 = storage.write(UINT64_MAX, 'k1', 'val1');
      assert.equal(write64.committed, true);
      assert.equal(storage.getHighWaterMark(), UINT64_MAX);

      // Subsequent smaller write fails
      const writeStale = storage.write(UINT64_MAX - 1n, 'k1', 'stale');
      assert.equal(writeStale.committed, false);

      // Advance to UINT128_MAX
      const write128 = storage.write(UINT128_MAX, 'k1', 'val2');
      assert.equal(write128.committed, true);
      assert.equal(storage.getHighWaterMark(), UINT128_MAX);

      // Write with equal token fails closed
      const writeEqual = storage.write(UINT128_MAX, 'k1', 'dup');
      assert.equal(writeEqual.committed, false);
    });

    it('10.3 DistributedLockManager issues strictly monotonic leases across multiple clients', () => {
      const lm = new DistributedLockManager();
      const clients = ['client_1', 'client_2', 'client_3'];
      let prevToken = 0n;

      for (let i = 0; i < 100; i++) {
        const client = clients[i % clients.length];
        const lease = lm.acquireLock(client);
        assert.equal(lease.acquired, true);
        assert.ok(lease.fencingToken > prevToken, `Token ${lease.fencingToken} must be strictly greater than ${prevToken}`);
        prevToken = lease.fencingToken;
      }
    });
  });
});
