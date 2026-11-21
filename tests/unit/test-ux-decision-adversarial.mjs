/**
 * ════════════════════════════════════════════════════════════════════════════════
 * ⚔️ SODA OS UX DECISION CONTRACT & STATE MACHINE ADVERSARIAL STRESS TEST SUITE
 * ════════════════════════════════════════════════════════════════════════════════
 * Agent: challenger_wave1_1 (EMPIRICAL CHALLENGER / critic & specialist)
 * Target: Milestone 1 (M1: Formal Contracts & State Machine Governance)
 * Modules: scripts/lib/ux-decision-contract.mjs, scripts/lib/ux-decision-lifecycle.mjs
 * Invariants: Zero Mocks, Zero Stubs, Empirical Reproduction of Vulnerabilities
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateUxDecisionContract,
  createDefaultUxDecision,
  COMPONENT_STATES,
  UX_DECISION_SCHEMA_VERSION,
  UX_LIFECYCLE_STATES,
  CANONICAL_UX_PERSONAS
} from '../../scripts/lib/ux-decision-contract.mjs';
import {
  routeDoubt,
  UxDecisionLifecycleEngine,
  CONFIDENCE_THRESHOLD,
  TERMINAL_STATES,
  InvalidStateTransitionError
} from '../../scripts/lib/ux-decision-lifecycle.mjs';

describe('⚔️ Adversarial Stress Testing — Milestone 1 Contracts & State Machine', () => {

  // ───────────────────────────────────────────────────────────────────────────
  // 1. CONTRACT SCHEMA MUTATION: MISSING REQUIRED FIELDS
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Contract Schema Mutation — Missing Required Fields', () => {
    const requiredTopLevelFields = [
      'schema_version',
      'decision_id',
      'goal_id',
      'timestamp',
      'lifecycle_state',
      'decision',
      'confidence',
      'confidence_calibrated',
      'risk_level',
      'evidence',
      'references',
      'personas_involved',
      'state_matrix',
      'viewport_contract',
      'verification_plan'
    ];

    for (const field of requiredTopLevelFields) {
      it(`1.${requiredTopLevelFields.indexOf(field) + 1} rejects missing top-level field: '${field}' fail-closed`, () => {
        const candidate = createDefaultUxDecision();
        delete candidate[field];
        const res = validateUxDecisionContract(candidate);
        assert.strictEqual(res.valid, false, `Expected rejection when '${field}' is deleted`);
        assert.ok(res.errors.length > 0);
        assert.ok(
          res.errors.some(e => e.includes(field)),
          `Error list should explicitly identify missing '${field}'. Errors: ${res.errors.join('; ')}`
        );
      });
    }

    const requiredDecisionFields = ['summary', 'category', 'touch_map', 'tokens_applied'];
    for (const field of requiredDecisionFields) {
      it(`1.decision.${field} rejects missing required decision sub-field: '${field}'`, () => {
        const candidate = createDefaultUxDecision();
        delete candidate.decision[field];
        const res = validateUxDecisionContract(candidate);
        assert.strictEqual(res.valid, false, `Expected rejection when 'decision.${field}' is deleted`);
        assert.ok(res.errors.some(e => e.includes(field)));
      });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. CONTRACT SCHEMA MUTATION: ILLEGAL TYPES
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Contract Schema Mutation — Illegal Types', () => {
    it('2.1 rejects schema_version as string or float', () => {
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ schema_version: '1' })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ schema_version: 1.5 })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ schema_version: null })).valid, false);
    });

    it('2.2 rejects decision_id as non-string type', () => {
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ decision_id: 12345 })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ decision_id: true })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ decision_id: {} })).valid, false);
    });

    it('2.3 rejects goal_id as non-string type', () => {
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ goal_id: 101 })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ goal_id: ['G-UX-001'] })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ goal_id: null })).valid, false);
    });

    it('2.4 rejects timestamp as non-string type', () => {
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ timestamp: Date.now() })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ timestamp: new Date() })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ timestamp: false })).valid, false);
    });

    it('2.5 rejects lifecycle_state as non-string or unknown state', () => {
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ lifecycle_state: 99 })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ lifecycle_state: 'UNKNOWN_STATE' })).valid, false);
    });

    it('2.6 rejects decision.summary with length < 10 or non-string', () => {
      const short = createDefaultUxDecision();
      short.decision.summary = 'Too short';
      assert.strictEqual(validateUxDecisionContract(short).valid, false);

      const num = createDefaultUxDecision();
      num.decision.summary = 1234567890123;
      assert.strictEqual(validateUxDecisionContract(num).valid, false);
    });

    it('2.7 rejects decision.touch_map containing non-strings or empty array', () => {
      const emptyTm = createDefaultUxDecision();
      emptyTm.decision.touch_map = [];
      assert.strictEqual(validateUxDecisionContract(emptyTm).valid, false);

      const nonStrTm = createDefaultUxDecision();
      nonStrTm.decision.touch_map = ['valid/path.ts', 12345];
      assert.strictEqual(validateUxDecisionContract(nonStrTm).valid, false);

      const whitespaceTm = createDefaultUxDecision();
      whitespaceTm.decision.touch_map = ['valid/path.ts', '   '];
      assert.strictEqual(validateUxDecisionContract(whitespaceTm).valid, false);
    });

    it('2.8 rejects decision.tokens_applied containing non-string token values', () => {
      const badTokens = createDefaultUxDecision();
      badTokens.decision.tokens_applied = { primary: 1234 };
      assert.strictEqual(validateUxDecisionContract(badTokens).valid, false);
    });

    it('2.9 rejects confidence as string, boolean, null, or undefined', () => {
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ confidence: '0.95' })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ confidence: true })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ confidence: null })).valid, false);
    });

    it('2.10 rejects confidence_calibrated when false, string, or number', () => {
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ confidence_calibrated: false })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ confidence_calibrated: 'true' })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ confidence_calibrated: 1 })).valid, false);
    });

    it('2.11 rejects references when not array or missing required subfields', () => {
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ references: 'REF-0001' })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ references: [{ reference_id: 'REF-0001' }] })).valid, false);
    });

    it('2.12 rejects personas_involved with empty array or non-canonical persona', () => {
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ personas_involved: [] })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ personas_involved: ['unregistered_ai_agent'] })).valid, false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. CONTRACT SCHEMA MUTATION: MALFORMED IDS & TIMESTAMPS
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Contract Schema Mutation — Malformed IDs & RFC3339 Timestamps', () => {
    const malformedDecisionIds = [
      'DEC-001',
      'UX-DEC-1-1',
      'UX-DEC-0001-12', // requires >= 3 digits at end
      'ux-dec-0001-001', // lowercase
      'UX-DEC-000A-001', // letters in first segment
      'UX-DEC-0001-001-EXTRA'
    ];

    for (const badId of malformedDecisionIds) {
      it(`3.decision_id rejects malformed format: "${badId}"`, () => {
        const candidate = createDefaultUxDecision({ decision_id: badId });
        const res = validateUxDecisionContract(candidate);
        assert.strictEqual(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('decision_id')));
      });
    }

    const malformedGoalIds = [
      'G-01',
      'G-1',
      'goal-001',
      'G_UX_001',
      'UX-001',
      'G-ux-001',
      'G-UX-0001'
    ];

    for (const badGoal of malformedGoalIds) {
      it(`3.goal_id rejects malformed format: "${badGoal}"`, () => {
        const candidate = createDefaultUxDecision({ goal_id: badGoal });
        const res = validateUxDecisionContract(candidate);
        assert.strictEqual(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('goal_id')));
      });
    }

    const malformedTimestamps = [
      '2026-10-14 04:00:00', // missing T
      '2026/10/14T04:00:00Z', // slash separator
      '14-10-2026T04:00:00Z', // day-month-year
      'not-a-date',
      '2026-10-14', // date only without time
      ''
    ];

    for (const badTime of malformedTimestamps) {
      it(`3.timestamp rejects non-RFC3339 format: "${badTime}"`, () => {
        const candidate = createDefaultUxDecision({ timestamp: badTime });
        const res = validateUxDecisionContract(candidate);
        assert.strictEqual(res.valid, false);
        assert.ok(res.errors.some(e => e.includes('timestamp')));
      });
    }

    it('3.references rejects malformed reference_id and content_hash', () => {
      const badRefId = createDefaultUxDecision({
        references: [{
          reference_id: 'REF-1',
          content_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          uri: 'docs/test.png'
        }]
      });
      assert.strictEqual(validateUxDecisionContract(badRefId).valid, false);

      const badHash = createDefaultUxDecision({
        references: [{
          reference_id: 'REF-0001',
          content_hash: 'sha256:nothex',
          uri: 'docs/test.png'
        }]
      });
      assert.strictEqual(validateUxDecisionContract(badHash).valid, false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. CONTRACT SCHEMA MUTATION: FORBIDDEN EXTRA PROPERTIES (FAIL-CLOSED)
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Contract Schema Mutation — Forbidden Extra Properties', () => {
    it('4.1 rejects unauthorized additional property on root object', () => {
      const bad = createDefaultUxDecision();
      bad.unauthorized_injected_root = 'attack_payload';
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes("Additional property 'unauthorized_injected_root' is forbidden")));
    });

    it('4.2 rejects unauthorized additional property in decision object', () => {
      const bad = createDefaultUxDecision();
      bad.decision.rogue_override = true;
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes("Additional property 'rogue_override' is forbidden in 'decision'")));
    });

    it('4.3 rejects unauthorized additional property in scoring_rule', () => {
      const bad = createDefaultUxDecision();
      bad.scoring_rule.untracked_heuristic = 0.42;
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes("Additional property 'untracked_heuristic' is forbidden in 'scoring_rule'")));
    });

    it('4.4 rejects unauthorized additional property in references item', () => {
      const bad = createDefaultUxDecision();
      bad.references[0].leaked_token = 'secret_123';
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes("Additional property 'leaked_token' is forbidden")));
    });

    it('4.5 rejects unauthorized additional property in proposals item', () => {
      const bad = createDefaultUxDecision();
      bad.proposals[0].arbitrary_instruction = 'drop database';
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes("Additional property 'arbitrary_instruction' is forbidden")));
    });

    it('4.6 rejects unauthorized additional property in viewport_contract', () => {
      const bad = createDefaultUxDecision();
      bad.viewport_contract.pixel_ratio_override = 3;
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes("Additional property 'pixel_ratio_override' is forbidden")));
    });

    it('4.7 rejects unauthorized additional property in ledger_record', () => {
      const bad = createDefaultUxDecision();
      bad.ledger_record.backdoor_signature = 'fake_sig';
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes("Additional property 'backdoor_signature' is forbidden")));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. 5-STATE COMPONENT MATRIX MUTATION & INVARIANCE
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. 5-State Component Matrix Mutation & Invariance', () => {
    for (const stateName of COMPONENT_STATES) {
      it(`5.1.${stateName} deleting '${stateName}' branch causes fail-closed rejection`, () => {
        const bad = createDefaultUxDecision();
        delete bad.state_matrix[stateName];
        const res = validateUxDecisionContract(bad);
        assert.strictEqual(res.valid, false);
        assert.ok(res.errors.some(e => e.includes(`missing mandatory 5-state component branch '${stateName}'`)));
      });

      it(`5.2.${stateName} nullifying '${stateName}' branch causes fail-closed rejection`, () => {
        const bad = createDefaultUxDecision();
        bad.state_matrix[stateName] = null;
        const res = validateUxDecisionContract(bad);
        assert.strictEqual(res.valid, false);
        assert.ok(res.errors.some(e => e.includes(`missing mandatory 5-state component branch '${stateName}'`)));
      });

      it(`5.3.${stateName} primitive value for '${stateName}' branch causes fail-closed rejection`, () => {
        const badStr = createDefaultUxDecision();
        badStr.state_matrix[stateName] = 'not_an_object';
        assert.strictEqual(validateUxDecisionContract(badStr).valid, false);

        const badNum = createDefaultUxDecision();
        badNum.state_matrix[stateName] = 42;
        assert.strictEqual(validateUxDecisionContract(badNum).valid, false);
      });
    }

    it('5.4 rejects extra unrecognized state branches (e.g. hover, active, focused, disabled)', () => {
      const extraStates = ['hover', 'active', 'focused', 'disabled', 'resting'];
      for (const extra of extraStates) {
        const bad = createDefaultUxDecision();
        bad.state_matrix[extra] = { render: `Mock${extra}` };
        const res = validateUxDecisionContract(bad);
        assert.strictEqual(res.valid, false);
        assert.ok(res.errors.some(e => e.includes(`unrecognized state branch '${extra}'`)));
      }
    });

    it('5.5 rejects state_matrix when set to array, string, null, or empty object', () => {
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ state_matrix: [] })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ state_matrix: 'empty' })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ state_matrix: null })).valid, false);
      assert.strictEqual(validateUxDecisionContract(createDefaultUxDecision({ state_matrix: {} })).valid, false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. VIEWPORT CONTRACT FUZZING: OVERFLOW & CLS
  // ───────────────────────────────────────────────────────────────────────────
  describe('6. Viewport Contract Fuzzing — Overflow & Cumulative Layout Shift (CLS)', () => {
    it('6.1 rejects positive max_overflow_px (> 0) fail-closed', () => {
      for (const overflow of [1, 0.5, 12, 100]) {
        const bad = createDefaultUxDecision();
        bad.viewport_contract.max_overflow_px = overflow;
        const res = validateUxDecisionContract(bad);
        assert.strictEqual(res.valid, false, `Expected rejection for overflow = ${overflow}`);
        assert.ok(res.errors.some(e => e.includes('horizontal overflow is strictly forbidden')));
      }
    });

    it('6.2 rejects negative max_overflow_px (< 0) fail-closed', () => {
      const bad = createDefaultUxDecision();
      bad.viewport_contract.max_overflow_px = -1;
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('horizontal overflow is strictly forbidden')));
    });

    it('6.3 rejects positive cls_score (> 0.0) fail-closed', () => {
      for (const cls of [0.0001, 0.01, 0.1, 1.0]) {
        const bad = createDefaultUxDecision();
        bad.viewport_contract.cls_score = cls;
        const res = validateUxDecisionContract(bad);
        assert.strictEqual(res.valid, false, `Expected rejection for cls = ${cls}`);
        assert.ok(res.errors.some(e => e.includes('zero cumulative layout shift required')));
      }
    });

    it('6.4 rejects non-number types for max_overflow_px and cls_score', () => {
      const badStr = createDefaultUxDecision();
      badStr.viewport_contract.max_overflow_px = '0';
      assert.strictEqual(validateUxDecisionContract(badStr).valid, false);

      const badClsStr = createDefaultUxDecision();
      badClsStr.viewport_contract.cls_score = '0.0';
      assert.strictEqual(validateUxDecisionContract(badClsStr).valid, false);
    });

    it('6.5 rejects viewport dimensions with width/height <= 0 or non-integer', () => {
      const badWidth = createDefaultUxDecision();
      badWidth.viewport_contract.viewports[0].width = 0;
      assert.strictEqual(validateUxDecisionContract(badWidth).valid, false);

      const negWidth = createDefaultUxDecision();
      negWidth.viewport_contract.viewports[0].width = -100;
      assert.strictEqual(validateUxDecisionContract(negWidth).valid, false);

      const floatWidth = createDefaultUxDecision();
      floatWidth.viewport_contract.viewports[0].width = 1440.5;
      assert.strictEqual(validateUxDecisionContract(floatWidth).valid, false);

      const badHeight = createDefaultUxDecision();
      badHeight.viewport_contract.viewports[0].height = 0;
      assert.strictEqual(validateUxDecisionContract(badHeight).valid, false);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // ⚠️ EMPIRICAL BUG REPRODUCTION 1: NaN in cls_score bypasses validator
    // ─────────────────────────────────────────────────────────────────────────
    it('6.6 verifies cls_score = NaN is rejected fail-closed by validateUxDecisionContract', () => {
      const bad = createDefaultUxDecision();
      bad.viewport_contract.cls_score = NaN;
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(
        res.valid,
        false,
        'Remediated: validateUxDecisionContract rejects NaN cls_score fail-closed'
      );
      assert.ok(res.errors.some(e => e.includes('cls_score')));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. CONFIDENCE & DOUBT ROUTER BOUNDARY FUZZING
  // ───────────────────────────────────────────────────────────────────────────
  describe('7. Confidence & Doubt Router Boundary Fuzzing', () => {
    it('7.1 boundary probe: c = 0.7499 unconditionally routes to DEFER', () => {
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

    it('7.2 boundary probe: c = 0.74999999 unconditionally routes to DEFER', () => {
      const outcome = routeDoubt({
        confidence: 0.74999999,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.strictEqual(outcome.route, 'DEFER');
      assert.strictEqual(outcome.authorized, false);
    });

    it('7.3 boundary probe: c = 0.7500 authorizes EMIT_DECISION when invariants hold', () => {
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

    it('7.4 boundary probe: c = 0.75000001 authorizes EMIT_DECISION', () => {
      const outcome = routeDoubt({
        confidence: 0.75000001,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.strictEqual(outcome.route, 'EMIT_DECISION');
      assert.strictEqual(outcome.authorized, true);
    });

    it('7.5 boundary probe: c = 1.0000 authorizes EMIT_DECISION', () => {
      const outcome = routeDoubt({
        confidence: 1.0000,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.strictEqual(outcome.route, 'EMIT_DECISION');
      assert.strictEqual(outcome.authorized, true);
    });

    it('7.6 negative confidence (c = -0.001, -1.0) routes to DEFER', () => {
      const outcome1 = routeDoubt({
        confidence: -0.001,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.strictEqual(outcome1.route, 'DEFER');
      assert.strictEqual(outcome1.authorized, false);

      const outcome2 = routeDoubt({
        confidence: -1.0,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.strictEqual(outcome2.route, 'DEFER');
      assert.strictEqual(outcome2.authorized, false);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Remediated: NaN, > 1.0, and null in routeDoubt route fail-closed to DEFER
    // ─────────────────────────────────────────────────────────────────────────
    it('7.7 verifies confidence = NaN routes fail-closed to DEFER in routeDoubt', () => {
      const outcome = routeDoubt({
        confidence: NaN,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.strictEqual(
        outcome.route,
        'DEFER',
        'Remediated: routeDoubt routes NaN confidence fail-closed to DEFER'
      );
      assert.strictEqual(
        outcome.authorized,
        false,
        'Remediated: authorized is false for NaN confidence'
      );
      assert.strictEqual(
        outcome.reason,
        'Invalid, non-finite, or uncalibrated confidence probability'
      );
    });

    it('7.8 verifies confidence > 1.0 routes fail-closed to DEFER in routeDoubt', () => {
      const outcome = routeDoubt({
        confidence: 1.5,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.strictEqual(
        outcome.route,
        'DEFER',
        'Remediated: routeDoubt rejects confidence 1.5 (> 1.0) and routes to DEFER'
      );
      assert.strictEqual(outcome.authorized, false);
      assert.strictEqual(
        outcome.reason,
        'Invalid, non-finite, or uncalibrated confidence probability'
      );
    });

    it('7.9 verifies confidence = null routes safely to DEFER without TypeError', () => {
      const outcome = routeDoubt({
        confidence: null,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.strictEqual(outcome.route, 'DEFER');
      assert.strictEqual(outcome.authorized, false);
      assert.strictEqual(
        outcome.reason,
        'Invalid, non-finite, or uncalibrated confidence probability'
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. LIFECYCLE STATE MACHINE ADVERSARIAL TRANSITIONS
  // ───────────────────────────────────────────────────────────────────────────
  describe('8. Lifecycle State Machine Adversarial Transitions', () => {
    it('8.1 rejects skipping lifecycle stages (OBSERVE -> EMIT_DECISION)', () => {
      const engine = new UxDecisionLifecycleEngine('OBSERVE');
      assert.throws(() => {
        engine.transition('autonomy_authorized');
      }, InvalidStateTransitionError);
    });

    it('8.2 rejects backwards transitions (CRITIQUE_WCAG -> OBSERVE)', () => {
      const engine = new UxDecisionLifecycleEngine('CRITIQUE_WCAG');
      assert.throws(() => {
        engine.transition('input_received');
      }, InvalidStateTransitionError);
    });

    it('8.3 prevents transitions out of terminal state EMIT_DECISION', () => {
      const engine = new UxDecisionLifecycleEngine('EMIT_DECISION');
      assert.throws(() => {
        engine.transition('input_received');
      }, /Cannot transition out of terminal state 'EMIT_DECISION'/);
    });

    it('8.4 prevents transitions out of terminal state DEFER', () => {
      const engine = new UxDecisionLifecycleEngine('DEFER');
      assert.throws(() => {
        engine.transition('input_received');
      }, /Cannot transition out of terminal state 'DEFER'/);
    });

    it('8.5 prevents transitions out of terminal state REJECT_AS_UNSAFE', () => {
      const engine = new UxDecisionLifecycleEngine('REJECT_AS_UNSAFE');
      assert.throws(() => {
        engine.transition('input_received');
      }, /Cannot transition out of terminal state 'REJECT_AS_UNSAFE'/);
    });

    it('8.6 transitions to REJECT_AS_UNSAFE on dark pattern detected during DEBATE', () => {
      const engine = new UxDecisionLifecycleEngine('DEBATE');
      const res = engine.transition('dark_pattern_detected', { darkPatternDetected: true });
      assert.strictEqual(res.currentState, 'REJECT_AS_UNSAFE');
      assert.strictEqual(engine.isTerminal(), true);
    });

    it('8.7 transitions to REJECT_AS_UNSAFE on wcag_hard_fail during CRITIQUE_WCAG', () => {
      const engine = new UxDecisionLifecycleEngine('CRITIQUE_WCAG');
      const res = engine.transition('wcag_hard_fail', { wcagHardFail: true });
      assert.strictEqual(res.currentState, 'REJECT_AS_UNSAFE');
      assert.strictEqual(engine.isTerminal(), true);
    });

    it('8.8 transitions to DEFER on deadlock_detected during RESOLVE_COLLISION', () => {
      const engine = new UxDecisionLifecycleEngine('RESOLVE_COLLISION');
      const res = engine.transition('deadlock_detected', { deadlock: true });
      assert.strictEqual(res.currentState, 'DEFER');
      assert.strictEqual(engine.isTerminal(), true);
    });

    it('8.9 runFullLifecycle rejects invalid contract immediately in OBSERVE -> input_error -> DEFER', () => {
      const engine = new UxDecisionLifecycleEngine();
      const corrupted = createDefaultUxDecision({ schema_version: 99 });
      const result = engine.runFullLifecycle(corrupted);
      assert.strictEqual(result.finalState, 'DEFER');
      assert.strictEqual(result.routingOutcome.route, 'DEFER');
      assert.strictEqual(result.routingOutcome.authorized, false);
      assert.ok(result.history.some(h => h.event === 'input_error'));
    });
  });
});
