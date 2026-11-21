import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  UxDecisionLifecycleEngine,
  routeDoubt,
  CONFIDENCE_THRESHOLD,
  TERMINAL_STATES,
  InvalidStateTransitionError
} from '../../scripts/lib/ux-decision-lifecycle.mjs';
import { createDefaultUxDecision } from '../../scripts/lib/ux-decision-contract.mjs';

describe('G-UX-002: 10-State UX Decision Runtime Lifecycle & Doubt Router Suite', () => {

  describe('Initialization & State Inspection', () => {
    it('test 1: initializes in OBSERVE state by default', () => {
      const engine = new UxDecisionLifecycleEngine();
      assert.strictEqual(engine.getState(), 'OBSERVE');
      assert.strictEqual(engine.isTerminal(), false);
      assert.strictEqual(engine.getHistory().length, 1);
      assert.strictEqual(engine.getHistory()[0].event, 'INIT');
    });

    it('test 2: rejects invalid initial state', () => {
      assert.throws(() => {
        new UxDecisionLifecycleEngine('INVALID_STATE');
      }, /Invalid initial state/);
    });

    it('test 3: exports CONFIDENCE_THRESHOLD as exactly 0.7500', () => {
      assert.strictEqual(CONFIDENCE_THRESHOLD, 0.75);
    });

    it('test 4: exports all 3 terminal states', () => {
      assert.deepStrictEqual(Array.from(TERMINAL_STATES), ['EMIT_DECISION', 'DEFER', 'REJECT_AS_UNSAFE']);
    });
  });

  describe('Doubt Router Boundary & Truth Table Assertions', () => {
    it('test 5: routes to DEFER when calibrated confidence is below 0.7500 (c = 0.7499)', () => {
      const outcome = routeDoubt({
        confidence: 0.7499,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.strictEqual(outcome.route, 'DEFER');
      assert.strictEqual(outcome.authorized, false);
      assert.ok(outcome.reason.includes('below strict threshold 0.7500'));
    });

    it('test 6: authorizes EMIT_DECISION when c == 0.7500 and invariants hold', () => {
      const outcome = routeDoubt({
        confidence: 0.7500,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.strictEqual(outcome.route, 'EMIT_DECISION');
      assert.strictEqual(outcome.authorized, true);
    });

    it('test 7: routes to DEFER when evidence is unverified despite high confidence', () => {
      const outcome = routeDoubt({
        confidence: 0.98,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: false,
        veto_asserted: false
      });
      assert.strictEqual(outcome.route, 'DEFER');
      assert.strictEqual(outcome.authorized, false);
      assert.ok(outcome.reason.includes('evidence has not been physically verified'));
    });

    it('test 8: routes to DEFER when risk_level is critical despite high confidence and verified evidence', () => {
      const outcome = routeDoubt({
        confidence: 0.95,
        confidence_calibrated: true,
        risk_level: 'critical',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.strictEqual(outcome.route, 'DEFER');
      assert.strictEqual(outcome.authorized, false);
      assert.ok(outcome.reason.includes('critical'));
    });

    it('test 9: routes to REJECT_AS_UNSAFE immediately on deceptive dark pattern trigger', () => {
      const outcome = routeDoubt({
        confidence: 0.99,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: true,
        dark_pattern_detected: true
      });
      assert.strictEqual(outcome.route, 'REJECT_AS_UNSAFE');
      assert.strictEqual(outcome.authorized, false);
      assert.ok(outcome.reason.includes('dark pattern'));
    });

    it('test 10: routes to REJECT_AS_UNSAFE on Tier 1 or specialist veto assertion', () => {
      const outcome = routeDoubt({
        confidence: 0.90,
        confidence_calibrated: true,
        evidence_verified: true,
        veto_asserted: true
      });
      assert.strictEqual(outcome.route, 'REJECT_AS_UNSAFE');
      assert.strictEqual(outcome.authorized, false);
      assert.ok(outcome.reason.includes('veto asserted fail-closed'));
    });
  });

  describe('State Machine Transitions & Guard Conditions', () => {
    it('test 11: executes happy path transitions step-by-step from OBSERVE to EMIT_DECISION', () => {
      const engine = new UxDecisionLifecycleEngine();

      assert.strictEqual(engine.getState(), 'OBSERVE');
      engine.transition('input_received', { hasArtifacts: true });
      assert.strictEqual(engine.getState(), 'PERCEIVE');

      engine.transition('scene_graph_synthesized', { sceneGraphValid: true });
      assert.strictEqual(engine.getState(), 'CRITIQUE_WCAG');

      engine.transition('a11y_evaluated', { wcagHardFail: false });
      assert.strictEqual(engine.getState(), 'CRITIQUE_HEURISTICS');

      engine.transition('heuristics_scored', { catastrophicLoss: false });
      assert.strictEqual(engine.getState(), 'DEBATE');

      engine.transition('proposals_gathered', { darkPatternDetected: false });
      assert.strictEqual(engine.getState(), 'RESOLVE_COLLISION');

      engine.transition('collisions_resolved', { deadlock: false });
      assert.strictEqual(engine.getState(), 'EVALUATE_CONFIDENCE');

      engine.transition('autonomy_authorized', {
        confidence: 0.85,
        evidence_verified: true,
        risk_level: 'low',
        veto_asserted: false
      });
      assert.strictEqual(engine.getState(), 'EMIT_DECISION');
      assert.strictEqual(engine.isTerminal(), true);
      assert.strictEqual(engine.getHistory().length, 8);
    });

    it('test 12: transitions directly to REJECT_AS_UNSAFE on dark pattern detected during DEBATE', () => {
      const engine = new UxDecisionLifecycleEngine('DEBATE');
      engine.transition('dark_pattern_detected', { darkPatternDetected: true });
      assert.strictEqual(engine.getState(), 'REJECT_AS_UNSAFE');
      assert.strictEqual(engine.isTerminal(), true);
    });

    it('test 13: transitions directly to REJECT_AS_UNSAFE on wcag_hard_fail during CRITIQUE_WCAG', () => {
      const engine = new UxDecisionLifecycleEngine('CRITIQUE_WCAG');
      engine.transition('wcag_hard_fail', { wcagHardFail: true });
      assert.strictEqual(engine.getState(), 'REJECT_AS_UNSAFE');
      assert.strictEqual(engine.isTerminal(), true);
    });

    it('test 14: transitions to DEFER on deadlock_detected during RESOLVE_COLLISION', () => {
      const engine = new UxDecisionLifecycleEngine('RESOLVE_COLLISION');
      engine.transition('deadlock_detected', { deadlock: true });
      assert.strictEqual(engine.getState(), 'DEFER');
      assert.strictEqual(engine.isTerminal(), true);
    });

    it('test 15: rejects illegal state transitions fail-closed (e.g. OBSERVE -> EMIT_DECISION)', () => {
      const engine = new UxDecisionLifecycleEngine('OBSERVE');
      assert.throws(() => {
        engine.transition('autonomy_authorized');
      }, InvalidStateTransitionError);
    });

    it('test 16: prevents transitions out of terminal states', () => {
      const engine = new UxDecisionLifecycleEngine('EMIT_DECISION');
      assert.throws(() => {
        engine.transition('input_received');
      }, /Cannot transition out of terminal state/);
    });
  });

  describe('End-to-End runFullLifecycle Integration', () => {
    it('test 17: runs full lifecycle to EMIT_DECISION for a compliant high-confidence decision', () => {
      const engine = new UxDecisionLifecycleEngine();
      const contract = createDefaultUxDecision({ confidence: 0.91, risk_level: 'low' });
      const result = engine.runFullLifecycle(contract, { evidence_verified: true });

      assert.strictEqual(result.finalState, 'EMIT_DECISION');
      assert.strictEqual(result.decisionContract.lifecycle_state, 'EMIT_DECISION');
      assert.strictEqual(result.routingOutcome.authorized, true);
    });

    it('test 18: runs full lifecycle to DEFER when confidence < 0.75', () => {
      const engine = new UxDecisionLifecycleEngine();
      const contract = createDefaultUxDecision({ confidence: 0.71 });
      const result = engine.runFullLifecycle(contract, { evidence_verified: true });

      assert.strictEqual(result.finalState, 'DEFER');
      assert.strictEqual(result.decisionContract.lifecycle_state, 'DEFER');
      assert.strictEqual(result.routingOutcome.authorized, false);
    });

    it('test 19: runs full lifecycle to REJECT_AS_UNSAFE when dark pattern is present', () => {
      const engine = new UxDecisionLifecycleEngine();
      const contract = createDefaultUxDecision({ confidence: 0.95 });
      const result = engine.runFullLifecycle(contract, {
        evidence_verified: true,
        darkPatternDetected: true
      });

      assert.strictEqual(result.finalState, 'REJECT_AS_UNSAFE');
      assert.strictEqual(result.decisionContract.lifecycle_state, 'REJECT_AS_UNSAFE');
      assert.strictEqual(result.routingOutcome.authorized, false);
    });
  });
});
