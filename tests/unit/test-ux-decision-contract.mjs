import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  UX_DECISION_SCHEMA_VERSION,
  UX_LIFECYCLE_STATES,
  UX_DECISION_CATEGORIES,
  UX_RISK_LEVELS,
  CANONICAL_UX_PERSONAS,
  COMPONENT_STATES,
  validateUxDecisionContract,
  createDefaultUxDecision
} from '../../scripts/lib/ux-decision-contract.mjs';

describe('G-UX-001: Canonical UX Decision Contract Test Suite', () => {

  describe('Canonical Constants & Enums', () => {
    it('test 1: exports canonical schema version 1', () => {
      assert.strictEqual(UX_DECISION_SCHEMA_VERSION, 1);
    });

    it('test 2: exports all 10 canonical lifecycle states', () => {
      assert.strictEqual(UX_LIFECYCLE_STATES.length, 10);
      assert.ok(UX_LIFECYCLE_STATES.includes('OBSERVE'));
      assert.ok(UX_LIFECYCLE_STATES.includes('PERCEIVE'));
      assert.ok(UX_LIFECYCLE_STATES.includes('CRITIQUE_WCAG'));
      assert.ok(UX_LIFECYCLE_STATES.includes('CRITIQUE_HEURISTICS'));
      assert.ok(UX_LIFECYCLE_STATES.includes('DEBATE'));
      assert.ok(UX_LIFECYCLE_STATES.includes('RESOLVE_COLLISION'));
      assert.ok(UX_LIFECYCLE_STATES.includes('EVALUATE_CONFIDENCE'));
      assert.ok(UX_LIFECYCLE_STATES.includes('EMIT_DECISION'));
      assert.ok(UX_LIFECYCLE_STATES.includes('DEFER'));
      assert.ok(UX_LIFECYCLE_STATES.includes('REJECT_AS_UNSAFE'));
    });

    it('test 3: exports all 12 canonical UX personas', () => {
      assert.strictEqual(CANONICAL_UX_PERSONAS.length, 12);
      assert.ok(CANONICAL_UX_PERSONAS.includes('design_systems_lead'));
      assert.ok(CANONICAL_UX_PERSONAS.includes('accessibility_auditor'));
      assert.ok(CANONICAL_UX_PERSONAS.includes('interaction_choreographer'));
      assert.ok(CANONICAL_UX_PERSONAS.includes('visual_balance_density'));
      assert.ok(CANONICAL_UX_PERSONAS.includes('typography_scale_architect'));
      assert.ok(CANONICAL_UX_PERSONAS.includes('motion_haptics_engineer'));
      assert.ok(CANONICAL_UX_PERSONAS.includes('ergonomics_cognitive_critic'));
      assert.ok(CANONICAL_UX_PERSONAS.includes('color_contrast_specialist'));
      assert.ok(CANONICAL_UX_PERSONAS.includes('enterprise_info_architect'));
      assert.ok(CANONICAL_UX_PERSONAS.includes('dark_pattern_ethics_watchdog'));
      assert.ok(CANONICAL_UX_PERSONAS.includes('microcopy_tone_specialist'));
      assert.ok(CANONICAL_UX_PERSONAS.includes('i18n_multilocale_stylist'));
    });

    it('test 4: exports all 5 mandatory component states', () => {
      assert.deepStrictEqual(Array.from(COMPONENT_STATES), ['empty', 'loading', 'partial', 'full', 'error']);
    });
  });

  describe('Contract Schema Validation (Positive Cases)', () => {
    it('test 5: validates default contract with zero errors', () => {
      const contract = createDefaultUxDecision();
      const res = validateUxDecisionContract(contract);
      assert.strictEqual(res.valid, true, `Validation failed: ${res.errors.join(', ')}`);
      assert.strictEqual(res.errors.length, 0);
    });

    it('test 6: validates contract with minimal required fields', () => {
      const minimal = {
        schema_version: 1,
        decision_id: 'UX-DEC-0002-005',
        goal_id: 'G-UX-002',
        timestamp: '2026-10-14T05:00:00Z',
        lifecycle_state: 'PERCEIVE',
        decision: {
          summary: 'Apply responsive flexbox wrap to navigation header bar.',
          category: 'navigation',
          touch_map: ['code/src/components/Header.tsx'],
          tokens_applied: { nav_bg: '--color-surface-elevated' }
        },
        confidence: 0.88,
        confidence_calibrated: true,
        risk_level: 'medium',
        evidence: ['docs/03-architecture/design-tokens.md'],
        references: [
          {
            reference_id: 'REF-0002',
            content_hash: 'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
            uri: 'docs/02-product/design/reference/REF-0002.png'
          }
        ],
        personas_involved: ['design_systems_lead', 'accessibility_auditor'],
        state_matrix: {
          empty: { render: 'EmptyNav' },
          loading: { render: 'NavSkeleton' },
          partial: { render: 'PartialNav' },
          full: { render: 'FullNav' },
          error: { render: 'NavError' }
        },
        viewport_contract: {
          viewports: [{ name: 'desktop', width: 1440, height: 900 }],
          max_overflow_px: 0,
          cls_score: 0.0
        },
        verification_plan: ['npm test']
      };
      const res = validateUxDecisionContract(minimal);
      assert.strictEqual(res.valid, true, `Validation failed: ${res.errors.join(', ')}`);
    });
  });

  describe('Contract Schema Validation (Negative Cases & Fail-Closed Invariants)', () => {
    it('test 7: rejects non-object payload fail-closed', () => {
      const res = validateUxDecisionContract('invalid string');
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors[0].includes('non-null JSON object'));
    });

    it('test 8: rejects invalid schema_version', () => {
      const bad = createDefaultUxDecision({ schema_version: 2 });
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('Invalid \'schema_version\'')));
    });

    it('test 9: rejects malformed decision_id', () => {
      const bad = createDefaultUxDecision({ decision_id: 'DEC-01' });
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('does not match required pattern')));
    });

    it('test 10: rejects uncalibrated confidence (confidence_calibrated: false)', () => {
      const bad = createDefaultUxDecision({ confidence_calibrated: false });
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('confidence_calibrated')));
    });

    it('test 11: rejects out-of-bounds confidence score (> 1.0 or < 0.0)', () => {
      const badHigh = createDefaultUxDecision({ confidence: 1.05 });
      const resHigh = validateUxDecisionContract(badHigh);
      assert.strictEqual(resHigh.valid, false);
      assert.ok(resHigh.errors.some(e => e.includes('out of bounds')));

      const badLow = createDefaultUxDecision({ confidence: -0.1 });
      const resLow = validateUxDecisionContract(badLow);
      assert.strictEqual(resLow.valid, false);
      assert.ok(resLow.errors.some(e => e.includes('out of bounds')));
    });

    it('test 12: rejects missing component branch in state_matrix', () => {
      const badMatrix = {
        empty: { render: 'Empty' },
        loading: { render: 'Loading' },
        partial: { render: 'Partial' },
        full: { render: 'Full' }
        // missing 'error'
      };
      const bad = createDefaultUxDecision({ state_matrix: badMatrix });
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('missing mandatory 5-state component branch \'error\'')));
    });

    it('test 13: rejects horizontal overflow (max_overflow_px > 0)', () => {
      const bad = createDefaultUxDecision({
        viewport_contract: {
          viewports: [{ name: 'mobile', width: 390, height: 844 }],
          max_overflow_px: 15,
          cls_score: 0.0
        }
      });
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('horizontal overflow is strictly forbidden')));
    });

    it('test 14: rejects positive CLS score (cls_score > 0.0)', () => {
      const bad = createDefaultUxDecision({
        viewport_contract: {
          viewports: [{ name: 'desktop', width: 1440, height: 900 }],
          max_overflow_px: 0,
          cls_score: 0.05
        }
      });
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('zero cumulative layout shift required')));
    });

    it('test 15: rejects unrecognized persona in personas_involved', () => {
      const bad = createDefaultUxDecision({
        personas_involved: ['design_systems_lead', 'rogue_ai_hacker']
      });
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('unrecognized persona "rogue_ai_hacker"')));
    });

    it('test 16: rejects additional unrecognized root properties fail-closed', () => {
      const bad = createDefaultUxDecision({
        unauthorized_backdoor_field: 'leak'
      });
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('Additional property \'unauthorized_backdoor_field\' is forbidden')));
    });

    it('test 17: rejects invalid reference content_hash format', () => {
      const bad = createDefaultUxDecision({
        references: [
          {
            reference_id: 'REF-0001',
            content_hash: 'md5:badhash',
            uri: 'docs/test.png'
          }
        ]
      });
      const res = validateUxDecisionContract(bad);
      assert.strictEqual(res.valid, false);
      assert.ok(res.errors.some(e => e.includes('content_hash')));
    });
  });
});
