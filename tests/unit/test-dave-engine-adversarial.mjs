import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  DAVE_CANONICAL_STATES,
  DAVE_FSM_TRANSITIONS,
  DaveStateMachine,
  evaluateRoutingTruthTable,
  validateDaveDecision,
  formatReviewPacket,
  recordDecision
} from '../../scripts/lib/dave-engine.mjs';

describe('DAVE Core Engine Adversarial & FSM Stress Test Suite', () => {
  const tmpDir = path.join(process.cwd(), 'artifacts/test-dave-adversarial');

  // ===========================================================================
  // SUITE 1: Canonical 11-Stage FSM State Transitions & Lifecycle Invariants
  // ===========================================================================
  describe('1. 11-Stage FSM Linear Progression & Lifecycle', () => {
    it('1.1 should correctly identify all 11 canonical states in exact order', () => {
      assert.equal(DAVE_CANONICAL_STATES.length, 11);
      const expectedStates = [
        'INTENT_RECEIVED',
        'CONTEXT_COLLECTED',
        'REFERENCES_VERIFIED',
        'EXPERTS_SELECTED',
        'DECISIONS_GENERATED',
        'CONFLICTS_RESOLVED',
        'CONFIDENCE_CALIBRATED',
        'ROUTED',
        'EXECUTED',
        'VERIFIED',
        'LEARNED'
      ];
      assert.deepEqual([...DAVE_CANONICAL_STATES], expectedStates);
    });

    it('1.2 should transition through all 11 stages sequentially with payloads', () => {
      const fsm = new DaveStateMachine('INTENT_RECEIVED');
      assert.equal(fsm.getState(), 'INTENT_RECEIVED');
      assert.equal(fsm.isTerminal(), false);

      const sequence = [
        { trigger: 'context_assembled', next: 'CONTEXT_COLLECTED', payload: { contextSize: 1024 } },
        { trigger: 'reference_hashes_validated', next: 'REFERENCES_VERIFIED', payload: { validRefs: 3 } },
        { trigger: 'moe_router_dispatched', next: 'EXPERTS_SELECTED', payload: { domain: 'ux_ui' } },
        { trigger: 'domain_proposals_received', next: 'DECISIONS_GENERATED', payload: { proposals: 2 } },
        { trigger: 'synthesis_evaluated', next: 'CONFLICTS_RESOLVED', payload: { conflicts: 0 } },
        { trigger: 'confidence_scored', next: 'CONFIDENCE_CALIBRATED', payload: { score: 0.94 } },
        { trigger: 'policy_applied', next: 'ROUTED', payload: { route: 'proceed' } },
        { trigger: 'execution_authorized', next: 'EXECUTED', payload: { authTicket: 'TKT-001' } },
        { trigger: 'harnesses_passed', next: 'VERIFIED', payload: { testCount: 42 } },
        { trigger: 'rlcd_trajectory_recorded', next: 'LEARNED', payload: { trajectoryId: 'traj-001' } }
      ];

      for (let i = 0; i < sequence.length; i++) {
        const step = sequence[i];
        assert.equal(fsm.canTransition(step.trigger), true, `Must be able to trigger ${step.trigger} at step ${i}`);
        const returnedState = fsm.transition(step.trigger, step.payload);
        assert.equal(returnedState, step.next);
        assert.equal(fsm.getState(), step.next);

        if (step.next === 'LEARNED') {
          assert.equal(fsm.isTerminal(), true, 'LEARNED must be terminal');
        } else {
          assert.equal(fsm.isTerminal(), false, `${step.next} must not be terminal`);
        }
      }

      const history = fsm.getHistory();
      assert.equal(history.length, 11, 'History must contain initial state + 10 transitions');
      assert.equal(history[0].state, 'INTENT_RECEIVED');
      assert.equal(history[10].state, 'LEARNED');
      assert.deepEqual(history[10].payload, { trajectoryId: 'traj-001' });

      for (const entry of history) {
        assert.ok(entry.timestamp);
        assert.ok(!isNaN(Date.parse(entry.timestamp)));
      }
    });

    it('1.3 should lock terminal state LEARNED fail-closed against any outgoing transitions', () => {
      const fsm = new DaveStateMachine('LEARNED');
      assert.equal(fsm.getState(), 'LEARNED');
      assert.equal(fsm.isTerminal(), true);

      const allTriggers = [
        'context_assembled',
        'reference_hashes_validated',
        'moe_router_dispatched',
        'domain_proposals_received',
        'synthesis_evaluated',
        'confidence_scored',
        'policy_applied',
        'execution_authorized',
        'harnesses_passed',
        'rlcd_trajectory_recorded',
        'reset',
        'restart'
      ];

      for (const trigger of allTriggers) {
        assert.equal(fsm.canTransition(trigger), false, `LEARNED must not allow trigger '${trigger}'`);
        assert.throws(
          () => fsm.transition(trigger),
          /Illegal state transition: cannot trigger '.*' from state 'LEARNED'/,
          `Triggering '${trigger}' from LEARNED must throw fail-closed`
        );
        assert.equal(fsm.getState(), 'LEARNED');
      }
    });
  });

  // ===========================================================================
  // SUITE 2: Exhaustive Invalid State Transitions Stress Testing (Fail-Closed)
  // ===========================================================================
  describe('2. Stress Testing Invalid State Transitions (Fail-Closed Matrix)', () => {
    const canonicalTriggers = [
      'context_assembled',
      'reference_hashes_validated',
      'moe_router_dispatched',
      'domain_proposals_received',
      'synthesis_evaluated',
      'confidence_scored',
      'policy_applied',
      'execution_authorized',
      'harnesses_passed',
      'rlcd_trajectory_recorded'
    ];

    it('2.1 should reject all 100 invalid state-trigger permutations across all 11 states', () => {
      let rejectedTransitions = 0;
      let validTransitions = 0;

      for (const state of DAVE_CANONICAL_STATES) {
        const fsm = new DaveStateMachine(state);
        const validTriggerMap = DAVE_FSM_TRANSITIONS[state] || {};

        for (const trigger of canonicalTriggers) {
          const isValid = Boolean(validTriggerMap[trigger]);

          if (isValid) {
            validTransitions++;
            assert.equal(fsm.canTransition(trigger), true);
          } else {
            rejectedTransitions++;
            assert.equal(fsm.canTransition(trigger), false, `State ${state} should not allow trigger ${trigger}`);

            const historyLenBefore = fsm.getHistory().length;
            assert.throws(
              () => fsm.transition(trigger),
              /Illegal state transition/,
              `Transition ${trigger} from ${state} must throw`
            );

            assert.equal(fsm.getState(), state, `State must remain ${state} after failed transition`);
            assert.equal(fsm.getHistory().length, historyLenBefore, 'History must not mutate on failure');
          }
        }
      }

      assert.equal(validTransitions, 10, 'Must have exactly 10 valid canonical transitions');
      assert.equal(rejectedTransitions, 100, 'Must have exactly 100 rejected canonical combinations');
    });

    it('2.2 should strictly reject skip-to-execution attacks from every pre-execution stage', () => {
      const preExecutionStates = [
        'INTENT_RECEIVED',
        'CONTEXT_COLLECTED',
        'REFERENCES_VERIFIED',
        'EXPERTS_SELECTED',
        'DECISIONS_GENERATED',
        'CONFLICTS_RESOLVED',
        'CONFIDENCE_CALIBRATED'
      ];

      for (const preState of preExecutionStates) {
        const fsm = new DaveStateMachine(preState);
        assert.equal(
          fsm.canTransition('execution_authorized'),
          false,
          `State ${preState} must strictly reject direct execution authorization`
        );
        assert.throws(
          () => fsm.transition('execution_authorized'),
          /Illegal state transition/,
          `Attempting execution_authorized from ${preState} must throw fail-closed`
        );
        assert.equal(fsm.getState(), preState);
      }
    });

    it('2.3 should strictly reject backward transitions and loops', () => {
      const fsm = new DaveStateMachine('ROUTED');

      const backwardTriggers = [
        'context_assembled',
        'reference_hashes_validated',
        'moe_router_dispatched',
        'domain_proposals_received',
        'synthesis_evaluated',
        'confidence_scored'
      ];

      for (const bt of backwardTriggers) {
        assert.equal(fsm.canTransition(bt), false);
        assert.throws(() => fsm.transition(bt), /Illegal state transition/);
        assert.equal(fsm.getState(), 'ROUTED');
      }

      assert.throws(() => fsm.transition('policy_applied'), /Illegal state transition/);
    });

    it('2.4 should empirically confirm prototype property leakage vulnerability in canTransition', () => {
      // VULNERABILITY AUDIT:
      // DaveStateMachine.canTransition() and transition() look up `available[trigger]`.
      // Because `available` inherits from Object.prototype, built-in properties resolve truthy!
      const fsm = new DaveStateMachine('INTENT_RECEIVED');
      const prototypeKeys = ['toString', 'valueOf', 'constructor', '__proto__', 'isPrototypeOf'];

      for (const key of prototypeKeys) {
        // Empirically observes that prototype keys return true instead of false!
        const canDo = fsm.canTransition(key);
        assert.equal(canDo, true, `Observed vulnerability: ${key} resolves via prototype inheritance`);
      }

      // Transitioning via __proto__ corrupts fsm.state into Object.prototype
      const hijackedState = fsm.transition('__proto__');
      assert.equal(typeof hijackedState, 'object', 'Observed state corruption: state is Object.prototype');
      assert.equal(fsm.getState(), Object.prototype);
    });

    it('2.5 should empirically confirm shallow freeze vulnerability on DAVE_FSM_TRANSITIONS', () => {
      // VULNERABILITY AUDIT:
      // Object.freeze(DAVE_FSM_TRANSITIONS) is shallow; nested transition objects remain mutable!
      assert.equal(Object.isFrozen(DAVE_FSM_TRANSITIONS), true, 'Top level is frozen');
      assert.equal(
        Object.isFrozen(DAVE_FSM_TRANSITIONS.INTENT_RECEIVED),
        false,
        'Observed vulnerability: nested transition map is NOT frozen'
      );

      // Demonstrates injection exploit
      const testTrigger = `injected_${Date.now()}`;
      DAVE_FSM_TRANSITIONS.INTENT_RECEIVED[testTrigger] = 'EXECUTED';
      const fsm = new DaveStateMachine('INTENT_RECEIVED');
      assert.equal(fsm.canTransition(testTrigger), true, 'Injected transition accepted by FSM');
      fsm.transition(testTrigger);
      assert.equal(fsm.getState(), 'EXECUTED', 'State bypassed directly to EXECUTED via injected transition');

      // Clean up injected test property
      delete DAVE_FSM_TRANSITIONS.INTENT_RECEIVED[testTrigger];
    });

    it('2.6 should reject invalid initial states in constructor fail-closed', () => {
      const badInitialStates = [
        'INVALID_STATE',
        'intent_received',
        'INTENT_RECIEVED',
        'EXECUTED_AUTHORIZED',
        '',
        '   ',
        null,
        123,
        false,
        true,
        {},
        []
      ];

      for (const badState of badInitialStates) {
        assert.throws(
          () => new DaveStateMachine(badState),
          /Invalid initial state/,
          `Constructor must reject invalid initial state: ${String(badState)}`
        );
      }

      const defaultFsm = new DaveStateMachine(undefined);
      assert.equal(defaultFsm.getState(), 'INTENT_RECEIVED');
    });

    it('2.7 should prevent external history tampering via defensive copying', () => {
      const fsm = new DaveStateMachine('INTENT_RECEIVED');
      fsm.transition('context_assembled', { step: 1 });

      const history = fsm.getHistory();
      assert.equal(history.length, 2);

      history.push({ state: 'MUTATED_STATE', trigger: 'hacked' });
      assert.equal(fsm.getHistory().length, 2, 'External push must not affect internal history');
      assert.equal(fsm.getState(), 'CONTEXT_COLLECTED');
    });
  });

  // ===========================================================================
  // SUITE 3: Edge Case Confidence Scores & Boundary Handling
  // ===========================================================================
  describe('3. Confidence Score Intake & Boundary Stress Testing', () => {
    function makeCandidateDecision(confidence, risk = 'low', humanAction = 'none') {
      return {
        decision_id: 'DAVE-TEST-0001',
        decision_type: 'ux_ui_design',
        goal_id: 'G-DAVE-001',
        decision: { summary: 'Adversarial confidence testing' },
        confidence,
        risk,
        evidence: ['docs/03-architecture/design-tokens.md'],
        references: ['REF-0001'],
        assumptions: ['Testing boundary assumptions'],
        alternatives_rejected: ['Unbounded float inputs'],
        verification: ['test_verification'],
        human_action: humanAction
      };
    }

    it('3.1 should reject negative confidence scores fail-closed (< 0.0)', () => {
      const negativeValues = [
        -0.000000000001,
        -0.001,
        -0.1,
        -0.5,
        -0.85,
        -1.0,
        -10.0,
        -1000.0,
        -Infinity,
        -Number.MIN_VALUE,
        -Number.MAX_VALUE
      ];

      for (const badConf of negativeValues) {
        const dec = makeCandidateDecision(badConf);
        const res = validateDaveDecision(dec);
        assert.equal(res.valid, false, `Expected confidence ${badConf} to be rejected`);
        assert.ok(
          res.errors.some(e => e.includes('confidence must be a finite number in [0.0, 1.0]')),
          `Error for ${badConf} must mention bounds: ${res.errors.join('; ')}`
        );
      }
    });

    it('3.2 should reject confidence scores strictly greater than 1.0 (> 1.0)', () => {
      const overValues = [
        1.000000000001,
        1.001,
        1.01,
        1.1,
        1.5,
        2.0,
        10.0,
        100.0,
        Infinity,
        Number.MAX_VALUE,
        1e308
      ];

      for (const badConf of overValues) {
        const dec = makeCandidateDecision(badConf);
        const res = validateDaveDecision(dec);
        assert.equal(res.valid, false, `Expected confidence ${badConf} to be rejected`);
        assert.ok(
          res.errors.some(e => e.includes('confidence must be a finite number in [0.0, 1.0]')),
          `Error for ${badConf} must mention bounds: ${res.errors.join('; ')}`
        );
      }
    });

    it('3.3 should reject NaN and non-finite confidence values', () => {
      const nonFinites = [
        NaN,
        Number.NaN,
        0 / 0,
        Math.sqrt(-1),
        Infinity,
        -Infinity
      ];

      for (const badConf of nonFinites) {
        const dec = makeCandidateDecision(badConf);
        const res = validateDaveDecision(dec);
        assert.equal(res.valid, false, `Expected ${String(badConf)} to be rejected`);
        assert.ok(
          res.errors.some(e => e.includes('confidence must be a finite number in [0.0, 1.0]')),
          `Error for ${String(badConf)} must mention finite: ${res.errors.join('; ')}`
        );
      }
    });

    it('3.4 should reject non-numeric confidence types (strings, booleans, objects, null)', () => {
      const nonNumerics = [
        '0.95',
        '0.85',
        '1.0',
        '0',
        'high',
        'low',
        '',
        '   ',
        'NaN',
        '0x10',
        null,
        undefined,
        true,
        false,
        1n,
        {},
        { value: 0.95 },
        [],
        [0.95]
      ];

      for (const badConf of nonNumerics) {
        const dec = makeCandidateDecision(badConf);
        const res = validateDaveDecision(dec);
        assert.equal(res.valid, false, `Expected type ${typeof badConf} (${String(badConf)}) to be rejected`);
        assert.ok(
          res.errors.some(e => e.includes('confidence must be a finite number in [0.0, 1.0]')),
          `Error for ${String(badConf)} must mention finite number: ${res.errors.join('; ')}`
        );
      }
    });

    it('3.5 should empirically confirm unhandled TypeError on Symbol confidence input', () => {
      // VULNERABILITY AUDIT:
      // In validateDaveDecision line 208:
      // `errors.push(\`confidence must be a finite number in [0.0, 1.0] (got: \${decision.confidence})\`);`
      // String interpolation of Symbol throws TypeError!
      const decWithSymbol = makeCandidateDecision(Symbol('attack'));
      assert.throws(
        () => validateDaveDecision(decWithSymbol),
        /Cannot convert a Symbol value to a string/,
        'Observed unhandled TypeError crash when confidence is Symbol'
      );
    });

    it('3.6 should accept exact valid boundary values [0.0, 1.0] with accurate human gating', () => {
      const dec0 = makeCandidateDecision(0.0, 'low', 'approve');
      const res0 = validateDaveDecision(dec0);
      assert.equal(res0.valid, true, `Confidence 0.0 with approve should be valid: ${res0.errors.join(', ')}`);
      assert.equal(res0.requiresHumanApproval, true, 'Confidence 0.0 must require human approval');

      const dec0NoAction = makeCandidateDecision(0.0, 'low', 'none');
      const res0NoAction = validateDaveDecision(dec0NoAction);
      assert.equal(res0NoAction.valid, false);
      assert.equal(res0NoAction.requiresHumanApproval, true);
      assert.ok(res0NoAction.errors.some(e => e.includes("human_action MUST be 'approve'")));

      const dec1 = makeCandidateDecision(1.0, 'low', 'none');
      const res1 = validateDaveDecision(dec1);
      assert.equal(res1.valid, true, `Confidence 1.0 should be valid: ${res1.errors.join(', ')}`);
      assert.equal(res1.requiresHumanApproval, false);

      const dec85 = makeCandidateDecision(0.85, 'low', 'none');
      const res85 = validateDaveDecision(dec85);
      assert.equal(res85.valid, true);
      assert.equal(res85.requiresHumanApproval, false);

      const decSub85 = makeCandidateDecision(0.8499999999999999, 'low', 'none');
      const resSub85 = validateDaveDecision(decSub85);
      assert.equal(resSub85.valid, false);
      assert.equal(resSub85.requiresHumanApproval, true);

      const decSuper85 = makeCandidateDecision(0.8500000000000001, 'low', 'none');
      const resSuper85 = validateDaveDecision(decSuper85);
      assert.equal(resSuper85.valid, true);
      assert.equal(resSuper85.requiresHumanApproval, false);
    });

    it('3.7 should verify IEEE-754 negative zero (-0.0) behavior', () => {
      const decNegZero = makeCandidateDecision(-0.0, 'low', 'approve');
      const resNegZero = validateDaveDecision(decNegZero);
      assert.equal(resNegZero.valid, true);
      assert.equal(resNegZero.requiresHumanApproval, true);
    });
  });

  // ===========================================================================
  // SUITE 4: 4-Way Routing Truth Table & Risk Classification Edge Cases
  // ===========================================================================
  describe('4. Routing Truth Table & Risk Safety Boundaries', () => {
    it('4.1 should evaluate canonical 8-case truth table in evaluateRoutingTruthTable', () => {
      const cases = [
        { risk: 'low', evidence: 'verified', confidence: 0.95, expected: 'proceed' },
        { risk: 'low', evidence: 'verified', confidence: 0.85, expected: 'proceed' },
        { risk: 'low', evidence: 'verified', confidence: 0.849, expected: 'verify' },
        { risk: 'low', evidence: 'unverified', confidence: 0.95, expected: 'verify' },
        { risk: 'low', evidence: 'unverified', confidence: 0.70, expected: 'defer' },

        { risk: 'high', evidence: 'verified', confidence: 0.95, expected: 'human_review' },
        { risk: 'high', evidence: 'verified', confidence: 0.80, expected: 'defer' },
        { risk: 'high', evidence: 'unverified', confidence: 0.95, expected: 'defer' },
        { risk: 'high', evidence: 'unverified', confidence: 0.50, expected: 'defer' }
      ];

      for (const tc of cases) {
        const actual = evaluateRoutingTruthTable(tc);
        assert.equal(
          actual,
          tc.expected,
          `Routing mismatch for ${JSON.stringify(tc)}: expected ${tc.expected}, got ${actual}`
        );
      }
    });

    it('4.2 should strictly prevent autonomous proceed on high-risk unverified proposals', () => {
      const testConfidences = [0.0, 0.5, 0.85, 0.90, 0.95, 0.99, 1.0];

      for (const conf of testConfidences) {
        const result = evaluateRoutingTruthTable({
          risk: 'high',
          evidence: 'unverified',
          confidence: conf
        });
        assert.notEqual(
          result,
          'proceed',
          `High-risk unverified decision must never proceed (confidence=${conf})`
        );
        assert.equal(result, 'defer');
      }
    });

    it('4.3 should handle non-numeric or edge case confidence inputs fail-closed in routing', () => {
      assert.equal(
        evaluateRoutingTruthTable({ risk: 'low', evidence: 'verified', confidence: 'high' }),
        'proceed'
      );
      assert.equal(
        evaluateRoutingTruthTable({ risk: 'low', evidence: 'verified', confidence: 'low' }),
        'verify'
      );
      assert.equal(
        evaluateRoutingTruthTable({ risk: 'low', evidence: 'verified', confidence: 'unknown' }),
        'verify'
      );
      assert.equal(
        evaluateRoutingTruthTable({ risk: 'low', evidence: 'verified', confidence: NaN }),
        'verify'
      );
      assert.equal(
        evaluateRoutingTruthTable({ risk: 'low', evidence: 'verified', confidence: -Infinity }),
        'verify'
      );
    });

    it('4.4 should empirically confirm critical-risk bypass in evaluateRoutingTruthTable and formatReviewPacket', () => {
      // VULNERABILITY AUDIT:
      // evaluateRoutingTruthTable checks `(risk || '').toLowerCase() === 'high'`.
      // When risk is 'critical', isHighRisk is FALSE!
      // Thus, a critical risk proposal with verified evidence and high confidence returns 'proceed'!
      const routeRes = evaluateRoutingTruthTable({
        risk: 'critical',
        evidence: 'verified',
        confidence: 0.95
      });
      assert.equal(
        routeRes,
        'proceed',
        'Observed critical-risk bypass: critical risk improperly returns proceed instead of human_review/defer'
      );

      // In formatReviewPacket line 618:
      // `const isProceed = confVal >= 0.85 && risk !== 'HIGH';`
      // For risk='CRITICAL', risk !== 'HIGH' is true, so it claims 'PROCEED (Eligible for autonomous execution)'
      const packet = formatReviewPacket({
        decision_id: 'DAVE-SEC-0001',
        decision_type: 'security',
        goal_id: 'G-SEC-001',
        decision: { summary: 'Disable production auth firewall' },
        confidence: 0.99,
        risk: 'critical',
        evidence: ['sec.md']
      });
      assert.ok(
        packet.includes('Routing Status: PROCEED (Eligible for autonomous execution)'),
        'Observed review packet vulnerability: critical-risk decision labeled as eligible for autonomous execution'
      );
    });
  });

  // ===========================================================================
  // SUITE 5: Decision Ledger & Chained Merkle Hash Integrity
  // ===========================================================================
  describe('5. Decision Ledger & Chained Hashing Invariants', () => {
    it('5.1 should append decisions with cryptographic SHA-256 chained hashing', () => {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      const ledgerFile = path.join(tmpDir, 'adversarial-ledger.jsonl');
      if (fs.existsSync(ledgerFile)) fs.unlinkSync(ledgerFile);

      const rec1 = recordDecision(ledgerFile, {
        decision_id: 'DAVE-TEST-0001',
        goal_id: 'G-TEST-001',
        action: 'test_action_1'
      });

      assert.equal(rec1.index, 0);
      assert.equal(rec1.prevHash, '0'.repeat(64));
      assert.ok(rec1.hash && rec1.hash.length === 64);

      const rec2 = recordDecision(ledgerFile, {
        decision_id: 'DAVE-TEST-0002',
        goal_id: 'G-TEST-001',
        action: 'test_action_2'
      });

      assert.equal(rec2.index, 1);
      assert.equal(rec2.prevHash, rec1.hash, 'Entry 2 prevHash must equal Entry 1 hash');
      assert.ok(rec2.hash && rec2.hash.length === 64);
      assert.notEqual(rec2.hash, rec1.hash);

      const lines = fs.readFileSync(ledgerFile, 'utf8').trim().split('\n');
      assert.equal(lines.length, 2);
      const parsed1 = JSON.parse(lines[0]);
      const parsed2 = JSON.parse(lines[1]);
      assert.equal(parsed1.hash, rec1.hash);
      assert.equal(parsed2.prevHash, rec1.hash);
      assert.equal(parsed2.hash, rec2.hash);
    });

    it('5.2 should fail-closed and abort append when ledger contains corrupted JSON line', () => {
      const corruptedLedger = path.join(tmpDir, 'corrupted-ledger.jsonl');
      fs.writeFileSync(corruptedLedger, '{"valid": true, "hash": "abc"}\nCORRUPT_NON_JSON_LINE\n', 'utf8');

      assert.throws(
        () => recordDecision(corruptedLedger, { decision_id: 'DAVE-FAIL-0001' }),
        /Corrupted decision record in ledger/,
        'Must abort fail-closed upon reading corrupt JSON line'
      );
    });
  });
});
