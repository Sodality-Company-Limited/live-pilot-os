#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ UNIT TESTS: STATEFUL MODEL HARNESS & SHADOW ORACLE VALIDATOR
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Epic: PROOF (G-PROOF-006)
 * Invariant: Zero mocks, zero stubs, 100% concrete operational logic.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

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
  createDistributedLeaseModel,
  verifyFaultyModelDetection,
  runStatefulModelVerification,
  emitProofReceipt
} from '../../scripts/harness/stateful-model-harness.mjs';

describe('G-PROOF-006: Stateful Model-Based Testing & Shadow Oracle Harness', () => {

  // ── 1. SplitMix64 Deterministic PRNG Tests ──

  describe('1. SplitMix64 PRNG Engine', () => {
    it('generates identical sequence given identical numeric or string seeds', () => {
      const prng1 = new SplitMix64Prng(12345);
      const prng2 = new SplitMix64Prng(12345);
      const prngStr1 = new SplitMix64Prng('deterministic-seed');
      const prngStr2 = new SplitMix64Prng('deterministic-seed');

      for (let i = 0; i < 20; i++) {
        assert.equal(prng1.nextBigInt(), prng2.nextBigInt());
        assert.equal(prngStr1.next(), prngStr2.next());
      }
    });

    it('generates statistically divergent outputs for different seeds', () => {
      const prngA = new SplitMix64Prng(100);
      const prngB = new SplitMix64Prng(200);

      const samplesA = Array.from({ length: 5 }, () => prngA.next());
      const samplesB = Array.from({ length: 5 }, () => prngB.next());

      assert.notDeepEqual(samplesA, samplesB);
    });

    it('nextInt respects closed intervals and handles inverted bounds', () => {
      const prng = new SplitMix64Prng(777);
      for (let i = 0; i < 50; i++) {
        const val = prng.nextInt(10, 20);
        assert.ok(val >= 10 && val <= 20, `Value ${val} must be between 10 and 20`);

        const inverted = prng.nextInt(50, 30);
        assert.ok(inverted >= 30 && inverted <= 50, `Inverted bound ${inverted} must be in [30, 50]`);
      }
    });

    it('pick selects valid elements and throws on empty collections', () => {
      const prng = new SplitMix64Prng(888);
      const items = ['alpha', 'beta', 'gamma'];
      const chosen = prng.pick(items);
      assert.ok(items.includes(chosen));

      assert.throws(() => prng.pick([]), /Cannot pick from empty array/);
    });

    it('shuffle creates a valid permutation of the original array', () => {
      const prng = new SplitMix64Prng(999);
      const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const shuffled = prng.shuffle(original);

      assert.equal(shuffled.length, original.length);
      assert.deepEqual([...shuffled].sort((a, b) => a - b), original);
    });
  });

  // ── 2. Command Interface Specification Tests ──

  describe('2. Command Interface Specification', () => {
    it('constructs Command with valid parameters and rejects malformed specs', () => {
      const cmd = createCommand({
        name: 'test-action',
        run: (sut, state) => ({ ok: true })
      });
      assert.equal(cmd.name, 'test-action');
      assert.equal(cmd.precondition({}), true);
      assert.equal(cmd.postcondition({}, {}, {}), true);

      assert.throws(() => createCommand({ name: '' }), /Command must have a non-empty name string/);
      assert.throws(() => createCommand({ name: 'no-run' }), /must define an executable run/);
    });

    it('executes custom precondition, run, postcondition, and shadow transition', () => {
      const cmd = createCommand({
        name: 'increment',
        precondition: (state) => state.counter < 10,
        run: (sut) => sut.val += 1,
        applyToShadow: (state) => ({ counter: state.counter + 1 }),
        postcondition: (sut, shadow, res) => shadow.counter === sut.val
      });

      const sut = { val: 5 };
      const shadow = { counter: 5 };

      assert.equal(cmd.precondition(shadow), true);
      cmd.run(sut, shadow);
      const nextShadow = cmd.applyToShadow(shadow);
      assert.equal(nextShadow.counter, 6);
      assert.equal(cmd.postcondition(sut, nextShadow, null), true);
    });
  });

  // ── 3. State Divergence Diff Engine Tests ──

  describe('3. Structural State Divergence Diff Engine', () => {
    it('returns matched: true on identical primitives, objects, and arrays', () => {
      assert.deepEqual(computeStateDivergenceDiff(42, 42), { matched: true });
      assert.deepEqual(computeStateDivergenceDiff('soda', 'soda'), { matched: true });
      assert.deepEqual(
        computeStateDivergenceDiff(
          { a: 1, b: [10, 20], c: { d: 'test' } },
          { a: 1, b: [10, 20], c: { d: 'test' } }
        ),
        { matched: true }
      );
    });

    it('identifies type divergence and reports exact path', () => {
      const diff = computeStateDivergenceDiff({ count: '5' }, { count: 5 });
      assert.equal(diff.matched, false);
      assert.equal(diff.divergencePath, '$.count');
      assert.ok(diff.message.includes('Type mismatch'));
    });

    it('identifies missing and unexpected keys in objects', () => {
      const diffMissing = computeStateDivergenceDiff({ a: 1 }, { a: 1, b: 2 });
      assert.equal(diffMissing.matched, false);
      assert.equal(diffMissing.divergencePath, '$.b');

      const diffExtra = computeStateDivergenceDiff({ a: 1, extra: 99 }, { a: 1 });
      assert.equal(diffExtra.matched, false);
      assert.equal(diffExtra.divergencePath, '$.extra');
    });

    it('identifies array length and element mismatches with index paths', () => {
      const diffLen = computeStateDivergenceDiff([1, 2], [1, 2, 3]);
      assert.equal(diffLen.matched, false);
      assert.equal(diffLen.divergencePath, '$.length');

      const diffElem = computeStateDivergenceDiff([1, 'err'], [1, 'ok']);
      assert.equal(diffElem.matched, false);
      assert.equal(diffElem.divergencePath, '$[1]');
    });
  });

  // ── 4. Reachability State Graph Tracing Tests ──

  describe('4. Reachability State Graph Tracing', () => {
    it('records state nodes, unique edges, and computes topology metrics', () => {
      const graph = new ReachabilityGraph();
      const stateA = { status: 'INIT' };
      const stateB = { status: 'RUNNING' };
      const stateC = { status: 'TERMINAL' };

      graph.recordTransition(stateA, 'start', stateB, 0);
      graph.recordTransition(stateB, 'finish', stateC, 1);

      assert.equal(graph.isReachable(stateA), true);
      assert.equal(graph.isReachable(stateB), true);
      assert.equal(graph.isReachable(stateC), true);
      assert.equal(graph.isReachable({ status: 'UNKNOWN' }), false);

      const stats = graph.getCoverageStats();
      assert.equal(stats.uniqueStates, 3);
      assert.equal(stats.totalTransitions, 2);
      assert.equal(stats.terminalStates, 1);
    });

    it('serializes graph cleanly to JSON', () => {
      const graph = new ReachabilityGraph();
      graph.recordTransition({ step: 1 }, 'next', { step: 2 }, 0);
      const json = graph.toJSON();
      assert.equal(typeof json.stats.uniqueStates, 'number');
      assert.equal(json.edgesCount, 1);
    });
  });

  // ── 5. Stateful Command Sequence Generator Tests ──

  describe('5. Stateful Command Sequence Generator', () => {
    it('generates multi-step sequence respecting preconditions at every step', () => {
      const model = createDaveFsmModel();
      const generator = new StatefulSequenceGenerator({
        commandPool: model.commands,
        prng: new SplitMix64Prng(1234)
      });

      const sequence = generator.generateSequence({
        initialShadowState: model.initialShadowState,
        maxSteps: 10
      });

      assert.ok(sequence.length > 0);
      assert.equal(sequence[0].name, 'propose'); // First valid command from INIT must be propose
    });

    it('terminates sequence early when terminal state is reached', () => {
      const model = createDaveFsmModel();
      const generator = new StatefulSequenceGenerator({
        commandPool: model.commands,
        prng: new SplitMix64Prng(4321)
      });

      const sequence = generator.generateSequence({
        initialShadowState: model.initialShadowState,
        maxSteps: 100
      });

      // Max reachable path from INIT to ARCHIVED is 6 steps
      assert.ok(sequence.length <= 10);
    });

    it('directed mode leverages reachability graph to explore states', () => {
      const model = createDistributedLeaseModel();
      const graph = new ReachabilityGraph();
      const generator = new StatefulSequenceGenerator({
        commandPool: model.commands,
        prng: new SplitMix64Prng(555)
      });

      const sequence = generator.generateSequence({
        initialShadowState: model.initialShadowState,
        maxSteps: 20,
        directed: true,
        reachabilityGraph: graph
      });

      assert.equal(sequence.length, 20);
      assert.equal(sequence[0].name, 'acquire');
    });
  });

  // ── 6. Dual Lockstep Shadow Oracle Tests ──

  describe('6. Dual Lockstep Shadow Oracle Validator', () => {
    it('executes compliant DAVE FSM sequence with 100% PASS', () => {
      const model = createDaveFsmModel();
      const validator = new ShadowOracleValidator({
        sutFactory: model.sutFactory,
        shadowFactory: model.shadowFactory,
        commands: model.commands
      });

      const sequence = [
        model.commands.find((c) => c.name === 'propose'),
        model.commands.find((c) => c.name === 'verifyEvidence'),
        model.commands.find((c) => c.name === 'evaluateRisk'),
        model.commands.find((c) => c.name === 'authorize'),
        model.commands.find((c) => c.name === 'commitLedger'),
        model.commands.find((c) => c.name === 'learn'),
        model.commands.find((c) => c.name === 'archive')
      ];

      const res = validator.executeSequence(sequence);
      assert.equal(res.status, 'PASS');
      assert.equal(res.totalStepsExecuted, 7);
      assert.equal(res.finalShadowState.state, 'ARCHIVED');
    });

    it('detects state divergence immediately when SUT state diverges from shadow model', () => {
      const model = createDaveFsmModel();

      class DivergentSut extends DaveDecisionRuntimeSut {
        authorize() {
          super.authorize();
          this.state = 'CORRUPTED'; // Divergence
          return this.getState();
        }
      }

      const validator = new ShadowOracleValidator({
        sutFactory: () => new DivergentSut(),
        shadowFactory: model.shadowFactory,
        commands: model.commands
      });

      const sequence = [
        model.commands.find((c) => c.name === 'propose'),
        model.commands.find((c) => c.name === 'verifyEvidence'),
        model.commands.find((c) => c.name === 'evaluateRisk'),
        model.commands.find((c) => c.name === 'authorize')
      ];

      const res = validator.executeSequence(sequence);
      assert.equal(res.status, 'DIVERGENCE');
      assert.equal(res.failingCommand, 'authorize');
      assert.equal(res.diff.divergencePath, '$.state');
      assert.equal(res.diff.actual, 'CORRUPTED');
      assert.equal(res.diff.expected, 'AUTHORIZED');
    });

    it('catches unhandled SUT runtime exception and reports fail-closed', () => {
      const model = createDaveFsmModel();

      class CrashingSut extends DaveDecisionRuntimeSut {
        evaluateRisk() {
          throw new Error('Fatal SUT panic');
        }
      }

      const validator = new ShadowOracleValidator({
        sutFactory: () => new CrashingSut(),
        shadowFactory: model.shadowFactory,
        commands: model.commands
      });

      const sequence = [
        model.commands.find((c) => c.name === 'propose'),
        model.commands.find((c) => c.name === 'verifyEvidence'),
        model.commands.find((c) => c.name === 'evaluateRisk')
      ];

      const res = validator.executeSequence(sequence);
      assert.equal(res.status, 'DIVERGENCE');
      assert.equal(res.errorType, 'SUT_EXCEPTION');
      assert.ok(res.message.includes('Fatal SUT panic'));
    });

    it('reports failure when command postcondition is violated', () => {
      const model = createDaveFsmModel();
      const faultyCmd = createCommand({
        name: 'faultyPost',
        precondition: (state) => state.state === 'INIT',
        run: (sut) => sut.propose('DEC-001', 'security', 85),
        applyToShadow: (state) => ({ ...state, state: 'PROPOSED' }),
        postcondition: () => ({ valid: false, message: 'Statutory verification contract violated' })
      });

      const validator = new ShadowOracleValidator({
        sutFactory: model.sutFactory,
        shadowFactory: model.shadowFactory,
        commands: [faultyCmd]
      });

      const res = validator.executeSequence([faultyCmd]);
      assert.equal(res.status, 'DIVERGENCE');
      assert.equal(res.errorType, 'POSTCONDITION_FAILED');
      assert.ok(res.message.includes('Statutory verification contract violated'));
    });

    it('fails closed when system invariant checker fails', () => {
      const model = createDaveFsmModel();
      const validator = new ShadowOracleValidator({
        sutFactory: model.sutFactory,
        shadowFactory: model.shadowFactory,
        commands: model.commands,
        invariantChecker: (sut, shadow, cmd) => {
          if (cmd === 'verifyEvidence') {
            return { satisfied: false, violation: 'Evidence verification blocked by compliance rule' };
          }
          return { satisfied: true };
        }
      });

      const sequence = [
        model.commands.find((c) => c.name === 'propose'),
        model.commands.find((c) => c.name === 'verifyEvidence')
      ];

      const res = validator.executeSequence(sequence);
      assert.equal(res.status, 'DIVERGENCE');
      assert.equal(res.errorType, 'INVARIANT_VIOLATION');
      assert.ok(res.message.includes('Evidence verification blocked by compliance rule'));
    });
  });

  // ── 7. Action-Trace Shrinker Tests ──

  describe('7. Action-Trace Shrinker & Delta Minimization', () => {
    it('truncates irrelevant suffix commands following divergence point', () => {
      const model = createDaveFsmModel();
      class FaultySut extends DaveDecisionRuntimeSut {
        verifyEvidence() {
          super.verifyEvidence(true);
          this.evidenceVerified = false; // Mutant divergence
          return this.getState();
        }
      }

      const validator = new ShadowOracleValidator({
        sutFactory: () => new FaultySut(),
        shadowFactory: model.shadowFactory,
        commands: model.commands
      });

      const fullSequence = [
        model.commands.find((c) => c.name === 'propose'),
        model.commands.find((c) => c.name === 'verifyEvidence'),
        model.commands.find((c) => c.name === 'evaluateRisk'),
        model.commands.find((c) => c.name === 'authorize')
      ];

      const shrinker = new ActionTraceShrinker({ oracleValidator: validator });
      const shrunk = shrinker.shrink({ commandSequence: fullSequence, failingStepIndex: 1 });

      assert.equal(shrunk.minimizedLength, 2);
      assert.deepEqual(shrunk.minimalSequence.map((c) => c.name), ['propose', 'verifyEvidence']);
    });

    it('verifies that ActionTraceShrinker preserves state preconditions during shrinking', () => {
      const model = createDaveFsmModel();
      const validator = new ShadowOracleValidator({
        sutFactory: model.sutFactory,
        shadowFactory: model.shadowFactory,
        commands: model.commands
      });
      const shrinker = new ActionTraceShrinker({ oracleValidator: validator });

      // An invalid sequence violating preconditions must be rejected by shrinker
      const invalidSeq = [
        model.commands.find((c) => c.name === 'authorize'), // Cannot authorize from INIT!
        model.commands.find((c) => c.name === 'propose')
      ];

      assert.equal(shrinker.isSequenceValid(invalidSeq), false);
    });

    it('verifyFaultyModelDetection executes successfully with minimized output trace', () => {
      const res = verifyFaultyModelDetection();
      assert.equal(res.caught, true);
      assert.equal(res.failingCommand, 'evaluateRisk');
      assert.ok(res.minimizedLength <= res.originalLength);
      assert.ok(res.shrunkSequence.includes('evaluateRisk'));
    });
  });

  // ── 8. Canonical Models Domain Logic Tests ──

  describe('8. Canonical Models Domain Logic & Rejection Invariants', () => {
    it('DaveDecisionRuntimeSut rejects illegal out-of-order execution', () => {
      const sut = new DaveDecisionRuntimeSut();
      assert.throws(() => sut.authorize(), /Cannot authorize in state INIT/);
      assert.throws(() => sut.commitLedger('0x123'), /Cannot commit ledger in state INIT/);
    });

    it('DaveDecisionRuntimeSut enforces autonomous authorization confidence and risk barriers', () => {
      const sut = new DaveDecisionRuntimeSut();
      sut.propose('DEC-2', 'billing', 60); // Confidence < 70
      sut.verifyEvidence(true);
      sut.evaluateRisk(60); // Risk > 50

      assert.throws(() => sut.authorize(), /Risk or confidence bounds prohibit autonomous authorization/);
    });

    it('SagaOutboxRuntimeSut executes multi-step workflow and LIFO compensation rollback', () => {
      const saga = new SagaOutboxRuntimeSut();
      saga.beginSaga('SAGA-100');
      saga.executeStep1();
      saga.executeStep2();

      // Trigger compensation
      saga.compensateStep2();
      assert.equal(saga.getState().status, 'COMPENSATING');
      assert.equal(saga.getState().step2Done, false);

      saga.compensateStep1();
      assert.equal(saga.getState().status, 'ROLLED_BACK');
      assert.equal(saga.getState().step1Done, false);
      assert.equal(saga.getState().compensationsCount, 2);
    });

    it('SagaOutboxRuntimeSut rejects compensation out of order', () => {
      const saga = new SagaOutboxRuntimeSut();
      saga.beginSaga('SAGA-200');
      saga.executeStep1();
      saga.executeStep2();

      // Illegal: attempting to compensate step 1 before step 2
      assert.throws(() => saga.compensateStep1(), /Cannot compensate step 1 before step 2/);
    });

    it('DistributedLeaseRuntimeSut increments monotonic fencing tokens and rejects stale tokens', () => {
      const lease = new DistributedLeaseRuntimeSut();
      lease.acquire('worker-1');
      assert.equal(lease.getState().fencingToken, 1);

      lease.performOperation('worker-1', 1);
      assert.equal(lease.getState().lastProcessedToken, 1);

      // Re-running with stale token 1 must be rejected fail-closed
      assert.throws(() => lease.performOperation('worker-1', 1), /Stale fencing token 1 rejected/);
    });
  });

  // ── 9. Master Verification Runner & Proof Receipt Tests ──

  describe('9. Master Verification Runner & Proof Receipts', () => {
    it('runStatefulModelVerification executes all 3 models cleanly across multi-step sequences', () => {
      const outcome = runStatefulModelVerification({ steps: 50, seed: 12345 });
      assert.equal(outcome.success, true);
      assert.equal(outcome.modelsEvaluated, 3);
      assert.ok(outcome.totalStepsEvaluated >= 50);
      assert.ok(outcome.totalStatesDiscovered >= 20);
      assert.equal(outcome.mutantDetection.caught, true);
    });

    it('emitProofReceipt generates conforming cryptographic proof receipts on disk', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stateful-receipt-'));
      try {
        const { receipt, evidenceFile, artifactFile } = emitProofReceipt({ cwd: tmpDir });

        assert.equal(receipt.schema_version, 1);
        assert.equal(receipt.goal_id, 'G-PROOF-006');
        assert.equal(receipt.classification, 'executable_invariant');
        assert.equal(receipt.certification, 'PASS');
        assert.ok(Array.isArray(receipt.invariants) && receipt.invariants.length >= 2);
        assert.ok(Array.isArray(receipt.source_files) && receipt.source_files.length === 2);

        assert.ok(fs.existsSync(evidenceFile));
        assert.ok(fs.existsSync(artifactFile));

        const evidenceContent = JSON.parse(fs.readFileSync(evidenceFile, 'utf8'));
        assert.equal(evidenceContent.goal_id, 'G-PROOF-006');
        assert.equal(evidenceContent.certification, 'PASS');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('StateDivergenceError creates structured diagnostic report', () => {
      const err = new StateDivergenceError({
        step: 3,
        command: 'commit',
        message: 'Mismatch on hash',
        diff: { divergencePath: '$.hash', expected: '0x1', actual: '0x2' }
      });
      const report = err.toStructuredReport();
      assert.ok(report.includes('SHADOW ORACLE DIVERGENCE DETECTED'));
      assert.ok(report.includes('Failing Step Index: 3'));
      assert.ok(report.includes('$.hash'));
    });
  });

});
