#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ ADVERSARIAL STRESS TEST SUITE: WAVE 3 G-PROOF-005 & G-PROOF-006
 * ════════════════════════════════════════════════════════════════════════════════
 * Author: challenger_wave3_1 (Empirical Challenger)
 * Scope:
 *   - G-PROOF-005: Property-Based Invariant Execution Harness & Shrinking Engine
 *   - G-PROOF-006: Stateful Model-Based Testing Harness & Shadow Oracle Validator
 * Invariants: Zero mocks, zero stubs, 100% concrete operational logic.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// G-PROOF-005 Imports
import {
  SplitMix64,
  Generators,
  checkProperty,
  shrinkCounterexample,
  checkConservation,
  checkMonotonicity,
  checkStrictMonotonicity,
  checkIdempotency,
  checkCommutativity,
  checkAssociativity,
  checkInvertibility,
  deepEqual
} from '../../scripts/lib/invariant-runner.mjs';

import {
  splitAmountConserved,
  monotonicTieredTariff,
  idempotentNormalize,
  idempotentDeduplicateSort,
  gcd,
  base64Encode,
  base64Decode,
  saturatingAdd
} from '../../scripts/harness/property-invariant-harness.mjs';

// G-PROOF-006 Imports
import {
  SplitMix64Prng,
  Command,
  createCommand,
  computeStateDivergenceDiff,
  ReachabilityGraph,
  StatefulSequenceGenerator,
  ShadowOracleValidator,
  ActionTraceShrinker,
  StateDivergenceError
} from '../../scripts/lib/shadow-oracle-validator.mjs';

import {
  DaveDecisionRuntimeSut,
  createDaveFsmModel,
  SagaOutboxRuntimeSut,
  createSagaOutboxModel,
  DistributedLeaseRuntimeSut,
  createDistributedLeaseModel
} from '../../scripts/harness/stateful-model-harness.mjs';

describe('Adversarial Empirical Stress Suite: Wave 3 (G-PROOF-005 & G-PROOF-006)', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. G-PROOF-005: INVARIANT RUNNER & PRNG SEED ADVERSARIAL STRESS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('1. SplitMix64 PRNG Determinism & Extreme Seed Replay', () => {

    it('1.1 should guarantee 100% deterministic sequence replay for zero seeds (0, 0n, "0")', () => {
      const zeroSeeds = [0, 0n, '0'];
      for (const seed of zeroSeeds) {
        const prngA = new SplitMix64(seed);
        const prngB = new SplitMix64(seed);

        const seqA = Array.from({ length: 500 }, () => prngA.nextBigInt().toString());
        const seqB = Array.from({ length: 500 }, () => prngB.nextBigInt().toString());

        assert.deepEqual(seqA, seqB, `Replay divergence detected for zero seed: ${String(seed)}`);
      }
    });

    it('1.2 should guarantee deterministic sequence replay for negative and hex seeds', () => {
      const negativeSeeds = [
        -1,
        -999,
        -123456789n,
        '-12345',
        '-0x10',
        '0xdeadbeefcafe',
        '0XCAFEBABE1234',
        Number.MIN_SAFE_INTEGER
      ];

      for (const seed of negativeSeeds) {
        const prngA = new SplitMix64(seed);
        const prngB = new SplitMix64(seed);

        const seqA = Array.from({ length: 500 }, () => prngA.nextBigInt().toString());
        const seqB = Array.from({ length: 500 }, () => prngB.nextBigInt().toString());

        assert.deepEqual(seqA, seqB, `Replay divergence detected for negative/hex seed: ${String(seed)}`);
      }
    });

    it('1.3 should guarantee deterministic sequence replay for Unicode and symbol seeds', () => {
      const stringSeeds = [
        '',
        '   ',
        '🚀⭐ไทย日本語',
        '!@#$%^&*()_+-=[]{}|;:,.<>?',
        'a'.repeat(1000)
      ];

      for (const seed of stringSeeds) {
        const prngA = new SplitMix64(seed);
        const prngB = new SplitMix64(seed);

        const seqA = Array.from({ length: 500 }, () => prngA.nextFloat());
        const seqB = Array.from({ length: 500 }, () => prngB.nextFloat());

        assert.deepEqual(seqA, seqB, `Replay divergence detected for string seed: "${seed.slice(0, 20)}"`);
      }
    });

    it('1.4 SplitMix64Prng should guarantee seed replay across diverse seeds', () => {
      const diverseSeeds = [
        0,
        0n,
        '0',
        -42,
        -987654321n,
        'deterministic-seed-alpha',
        '🚀_shadow_oracle_seed',
        Number.MAX_SAFE_INTEGER
      ];

      for (const seed of diverseSeeds) {
        const prng1 = new SplitMix64Prng(seed);
        const prng2 = new SplitMix64Prng(seed);

        const seq1 = Array.from({ length: 200 }, () => prng1.nextBigInt().toString());
        const seq2 = Array.from({ length: 200 }, () => prng2.nextBigInt().toString());

        assert.deepEqual(seq1, seq2, `SplitMix64Prng divergence for seed: ${String(seed)}`);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. G-PROOF-005: GENERATOR BOUNDS STRESS UNDER ADVERSARIAL RANGES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('2. Generator Bounds Resilience Under Extremal Ranges', () => {

    it('2.1 integer generator should strictly respect bounds across 25,000 adversarial samples', () => {
      const prng = new SplitMix64('int_adversarial_seed');
      const testCases = [
        { min: -1000, max: -500 },
        { min: 500, max: -500 }, // Inverted bounds
        { min: 0, max: 0 },       // Single zero point
        { min: 42, max: 42 },     // Single non-zero point
        { min: -1, max: 1 },
        { min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER }
      ];

      for (const { min, max } of testCases) {
        const gen = Generators.integer(min, max);
        const low = Math.min(min, max);
        const high = Math.max(min, max);

        for (let i = 0; i < 5000; i++) {
          const val = gen.generate(prng);
          assert.ok(Number.isInteger(val), `Value ${val} must be integer`);
          assert.ok(val >= low && val <= high, `Value ${val} out of bounds [${low}, ${high}]`);
        }
      }
    });

    it('2.2 float generator should strictly respect bounds across 20,000 adversarial samples', () => {
      const prng = new SplitMix64('float_adversarial_seed');
      const testCases = [
        { min: 0.0, max: 1.0 },
        { min: -100.5, max: 100.5 },
        { min: 3.14159, max: 3.14159 }, // Point bound
        { min: 50.0, max: -50.0 }        // Inverted bounds
      ];

      for (const { min, max } of testCases) {
        const gen = Generators.float(min, max);
        const low = Math.min(min, max);
        const high = Math.max(min, max);

        for (let i = 0; i < 5000; i++) {
          const val = gen.generate(prng);
          assert.ok(typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val));
          assert.ok(val >= low && val <= high, `Float ${val} out of bounds [${low}, ${high}]`);
        }
      }
    });

    it('2.3 string generator should respect code-point lengths and astral Unicode symbols', () => {
      const prng = new SplitMix64('string_adversarial_seed');
      const testCases = [
        { minLength: 0, maxLength: 0 },
        { minLength: 12, maxLength: 12 },
        { minLength: 5, maxLength: 25, charset: 'unicode' },
        { minLength: 1, maxLength: 10, charset: 'numeric' },
        { minLength: 0, maxLength: 50, charset: 'hex' }
      ];

      for (const opts of testCases) {
        const gen = Generators.string(opts);
        for (let i = 0; i < 2000; i++) {
          const val = gen.generate(prng);
          const cpLength = Array.from(val).length;
          assert.ok(
            cpLength >= opts.minLength && cpLength <= opts.maxLength,
            `String length ${cpLength} out of bounds [${opts.minLength}, ${opts.maxLength}]`
          );

          // Verify no dangling surrogate pairs
          assert.doesNotThrow(() => {
            Buffer.from(val, 'utf8').toString('utf8');
          });
        }
      }
    });

    it('2.4 array generator should respect bounds and handle nested arrays', () => {
      const prng = new SplitMix64('array_adversarial_seed');
      const innerGen = Generators.integer(-10, 10);
      const outerGen = Generators.array(Generators.array(innerGen, { minLength: 1, maxLength: 4 }), {
        minLength: 0,
        maxLength: 6
      });

      for (let i = 0; i < 2000; i++) {
        const matrix = outerGen.generate(prng);
        assert.ok(Array.isArray(matrix));
        assert.ok(matrix.length >= 0 && matrix.length <= 6);
        for (const row of matrix) {
          assert.ok(Array.isArray(row));
          assert.ok(row.length >= 1 && row.length <= 4);
          for (const item of row) {
            assert.ok(item >= -10 && item <= 10);
          }
        }
      }
    });

    it('2.5 bigint generator should strictly respect bounds across 10,000 samples', () => {
      const prng = new SplitMix64('bigint_adversarial_seed');
      const testCases = [
        { min: -1000000000000000000000n, max: 1000000000000000000000n },
        { min: 500n, max: -500n }, // Inverted
        { min: 0n, max: 0n },
        { min: 999999999999n, max: 999999999999n }
      ];

      for (const { min, max } of testCases) {
        const gen = Generators.bigint(min, max);
        const low = min < max ? min : max;
        const high = min < max ? max : min;

        for (let i = 0; i < 2500; i++) {
          const val = gen.generate(prng);
          assert.equal(typeof val, 'bigint');
          assert.ok(val >= low && val <= high, `BigInt ${val} out of bounds [${low}, ${high}]`);
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. G-PROOF-005: COUNTEREXAMPLE SHRINKING ADVERSARIAL PREDICATES
  // ═══════════════════════════════════════════════════════════════════════════

  describe('3. Counterexample Shrinking Termination & Edge Predicates', () => {

    it('3.1 should terminate cleanly without hanging under composite modular predicates', () => {
      const intGen = Generators.integer(0, 1000);
      // Predicate fails when x > 500 and x % 17 === 5
      const compositePred = (x) => !(x > 500 && x % 17 === 5);
      // Initial failing counterexample: 515 (515 > 500 and 515 % 17 === 5)
      const outcome = shrinkCounterexample({
        generator: intGen,
        predicate: compositePred,
        failingInput: 515,
        maxSteps: 500,
        timeoutMs: 3000
      });

      assert.equal(outcome.timedOut, false);
      assert.ok(outcome.steps > 0 && outcome.steps <= 500);
      // Minimal counterexample must still satisfy the failing condition
      assert.equal(compositePred(outcome.minimalInput), false);
    });

    it('3.2 should respect maxSteps ceiling on flat plateau predicates', () => {
      const intGen = Generators.integer(0, 100000);
      // Flat plateau failing region spanning [10000, 50000]
      const plateauPred = (x) => !(x >= 10000 && x <= 50000);
      const outcome = shrinkCounterexample({
        generator: intGen,
        predicate: plateauPred,
        failingInput: 45000,
        maxSteps: 25, // Restrict max steps
        timeoutMs: 3000
      });

      assert.ok(outcome.steps <= 25, `Steps ${outcome.steps} exceeded maxSteps ceiling 25`);
      assert.equal(plateauPred(outcome.minimalInput), false);
    });

    it('3.3 should respect timeoutMs ceiling under slow predicate execution', () => {
      const intGen = Generators.integer(0, 100);
      const slowPred = (x) => {
        const start = Date.now();
        while (Date.now() - start < 3) {} // 3ms artificial delay
        return !(x > 10);
      };

      const outcome = shrinkCounterexample({
        generator: intGen,
        predicate: slowPred,
        failingInput: 80,
        maxSteps: 1000,
        timeoutMs: 50 // Short 50ms timeout
      });

      assert.ok(outcome.steps < 30, 'Timeout must break shrinker loop early');
      assert.equal(slowPred(outcome.minimalInput), false);
    });

    it('3.4 should shrink through uncaught exception-throwing predicates to minimal threshold', () => {
      const intGen = Generators.integer(0, 100);
      const exceptionPred = (x) => {
        if (x > 30) throw new RangeError(`Value ${x} exceeds maximum allowed threshold 30`);
        return true;
      };

      const outcome = shrinkCounterexample({
        generator: intGen,
        predicate: exceptionPred,
        failingInput: 90,
        maxSteps: 500
      });

      assert.equal(outcome.timedOut, false);
      // The exact minimal integer triggering x > 30 is 31
      assert.equal(outcome.minimalInput, 31, 'Shrinker must find exact minimal integer boundary (31)');
    });

    it('3.5 should handle needle-in-a-haystack isolated counterexample gracefully', () => {
      const intGen = Generators.integer(0, 100);
      // Fails on exact single isolated value 47
      const needlePred = (x) => x !== 47;

      const outcome = shrinkCounterexample({
        generator: intGen,
        predicate: needlePred,
        failingInput: 47,
        maxSteps: 500
      });

      assert.equal(outcome.timedOut, false);
      assert.equal(outcome.minimalInput, 47, 'Needle counterexample must remain 47 when no sub-candidate fails');
    });

    it('3.6 checkProperty should execute 20,000 iterations across composite invariant without drift', () => {
      const outcome = checkProperty(
        Generators.tuple(Generators.integer(1, 100000), Generators.integer(1, 10)),
        (total, parts) => {
          const splits = splitAmountConserved(total, parts);
          return checkConservation(splits, total);
        },
        {
          cases: 20000,
          seed: 'stress_20k_conservation_seed'
        }
      );

      assert.equal(outcome.passed, true);
      assert.equal(outcome.casesTested, 20000);
      assert.equal(outcome.counterexample, null);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. G-PROOF-006: FAULTY SUT MODELS WITH SUBTLE STATE DIVERGENCE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('4. Dual Lockstep Detection of Subtle SUT State Divergences', () => {

    it('4.1 should detect subtle off-by-one risk evaluation mutant in DAVE FSM', () => {
      const daveSpec = createDaveFsmModel();

      class OffByOneRiskDaveSut extends DaveDecisionRuntimeSut {
        evaluateRisk(riskScore) {
          super.evaluateRisk(riskScore);
          this.riskScore = riskScore + 1; // Subtle +1 mutant
          return this.getState();
        }
      }

      const validator = new ShadowOracleValidator({
        sutFactory: () => new OffByOneRiskDaveSut(),
        shadowFactory: daveSpec.shadowFactory,
        commands: daveSpec.commands
      });

      const sequence = [
        daveSpec.commands.find((c) => c.name === 'propose'),
        daveSpec.commands.find((c) => c.name === 'verifyEvidence'),
        daveSpec.commands.find((c) => c.name === 'evaluateRisk')
      ];

      const outcome = validator.executeSequence(sequence);
      assert.equal(outcome.status, 'DIVERGENCE');
      assert.equal(outcome.errorType, 'EQUIVALENCE_DIVERGENCE');
      assert.equal(outcome.failingStepIndex, 2);
      assert.equal(outcome.failingCommand, 'evaluateRisk');
      assert.equal(outcome.diff.divergencePath, '$.riskScore');
      assert.equal(outcome.diff.actual, 26);
      assert.equal(outcome.diff.expected, 25);
    });

    it('4.2 should detect dropped outbox event update mutant in Saga Outbox', () => {
      const sagaSpec = createSagaOutboxModel();

      class DroppedEventSagaSut extends SagaOutboxRuntimeSut {
        executeStep2() {
          if (!this.step1Done || this.step2Done || this.status !== 'PENDING') throw new Error('Cannot execute step 2');
          this.step2Done = true;
          // Silent omission: this.outboxEvents.push(...) is dropped!
          return this.getState();
        }
      }

      const validator = new ShadowOracleValidator({
        sutFactory: () => new DroppedEventSagaSut(),
        shadowFactory: sagaSpec.shadowFactory,
        commands: sagaSpec.commands
      });

      const sequence = [
        sagaSpec.commands.find((c) => c.name === 'beginSaga'),
        sagaSpec.commands.find((c) => c.name === 'executeStep1'),
        sagaSpec.commands.find((c) => c.name === 'executeStep2')
      ];

      const outcome = validator.executeSequence(sequence);
      assert.equal(outcome.status, 'DIVERGENCE');
      assert.equal(outcome.failingCommand, 'executeStep2');
      assert.equal(outcome.diff.divergencePath, '$.outboxEventsCount');
      assert.equal(outcome.diff.actual, 1);
      assert.equal(outcome.diff.expected, 2);
    });

    it('4.3 should detect intermittent renewal corruption in Distributed Lease SUT', () => {
      const leaseSpec = createDistributedLeaseModel();

      class IntermittentLeaseSut extends DistributedLeaseRuntimeSut {
        constructor() {
          super();
          this.calls = 0;
        }
        renew(clientId) {
          super.renew(clientId);
          this.calls += 1;
          if (this.calls >= 3) {
            this.renewals = -999; // Intermittent bug on 3rd renew invocation
          }
          return this.getState();
        }
      }

      const validator = new ShadowOracleValidator({
        sutFactory: () => new IntermittentLeaseSut(),
        shadowFactory: leaseSpec.shadowFactory,
        commands: leaseSpec.commands
      });

      const sequence = [
        leaseSpec.commands.find((c) => c.name === 'acquire'),
        leaseSpec.commands.find((c) => c.name === 'renew'),
        leaseSpec.commands.find((c) => c.name === 'renew'),
        leaseSpec.commands.find((c) => c.name === 'renew')
      ];

      const outcome = validator.executeSequence(sequence);
      assert.equal(outcome.status, 'DIVERGENCE');
      assert.equal(outcome.failingStepIndex, 3);
      assert.equal(outcome.diff.divergencePath, '$.renewals');
      assert.equal(outcome.diff.actual, -999);
      assert.equal(outcome.diff.expected, 3);
    });

    it('4.4 should detect unexpected extra properties injected into SUT state', () => {
      const daveSpec = createDaveFsmModel();

      class PollutedStateDaveSut extends DaveDecisionRuntimeSut {
        getState() {
          const base = super.getState();
          base.unauthorizedTelemetryProbe = 'active';
          return base;
        }
      }

      const validator = new ShadowOracleValidator({
        sutFactory: () => new PollutedStateDaveSut(),
        shadowFactory: daveSpec.shadowFactory,
        commands: daveSpec.commands
      });

      const sequence = [daveSpec.commands.find((c) => c.name === 'propose')];
      const outcome = validator.executeSequence(sequence);

      assert.equal(outcome.status, 'DIVERGENCE');
      assert.equal(outcome.diff.divergencePath, '$.unauthorizedTelemetryProbe');
      assert.match(outcome.diff.message, /Unexpected key "unauthorizedTelemetryProbe"/);
    });

    it('4.5 should detect missing expected properties in SUT state', () => {
      const daveSpec = createDaveFsmModel();

      class MissingFieldDaveSut extends DaveDecisionRuntimeSut {
        getState() {
          const base = super.getState();
          delete base.evidenceVerified;
          return base;
        }
      }

      const validator = new ShadowOracleValidator({
        sutFactory: () => new MissingFieldDaveSut(),
        shadowFactory: daveSpec.shadowFactory,
        commands: daveSpec.commands
      });

      const sequence = [daveSpec.commands.find((c) => c.name === 'propose')];
      const outcome = validator.executeSequence(sequence);

      assert.equal(outcome.status, 'DIVERGENCE');
      assert.equal(outcome.diff.divergencePath, '$.evidenceVerified');
      assert.match(outcome.diff.message, /Expected key "evidenceVerified" missing/);
    });

    it('4.6 should catch uncaught SUT runtime exceptions fail-closed', () => {
      const leaseSpec = createDistributedLeaseModel();

      class CrashingLeaseSut extends DistributedLeaseRuntimeSut {
        renew(clientId) {
          throw new TypeError('Simulated fatal pointer dereference in kernel lock driver');
        }
      }

      const validator = new ShadowOracleValidator({
        sutFactory: () => new CrashingLeaseSut(),
        shadowFactory: leaseSpec.shadowFactory,
        commands: leaseSpec.commands
      });

      const sequence = [
        leaseSpec.commands.find((c) => c.name === 'acquire'),
        leaseSpec.commands.find((c) => c.name === 'renew')
      ];

      const outcome = validator.executeSequence(sequence);
      assert.equal(outcome.status, 'DIVERGENCE');
      assert.equal(outcome.errorType, 'SUT_EXCEPTION');
      assert.match(outcome.message, /Simulated fatal pointer dereference/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. G-PROOF-006: ACTION TRACE SHRINKER MINIMAL SUBSEQUENCE PRESERVATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('5. ActionTraceShrinker Delta Minimization & Precondition Invariants', () => {

    it('5.1 should eliminate prefix, intermediate, and suffix noise down to exact minimal trace', () => {
      const leaseSpec = createDistributedLeaseModel();

      // Mutant bug: performOperation illegally mutates lastProcessedToken to 0
      class DefectiveOperationLeaseSut extends DistributedLeaseRuntimeSut {
        performOperation(clientId, token) {
          super.performOperation(clientId, token);
          this.lastProcessedToken = -1; // Fault!
          return this.getState();
        }
      }

      const validator = new ShadowOracleValidator({
        sutFactory: () => new DefectiveOperationLeaseSut(),
        shadowFactory: leaseSpec.shadowFactory,
        commands: leaseSpec.commands
      });

      const acquireCmd = leaseSpec.commands.find((c) => c.name === 'acquire');
      const renewCmd = leaseSpec.commands.find((c) => c.name === 'renew');
      const opCmd = leaseSpec.commands.find((c) => c.name === 'performOperation');
      const releaseCmd = leaseSpec.commands.find((c) => c.name === 'release');

      // 7-step sequence with multiple redundant renews and suffix commands
      const sequence = [
        acquireCmd,
        renewCmd,
        renewCmd,
        renewCmd,
        opCmd,
        renewCmd,
        releaseCmd
      ];

      const initialExec = validator.executeSequence(sequence);
      assert.equal(initialExec.status, 'DIVERGENCE');
      assert.equal(initialExec.failingCommand, 'performOperation');

      const shrinker = new ActionTraceShrinker({ oracleValidator: validator });
      const shrunk = shrinker.shrink({
        commandSequence: sequence,
        failingStepIndex: initialExec.failingStepIndex
      });

      assert.equal(shrunk.originalLength, 7);
      assert.equal(shrunk.minimizedLength, 2);
      assert.deepEqual(
        shrunk.minimalSequence.map((c) => c.name),
        ['acquire', 'performOperation']
      );

      // Verify minimized sequence is valid under preconditions and reproduces failure
      assert.equal(shrinker.isSequenceValid(shrunk.minimalSequence), true);
      assert.equal(shrinker.reproducesFailure(shrunk.minimalSequence), true);
    });

    it('5.2 should shrink failing step 0 cleanly without out-of-bounds array access', () => {
      const daveSpec = createDaveFsmModel();

      // Mutant bug: propose immediately corrupts state
      class ImmediateFailDaveSut extends DaveDecisionRuntimeSut {
        propose(decisionId, domain, confidenceScore) {
          super.propose(decisionId, domain, confidenceScore);
          this.domain = 'CORRUPTED';
          return this.getState();
        }
      }

      const validator = new ShadowOracleValidator({
        sutFactory: () => new ImmediateFailDaveSut(),
        shadowFactory: daveSpec.shadowFactory,
        commands: daveSpec.commands
      });

      const sequence = [
        daveSpec.commands.find((c) => c.name === 'propose'),
        daveSpec.commands.find((c) => c.name === 'verifyEvidence')
      ];

      const initialExec = validator.executeSequence(sequence);
      assert.equal(initialExec.status, 'DIVERGENCE');
      assert.equal(initialExec.failingStepIndex, 0);

      const shrinker = new ActionTraceShrinker({ oracleValidator: validator });
      const shrunk = shrinker.shrink({
        commandSequence: sequence,
        failingStepIndex: initialExec.failingStepIndex
      });

      assert.equal(shrunk.minimizedLength, 1);
      assert.deepEqual(
        shrunk.minimalSequence.map((c) => c.name),
        ['propose']
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. G-PROOF-006: CYCLIC STATE GRAPHS & REACHABILITY EXPLORATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('6. Cyclic State Graph Exploration & Stack Overflow Immunity', () => {

    it('6.1 should execute 10,000 transitions on cyclic ring state machine without stack overflow', () => {
      class RingSut {
        constructor() {
          this.nodeId = 0;
        }
        getState() {
          return { nodeId: this.nodeId };
        }
        nextHop() {
          this.nodeId = (this.nodeId + 1) % 5;
          return this.getState();
        }
      }

      const nextHopCmd = createCommand({
        name: 'nextHop',
        precondition: () => true,
        run: (sut) => sut.nextHop(),
        applyToShadow: (state) => ({ nodeId: (state.nodeId + 1) % 5 }),
        postcondition: (sut, shadow) => sut.nodeId === shadow.nodeId
      });

      const reachability = new ReachabilityGraph();
      const validator = new ShadowOracleValidator({
        sutFactory: () => new RingSut(),
        shadowFactory: () => ({ nodeId: 0 }),
        commands: [nextHopCmd],
        reachabilityGraph: reachability
      });

      // 10,000 transitions in cycle
      const sequence = Array(10000).fill(nextHopCmd);
      const outcome = validator.executeSequence(sequence);

      assert.equal(outcome.status, 'PASS');
      assert.equal(outcome.totalStepsExecuted, 10000);

      const stats = reachability.getCoverageStats();
      assert.equal(stats.uniqueStates, 5, 'Must discover exactly 5 distinct ring states');
      assert.equal(stats.totalTransitions, 10000);
      assert.equal(stats.uniqueTransitions, 5, 'Must record exactly 5 distinct directed edges');
      assert.equal(stats.terminalStates, 0, 'Cyclic ring must have 0 terminal / dead-end states');
      assert.equal(stats.branchingFactor, 1);
    });

    it('6.2 should handle complex multi-loop transitions with state serialization', () => {
      // 3-state system with bidirectional transitions: A <-> B <-> C
      class MeshSut {
        constructor() {
          this.state = 'A';
        }
        getState() {
          return { state: this.state };
        }
        toA() { this.state = 'A'; return this.getState(); }
        toB() { this.state = 'B'; return this.getState(); }
        toC() { this.state = 'C'; return this.getState(); }
      }

      const commands = [
        createCommand({
          name: 'toA',
          precondition: (s) => s.state === 'B',
          run: (sut) => sut.toA(),
          applyToShadow: () => ({ state: 'A' })
        }),
        createCommand({
          name: 'toB',
          precondition: (s) => s.state === 'A' || s.state === 'C',
          run: (sut) => sut.toB(),
          applyToShadow: () => ({ state: 'B' })
        }),
        createCommand({
          name: 'toC',
          precondition: (s) => s.state === 'B',
          run: (sut) => sut.toC(),
          applyToShadow: () => ({ state: 'C' })
        })
      ];

      const reachability = new ReachabilityGraph();
      const prng = new SplitMix64Prng(555);
      const generator = new StatefulSequenceGenerator({
        commandPool: commands,
        prng
      });

      const sequence = generator.generateSequence({
        initialShadowState: { state: 'A' },
        maxSteps: 5000,
        directed: true,
        reachabilityGraph: reachability
      });

      assert.equal(sequence.length, 5000);

      const validator = new ShadowOracleValidator({
        sutFactory: () => new MeshSut(),
        shadowFactory: () => ({ state: 'A' }),
        commands,
        reachabilityGraph: reachability
      });

      const execResult = validator.executeSequence(sequence);
      assert.equal(execResult.status, 'PASS');

      const stats = reachability.getCoverageStats();
      assert.equal(stats.uniqueStates, 3);
      assert.equal(stats.terminalStates, 0);
      assert.ok(stats.uniqueTransitions >= 4);

      // Verify JSON serialization of reachability graph
      const jsonDump = reachability.toJSON();
      assert.equal(jsonDump.nodesCount, 3);
      assert.equal(typeof jsonDump.stats.branchingFactor, 'number');
    });
  });
});
