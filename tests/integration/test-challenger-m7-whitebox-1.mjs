/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ EMPIRICAL CHALLENGER ADVERSARIAL BATTERY: MILESTONE 7 (TIER 5 WHITE-BOX)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Archetype: Empirical Challenger (role: critic, specialist)
 * Target Goals: G-UX-001 through G-UX-014 (Milestones M1, M2, and M3)
 * Invariants: Zero Mocks, Zero Stubs, Empirical Proof Verification
 * Coverage:
 *   - M1: 10-State FSM, Doubt Router, 12-Persona Veto, 4-Tier Precedence Resolver
 *   - M2: Gemma 4 Vision Adapter, Letterboxing, IoU/Normalizer, Scene Graph DAG
 *   - M3: 6-Stage Curriculum, Persona Trajectories, PII Sanitizer, Deferral Traps
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// M1 Imports
import {
  CONFIDENCE_THRESHOLD,
  TERMINAL_STATES,
  InvalidStateTransitionError,
  SafetyViolationError,
  STATE_TRANSITIONS,
  routeDoubt,
  UxDecisionLifecycleEngine
} from '../../scripts/lib/ux-decision-lifecycle.mjs';

import {
  PERSONA_TIERS,
  DARK_PATTERNS_TAXONOMY,
  PersonaContractError,
  PersonaVetoAssertedError,
  PERSONA_DEFINITIONS,
  UxPersonaRegistry
} from '../../scripts/lib/ux-persona-registry.mjs';

import {
  UX_PERSONA_TIERS,
  UX_PERSONA_PRIORITY_SCORES,
  normalizeUxProposal,
  evaluatePairwiseCollision,
  UxConflictDetector,
  UxConflictSynthesizer,
  UxDeadlockEscalator
} from '../../scripts/lib/ux-conflict-resolver.mjs';

// M2 Imports
import {
  CANONICAL_VIEWPORTS,
  DEFAULT_GEMMA4_VISION_CONFIG,
  computeLetterboxGeometry,
  computeDynamicTiles,
  computeTokenBudget,
  gelu,
  layerNorm,
  projectVisionEmbedding,
  formatGemma4MultimodalPrompt
} from '../../scripts/lib/gemma4-vision-adapter.mjs';

import {
  DEFAULT_ALIGNER_CONFIG,
  normalizeBoundingBox,
  denormalizeBoundingBox,
  calculateIoU,
  calculateEnclosure,
  getDefaultZIndex,
  OCRBoundingBoxAligner
} from '../../scripts/lib/ocr-bbox-aligner.mjs';

import {
  CANONICAL_UI_TAXONOMY,
  CANONICAL_EDGE_RELATIONSHIPS,
  CyclicSceneGraphError,
  kahnTopologicalSort,
  computeGraphDigest,
  synthesizeSceneGraph,
  validateSceneGraph
} from '../../scripts/lib/ui-scene-graph.mjs';

// M3 Imports
import {
  ALL_12_PERSONAS,
  TERMINAL_OUTCOMES,
  buildPersonaTrajectory
} from '../../scripts/lib/persona-trajectory-builder.mjs';

import {
  CANONICAL_DARK_PATTERNS,
  DEFERRAL_REASONS,
  isLuhnValid,
  sanitizePii,
  buildAdversarialScenario
} from '../../scripts/lib/dark-pattern-curriculum.mjs';

describe('Milestone 7 Tier 5 White-Box Coverage Adversarial Battery', () => {

  // ══════════════════════════════════════════════════════════════════════════════
  // SECTION 1: MILESTONE 1 — FSM STATE TRANSITIONS & DOUBT ROUTER (G-UX-002)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 1: FSM Illegal Transitions & Doubt Router Boundary Conditions (G-UX-002)', () => {

    it('Probe 1.1: transitions out of terminal states are strictly rejected fail-closed', () => {
      for (const terminal of TERMINAL_STATES) {
        const fsm = new UxDecisionLifecycleEngine(terminal);
        assert.equal(fsm.isTerminal(), true);

        const illegalEvents = ['input_received', 'scene_graph_synthesized', 'a11y_evaluated', 'proposals_gathered', 'autonomy_authorized'];
        for (const evt of illegalEvents) {
          assert.throws(
            () => fsm.transition(evt, { test: true }),
            (err) => {
              assert.ok(err instanceof InvalidStateTransitionError);
              assert.match(err.message, /Cannot transition out of terminal state/);
              return true;
            },
            `Expected terminal state ${terminal} to reject event ${evt}`
          );
        }
      }
    });

    it('Probe 1.2: illegal event dispatches from intermediate states throw InvalidStateTransitionError', () => {
      const fsm = new UxDecisionLifecycleEngine('OBSERVE');
      // Dispatching an event valid in CRITIQUE_WCAG while in OBSERVE
      assert.throws(
        () => fsm.transition('wcag_hard_fail', { wcagHardFail: true }),
        (err) => {
          assert.ok(err instanceof InvalidStateTransitionError);
          assert.match(err.message, /Event 'wcag_hard_fail' is not recognized from current state 'OBSERVE'/);
          return true;
        }
      );
    });

    it('Probe 1.3: transition guard failure from OBSERVE throws InvalidStateTransitionError', () => {
      const fsm = new UxDecisionLifecycleEngine('OBSERVE');
      // input_received requires hasArtifacts, imageBuffer, or sceneData
      assert.throws(
        () => fsm.transition('input_received', {}),
        (err) => {
          assert.ok(err instanceof InvalidStateTransitionError);
          assert.match(err.message, /Guard condition failed/);
          return true;
        }
      );
      assert.equal(fsm.getState(), 'OBSERVE'); // State preserved
    });

    it('Probe 1.4: constructor rejects uncanonical initial state', () => {
      assert.throws(
        () => new UxDecisionLifecycleEngine('UNAUTHORIZED_STATE'),
        /Invalid initial state: "UNAUTHORIZED_STATE"/
      );
    });

    it('Probe 1.5: Doubt Router strictly evaluates confidence boundary threshold (c < 0.7500 -> DEFER)', () => {
      // Just below threshold
      const belowBoundary = routeDoubt({
        confidence: 0.749999,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.equal(belowBoundary.route, 'DEFER');
      assert.equal(belowBoundary.authorized, false);
      assert.match(belowBoundary.reason, /is below strict threshold/);

      // Exactly at threshold
      const atBoundary = routeDoubt({
        confidence: 0.750000,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.equal(atBoundary.route, 'EMIT_DECISION');
      assert.equal(atBoundary.authorized, true);

      // Above threshold
      const aboveBoundary = routeDoubt({
        confidence: 0.950000,
        confidence_calibrated: true,
        risk_level: 'medium',
        evidence_verified: true,
        veto_asserted: false
      });
      assert.equal(aboveBoundary.route, 'EMIT_DECISION');
      assert.equal(aboveBoundary.authorized, true);
    });

    it('Probe 1.6: Doubt Router routes uncalibrated, unverified, or high-risk proposals to DEFER', () => {
      // High confidence (0.99) but uncalibrated
      const uncalibrated = routeDoubt({
        confidence: 0.99,
        confidence_calibrated: false,
        risk_level: 'low',
        evidence_verified: true
      });
      assert.equal(uncalibrated.route, 'DEFER');
      assert.match(uncalibrated.reason, /not calibrated/);

      // High confidence (0.99) but unverified evidence
      const unverified = routeDoubt({
        confidence: 0.99,
        confidence_calibrated: true,
        risk_level: 'low',
        evidence_verified: false
      });
      assert.equal(unverified.route, 'DEFER');
      assert.match(unverified.reason, /not been physically verified/);

      // High confidence (0.99) with critical operational risk
      const highRisk = routeDoubt({
        confidence: 0.99,
        confidence_calibrated: true,
        risk_level: 'critical',
        evidence_verified: true
      });
      assert.equal(highRisk.route, 'DEFER');
      assert.match(highRisk.reason, /mandates human review/);
    });

    it('Probe 1.7: Doubt Router rejects invalid or non-finite confidence values fail-closed', () => {
      const invalidConfidences = [NaN, Infinity, -Infinity, -0.01, 1.01, '0.85', null, undefined];
      for (const conf of invalidConfidences) {
        const res = routeDoubt({
          confidence: conf,
          confidence_calibrated: true,
          risk_level: 'low',
          evidence_verified: true
        });
        assert.equal(res.route, 'DEFER');
        assert.equal(res.authorized, false);
      }
    });

    it('Probe 1.8: Doubt Router routes dark pattern, WCAG hard fail, or veto immediately to REJECT_AS_UNSAFE', () => {
      const darkPattern = routeDoubt({
        confidence: 0.99,
        confidence_calibrated: true,
        dark_pattern_detected: true
      });
      assert.equal(darkPattern.route, 'REJECT_AS_UNSAFE');
      assert.equal(darkPattern.authorized, false);

      const wcagFail = routeDoubt({
        confidence: 0.99,
        confidence_calibrated: true,
        wcag_hard_fail: true
      });
      assert.equal(wcagFail.route, 'REJECT_AS_UNSAFE');
      assert.equal(wcagFail.authorized, false);

      const vetoAsserted = routeDoubt({
        confidence: 0.99,
        confidence_calibrated: true,
        veto_asserted: true
      });
      assert.equal(vetoAsserted.route, 'REJECT_AS_UNSAFE');
      assert.equal(vetoAsserted.authorized, false);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SECTION 2: MILESTONE 1 — 12-PERSONA REGISTRY & VETO ENFORCEMENT (G-UX-003)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 2: 12-Persona Registry Contracts & Veto Enforcement (G-UX-003)', () => {
    const registry = new UxPersonaRegistry();

    it('Probe 2.1: registry contains exactly 12 canonical personas across 4 priority tiers', () => {
      const personas = registry.listPersonas();
      assert.equal(personas.length, 12);

      const tier1 = registry.getPersonasByTier(PERSONA_TIERS.TIER_1_ETHICS);
      const tier2 = registry.getPersonasByTier(PERSONA_TIERS.TIER_2_INCLUSION);
      const tier3 = registry.getPersonasByTier(PERSONA_TIERS.TIER_3_FOUNDATIONS);
      const tier4 = registry.getPersonasByTier(PERSONA_TIERS.TIER_4_POLISH);

      assert.equal(tier1.length, 1);
      assert.equal(tier2.length, 3);
      assert.equal(tier3.length, 5);
      assert.equal(tier4.length, 3);
    });

    it('Probe 2.2: querying non-existent persona throws PersonaContractError', () => {
      assert.throws(
        () => registry.getPersona('unknown_rogue_persona'),
        (err) => {
          assert.ok(err instanceof PersonaContractError);
          assert.match(err.message, /Unrecognized persona 'unknown_rogue_persona'/);
          return true;
        }
      );
    });

    it('Probe 2.3: Dark-Pattern Watchdog asserts Tier 1 Veto across all 14 taxonomy deceptive patterns', () => {
      for (const pattern of DARK_PATTERNS_TAXONOMY) {
        const evalResult = registry.evaluateProposal('dark_pattern_ethics_watchdog', {
          mechanics: { [pattern]: true }
        });
        assert.equal(evalResult.approved, false, `Pattern ${pattern} should be rejected`);
        assert.equal(evalResult.veto_asserted, true);
        assert.equal(evalResult.tier, PERSONA_TIERS.TIER_1_ETHICS);
        assert.ok(evalResult.dark_patterns_found.includes(pattern));
      }
    });

    it('Probe 2.4: Dark-Pattern Watchdog intercepts confirmshaming copy and drops ethical score', () => {
      const evalResult = registry.evaluateProposal('dark_pattern_ethics_watchdog', {
        copy: 'Click here to continue, or click "No thanks, I hate saving money" to decline.'
      });
      assert.equal(evalResult.approved, false);
      assert.equal(evalResult.veto_asserted, true);
      assert.ok(evalResult.dark_patterns_found.includes('confirmshaming'));
      assert.ok(evalResult.ethical_score < 1.0);
    });

    it('Probe 2.5: Accessibility Auditor asserts Tier 2 Veto on contrast failures and keyboard traps', () => {
      // Normal text contrast 5.5:1 fails 7.0:1 requirement
      const lowContrast = registry.evaluateProposal('accessibility_auditor', {
        contrast_ratio: 5.5,
        is_large_text: false
      });
      assert.equal(lowContrast.approved, false);
      assert.equal(lowContrast.veto_asserted, true);
      assert.equal(lowContrast.wcag_aaa_compliant, false);

      // Keyboard trap
      const keyboardTrap = registry.evaluateProposal('accessibility_auditor', {
        contrast_ratio: 8.0,
        has_keyboard_trap: true
      });
      assert.equal(keyboardTrap.approved, false);
      assert.equal(keyboardTrap.veto_asserted, true);

      // Touch target < 24px
      const tinyTarget = registry.evaluateProposal('accessibility_auditor', {
        contrast_ratio: 8.0,
        touch_target_px: 18
      });
      assert.equal(tinyTarget.approved, false);
      assert.equal(tinyTarget.veto_asserted, true);
    });

    it('Probe 2.6: evaluateAll aggregates multi-persona evaluations and correctly flags Tier 1 and Tier 2 vetos', () => {
      const proposals = [
        { persona: 'dark_pattern_ethics_watchdog', copy: 'No, I prefer paying full price' },
        { persona: 'accessibility_auditor', contrast_ratio: 3.5 },
        { persona: 'design_systems_lead', design_token_bound: true }
      ];

      const aggregate = registry.evaluateAll(proposals);
      assert.equal(aggregate.allApproved, false);
      assert.equal(aggregate.hasTier1Veto, true);
      assert.equal(aggregate.hasTier2Veto, true);
      assert.equal(aggregate.vetoReasons.length, 2);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SECTION 3: MILESTONE 1 — MULTI-PERSONA CONFLICT RESOLUTION (G-UX-004)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 3: Multi-Persona Conflict Precedence & Deadlock Resolution (G-UX-004)', () => {
    const synthesizer = new UxConflictSynthesizer();

    it('Probe 3.1: strict monotonic cross-tier hierarchy overrides lower tiers without deadlock', () => {
      const pTier1 = normalizeUxProposal({
        persona: 'dark_pattern_ethics_watchdog',
        property: 'button_visibility',
        proposed_value: 'visible',
        tier: 1
      });

      const pTier4 = normalizeUxProposal({
        persona: 'color_contrast_specialist',
        property: 'button_visibility',
        proposed_value: 'dimmed',
        tier: 4
      });

      const collision = {
        proposal_a: pTier1,
        proposal_b: pTier4
      };

      const res = synthesizer.resolvePair(collision);
      assert.equal(res.resolved, true);
      assert.equal(res.deadlock, false);
      assert.equal(res.winner.persona, 'dark_pattern_ethics_watchdog');
      assert.equal(res.loser.persona, 'color_contrast_specialist');
      assert.match(res.rationale, /Tier 1 .* overrides Tier 4/);
    });

    it('Probe 3.2: intra-tier MIN numeric constraints select the stricter (larger) bound', () => {
      const p1 = normalizeUxProposal({
        persona: 'accessibility_auditor',
        property: 'min_contrast_ratio',
        proposed_value: 7.0,
        constraint_type: 'MIN',
        tier: 2
      });

      const p2 = normalizeUxProposal({
        persona: 'i18n_multilocale_stylist',
        property: 'min_contrast_ratio',
        proposed_value: 4.5,
        constraint_type: 'MIN',
        tier: 2
      });

      const collision = { proposal_a: p1, proposal_b: p2 };
      const res = synthesizer.resolvePair(collision);
      assert.equal(res.resolved, true);
      assert.equal(res.winner.proposed_value, 7.0);
      assert.match(res.rationale, /Stricter MIN bound 7 overrides 4.5/);
    });

    it('Probe 3.3: intra-tier MAX numeric constraints select the stricter (smaller) bound', () => {
      const p1 = normalizeUxProposal({
        persona: 'design_systems_lead',
        property: 'max_animation_ms',
        proposed_value: 300,
        constraint_type: 'MAX',
        tier: 3
      });

      const p2 = normalizeUxProposal({
        persona: 'interaction_choreographer',
        property: 'max_animation_ms',
        proposed_value: 150,
        constraint_type: 'MAX',
        tier: 3
      });

      const collision = { proposal_a: p1, proposal_b: p2 };
      const res = synthesizer.resolvePair(collision);
      assert.equal(res.resolved, true);
      assert.equal(res.winner.proposed_value, 150);
      assert.match(res.rationale, /Stricter MAX bound 150 overrides 300/);
    });

    it('Probe 3.4: intra-tier priority scores break ties deterministically', () => {
      // Tier 3: design_systems_lead (score 700) vs typography_scale_architect (score 550)
      const pLead = normalizeUxProposal({
        persona: 'design_systems_lead',
        property: 'container_padding',
        proposed_value: '24px'
      });
      const pTypo = normalizeUxProposal({
        persona: 'typography_scale_architect',
        property: 'container_padding',
        proposed_value: '16px'
      });

      const collision = { proposal_a: pLead, proposal_b: pTypo };
      const res = synthesizer.resolvePair(collision);
      assert.equal(res.resolved, true);
      assert.equal(res.winner.persona, 'design_systems_lead');
      assert.equal(res.loser.persona, 'typography_scale_architect');
    });

    it('Probe 3.5: equal tier and equal priority score with conflicting values escalates to deadlock', () => {
      const pA = normalizeUxProposal({
        persona: 'persona_mock_a',
        property: 'layout_grid',
        proposed_value: 'flex',
        tier: 3,
        priority_score: 500
      });
      const pB = normalizeUxProposal({
        persona: 'persona_mock_b',
        property: 'layout_grid',
        proposed_value: 'grid',
        tier: 3,
        priority_score: 500
      });

      const collision = { proposal_a: pA, proposal_b: pB };
      const res = synthesizer.resolvePair(collision);
      assert.equal(res.resolved, false);
      assert.equal(res.deadlock, true);
      assert.match(res.rationale, /Equal-tier deadlock in Tier 3/);

      // Verify Deadlock Escalator formatting
      const packet = UxDeadlockEscalator.formatReviewPacket({ collision, tier: 3 });
      assert.equal(packet.status, 'DEADLOCK_ESCALATED');
      assert.equal(packet.options.length, 3);
      assert.equal(packet.recommended_action.action, 'FAIL_SAFE_CONSERVATIVE_HOLD');
    });

    it('Probe 3.6: higher-tier proposal with force_escalate mandates deadlock escalation', () => {
      const pTier1Escalate = normalizeUxProposal({
        persona: 'dark_pattern_ethics_watchdog',
        property: 'checkout_step',
        proposed_value: 'single_page',
        tier: 1,
        force_escalate: true
      });
      const pTier2 = normalizeUxProposal({
        persona: 'accessibility_auditor',
        property: 'checkout_step',
        proposed_value: 'multi_step',
        tier: 2
      });

      const collision = { proposal_a: pTier1Escalate, proposal_b: pTier2 };
      const res = synthesizer.resolvePair(collision);
      assert.equal(res.deadlock, true);
      assert.equal(res.resolved, false);
    });

    it('Probe 3.7: multi-collision synthesizer eliminates overridden proposals and filters inactive deadlocks', () => {
      const p1 = normalizeUxProposal({ persona: 'dark_pattern_ethics_watchdog', property: 'dialog_behavior', proposed_value: 'explicit_close', tier: 1 });
      const p2 = normalizeUxProposal({ persona: 'visual_balance_density', property: 'dialog_behavior', proposed_value: 'auto_dismiss', tier: 3 });
      const p3 = normalizeUxProposal({ persona: 'motion_haptics_engineer', property: 'dialog_behavior', proposed_value: 'fade_away', tier: 4 });

      const detector = new UxConflictDetector();
      const collisions = detector.detect([p1, p2, p3]);
      assert.equal(collisions.length, 3); // 3 pairs

      const synthesis = synthesizer.synthesize([p1, p2, p3], collisions);
      assert.equal(synthesis.resolvedProposals.length, 1);
      assert.equal(synthesis.resolvedProposals[0].persona, 'dark_pattern_ethics_watchdog');
      assert.equal(synthesis.overriddenProposals.length, 2);
      assert.equal(synthesis.deadlocks.length, 0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SECTION 4: MILESTONE 2 — GEMMA 4 VISION PERCEPTION ADAPTER (G-UX-005)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 4: Gemma 4 Vision Perception Adapter & Letterbox Bounds (G-UX-005)', () => {

    it('Probe 4.1: extreme aspect ratios preserve exact geometry and symmetrical letterbox padding', () => {
      // Ultra-wide banner: 3840 x 100 onto 448 x 448
      const wide = computeLetterboxGeometry(3840, 100, 448, 448);
      assert.equal(wide.scaled_width, 448);
      assert.equal(wide.pad_left, 0);
      assert.equal(wide.pad_right, 0);
      assert.equal(wide.pad_top + wide.scaled_height + wide.pad_bottom, 448);
      assert.equal(wide.padding_color, '#0f172a'); // Tailwind Slate-900

      // Ultra-tall mobile screenshot: 100 x 4000 onto 448 x 448
      const tall = computeLetterboxGeometry(100, 4000, 448, 448);
      assert.equal(tall.scaled_height, 448);
      assert.equal(tall.pad_top, 0);
      assert.equal(tall.pad_bottom, 0);
      assert.equal(tall.pad_left + tall.scaled_width + tall.pad_right, 448);
    });

    it('Probe 4.2: letterbox geometry throws TypeError on non-positive or non-finite inputs', () => {
      const invalidDims = [
        [0, 900, 448, 448],
        [1440, -10, 448, 448],
        [1440, 900, 0, 448],
        [1440, 900, 448, -100],
        [NaN, 900, 448, 448],
        [1440, Infinity, 448, 448]
      ];

      for (const [sw, sh, tw, th] of invalidDims) {
        assert.throws(
          () => computeLetterboxGeometry(sw, sh, tw, th),
          TypeError
        );
      }
    });

    it('Probe 4.3: dynamic tile generation produces valid grid and thumbnail tiles across canonical viewports', () => {
      // Desktop 1440x900 (3x2 grid = 6 tiles + 1 thumbnail = 7 tiles)
      const desktopTiles = computeDynamicTiles(1440, 900, 'desktop');
      assert.equal(desktopTiles.length, 7);
      assert.equal(desktopTiles.filter(t => t.tile_type === 'grid').length, 6);
      assert.equal(desktopTiles.filter(t => t.tile_type === 'thumbnail').length, 1);

      // Mobile 390x844 (1x2 grid = 2 tiles + 1 thumbnail = 3 tiles)
      const mobileTiles = computeDynamicTiles(390, 844, 'mobile');
      assert.equal(mobileTiles.length, 3);
      assert.equal(mobileTiles.filter(t => t.tile_type === 'grid').length, 2);
    });

    it('Probe 4.4: token budget strictly bounds visual token consumption below 15% context window', () => {
      // 7 tiles = 1,792 tokens in 16,384 context
      const budget7 = computeTokenBudget(7, 256, 16384, 15.0);
      assert.equal(budget7.visual_tokens, 1792);
      assert.equal(budget7.token_budget_percentage, 10.9375);
      assert.equal(budget7.within_budget, true);

      // Exceeding budget: 12 tiles = 3,072 tokens (> 1,792 limit and > 15%)
      const budget12 = computeTokenBudget(12, 256, 16384, 15.0);
      assert.equal(budget12.within_budget, false);
    });

    it('Probe 4.5: 2-layer GELU MLP projector rejects invalid vector dimensions and produces normalized 4096-dim float embeddings', () => {
      // Invalid input dimension
      const invalidVec = new Float32Array(512);
      assert.throws(
        () => projectVisionEmbedding(invalidVec),
        /Invalid vision vector dimension: got 512, expected 1152/
      );

      // Valid input vector of dimension 1152
      const validVec = new Float32Array(1152);
      for (let i = 0; i < 1152; i++) validVec[i] = Math.sin(i * 0.1);

      const projected = projectVisionEmbedding(validVec);
      assert.equal(projected.length, 4096);

      // LayerNorm invariant: mean ~ 0, variance ~ 1
      let sum = 0;
      for (let i = 0; i < projected.length; i++) sum += projected[i];
      const mean = sum / projected.length;
      assert.ok(Math.abs(mean) < 1e-4, `Expected mean near 0, got ${mean}`);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SECTION 5: MILESTONE 2 — COORDINATE NORMALIZATION & OCR ALIGNER (G-UX-006)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 5: Coordinate Normalization, IoU & OCR Text Fusion (G-UX-006)', () => {
    const aligner = new OCRBoundingBoxAligner();

    it('Probe 5.1: extreme coordinate clamping guarantees [0, 1000] boundaries', () => {
      // Negative coordinates
      const neg = aligner.normalize({ x: -100, y: -50, w: 200, h: 300 }, 1440, 900);
      assert.ok(neg.x >= 0);
      assert.ok(neg.y >= 0);

      // Oversized coordinates exceeding viewport
      const over = aligner.normalize({ x: 1200, y: 700, w: 600, h: 500 }, 1440, 900);
      assert.ok(over.x + over.w <= 1000, `Expected x+w <= 1000, got ${over.x + over.w}`);
      assert.ok(over.y + over.h <= 1000, `Expected y+h <= 1000, got ${over.y + over.h}`);
    });

    it('Probe 5.2: zero-area or inverted boxes return IoU = 0.0 and enclosure = 0.0 without divide-by-zero', () => {
      const zeroBox = { x: 100, y: 100, w: 0, h: 50 };
      const normalBox = { x: 100, y: 100, w: 100, h: 100 };

      assert.equal(calculateIoU(zeroBox, normalBox), 0.0);
      assert.equal(calculateEnclosure(zeroBox, normalBox), 0.0);
    });

    it('Probe 5.3: pairwise IoU exact match threshold (IoU >= 0.90) vs enclosure child', () => {
      const boxA = { x: 100, y: 100, w: 200, h: 100 };
      // Identical box -> IoU = 1.0
      assert.equal(calculateIoU(boxA, boxA), 1.0);

      // Box slightly offset: IoU ~ 0.90
      const boxNear = { x: 105, y: 100, w: 200, h: 100 };
      const iou = calculateIoU(boxA, boxNear);
      assert.ok(iou >= 0.90 && iou < 1.0);

      // Enclosed child: inner box completely inside boxA
      const inner = { x: 120, y: 110, w: 50, h: 30 };
      assert.equal(calculateEnclosure(inner, boxA), 1.0);
    });

    it('Probe 5.4: sub-pixel floating-point bounding boxes normalize and denormalize within integer tolerance', () => {
      const raw = { x: 144.456, y: 90.789, w: 288.123, h: 180.654 };
      const norm = aligner.normalize(raw, 1440, 900);
      assert.equal(norm.x, 100);
      assert.equal(norm.y, 101);
      assert.equal(norm.w, 200);
      assert.equal(norm.h, 201);

      const denorm = aligner.denormalize(norm, 1440, 900);
      assert.ok(Math.abs(denorm.x - raw.x) <= 2);
      assert.ok(Math.abs(denorm.y - raw.y) <= 2);
    });

    it('Probe 5.5: OCR text fusion sorts enclosed child tokens in natural reading order (y -> x)', () => {
      const visualNodes = [
        { node_id: 'btn_confirm', component_type: 'PrimaryButton', bbox: { x: 100, y: 100, w: 300, h: 100 } }
      ];

      // Two OCR boxes inside the button, out of reading order (Word 2 first in y)
      const ocrBoxes = [
        { text: 'Order', confidence: 0.95, bbox: { x: 220, y: 140, w: 80, h: 30 } },
        { text: 'Confirm', confidence: 0.98, bbox: { x: 120, y: 130, w: 90, h: 30 } }
      ];

      const fused = aligner.fuseOcrWithVisualNodes(visualNodes, ocrBoxes, 1440, 900);
      assert.equal(fused.length, 1);
      assert.equal(fused[0].fusion_type, 'enclosed_child');
      assert.equal(fused[0].text_content, 'Confirm Order'); // Sorted reading order!
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SECTION 6: MILESTONE 2 — UI SCENE GRAPH DAG & TOPOLOGICAL SORT (G-UX-007)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 6: UI Scene Graph DAG & Kahn\'s Topological Sort (G-UX-007)', () => {

    it('Probe 6.1: simple 2-node cycle (A -> B -> A) throws CyclicSceneGraphError', () => {
      const nodesDict = {
        node_a: { z_index: 0, bbox_normalized: [0, 0, 100, 100] },
        node_b: { z_index: 0, bbox_normalized: [0, 0, 100, 100] }
      };
      const cyclicEdges = [
        { source: 'node_a', target: 'node_b', relationship: 'parent_child' },
        { source: 'node_b', target: 'node_a', relationship: 'parent_child' }
      ];

      assert.throws(
        () => kahnTopologicalSort(nodesDict, cyclicEdges),
        (err) => {
          assert.ok(err instanceof CyclicSceneGraphError);
          assert.match(err.message, /Cycle detected in UI Scene Graph DAG/);
          return true;
        }
      );
    });

    it('Probe 6.2: 3-node cycle (A -> B -> C -> A) throws CyclicSceneGraphError', () => {
      const nodesDict = {
        node_a: { z_index: 0, bbox_normalized: [0, 0, 100, 100] },
        node_b: { z_index: 0, bbox_normalized: [0, 0, 100, 100] },
        node_c: { z_index: 0, bbox_normalized: [0, 0, 100, 100] }
      };
      const cyclicEdges = [
        { source: 'node_a', target: 'node_b', relationship: 'parent_child' },
        { source: 'node_b', target: 'node_c', relationship: 'parent_child' },
        { source: 'node_c', target: 'node_a', relationship: 'parent_child' }
      ];

      assert.throws(
        () => kahnTopologicalSort(nodesDict, cyclicEdges),
        CyclicSceneGraphError
      );
    });

    it('Probe 6.3: disconnected subgraph with isolated cycle is caught and unvisited nodes identified', () => {
      const nodesDict = {
        // Valid component
        root: { z_index: 0, bbox_normalized: [0, 0, 1000, 1000] },
        child_1: { z_index: 10, bbox_normalized: [100, 100, 200, 200] },
        // Disconnected cyclic component
        isolated_x: { z_index: 50, bbox_normalized: [500, 500, 100, 100] },
        isolated_y: { z_index: 50, bbox_normalized: [600, 600, 100, 100] }
      };

      const edges = [
        { source: 'root', target: 'child_1', relationship: 'parent_child' },
        { source: 'isolated_x', target: 'isolated_y', relationship: 'parent_child' },
        { source: 'isolated_y', target: 'isolated_x', relationship: 'parent_child' }
      ];

      assert.throws(
        () => kahnTopologicalSort(nodesDict, edges),
        (err) => {
          assert.ok(err instanceof CyclicSceneGraphError);
          assert.ok(err.cycleNodes.includes('isolated_x'));
          assert.ok(err.cycleNodes.includes('isolated_y'));
          assert.ok(!err.cycleNodes.includes('root')); // Root was visited
          return true;
        }
      );
    });

    it('Probe 6.4: self-loop edge (A -> A) throws CyclicSceneGraphError', () => {
      const nodesDict = {
        node_a: { z_index: 0, bbox_normalized: [0, 0, 100, 100] }
      };
      const selfLoop = [
        { source: 'node_a', target: 'node_a', relationship: 'parent_child' }
      ];

      assert.throws(
        () => kahnTopologicalSort(nodesDict, selfLoop),
        CyclicSceneGraphError
      );
    });

    it('Probe 6.5: bidirectional sibling edges are non-hierarchical and permitted without cyclic errors', () => {
      const nodesDict = {
        node_1: { z_index: 10, bbox_normalized: [100, 100, 100, 50] },
        node_2: { z_index: 10, bbox_normalized: [220, 100, 100, 50] }
      };
      // Sibling edges in both directions
      const siblingEdges = [
        { source: 'node_1', target: 'node_2', relationship: 'sibling' },
        { source: 'node_2', target: 'node_1', relationship: 'sibling' }
      ];

      const order = kahnTopologicalSort(nodesDict, siblingEdges);
      assert.equal(order.length, 2);
    });

    it('Probe 6.6: valid UI scene graph DAG synthesizes deterministic SHA-256 digest', () => {
      const visualNodes = [
        { node_id: 'node_root', component_type: 'ScreenRoot', bbox: [0, 0, 1440, 900], bbox_normalized: { x: 0, y: 0, w: 1000, h: 1000 }, z_index: 0 },
        { node_id: 'card_main', component_type: 'CardContainer', bbox: [144, 90, 576, 270], bbox_normalized: { x: 100, y: 100, w: 400, h: 300 }, z_index: 10 },
        { node_id: 'btn_action', component_type: 'PrimaryButton', bbox: [216, 180, 216, 40], bbox_normalized: { x: 150, y: 200, w: 150, h: 44 }, z_index: 20 }
      ];

      const graph = synthesizeSceneGraph(visualNodes, { graph_id: 'SG-0001-999' });
      assert.equal(graph.graph_id, 'SG-0001-999');
      assert.equal(graph.topological_order.length, 3);
      assert.match(graph.sha256_digest, /^[0-9a-f]{64}$/);
      assert.equal(validateSceneGraph(graph).valid, true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SECTION 7: MILESTONE 3 — 12-PERSONA MULTI-AGENT TRAJECTORIES (G-UX-012)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 7: Stage 4 Multi-Agent Persona Trajectories (G-UX-012)', () => {

    it('Probe 7.1: generated trajectory strictly enforces <= 3,000 token budget ceiling', () => {
      for (let i = 0; i < 50; i++) {
        const traj = buildPersonaTrajectory(i);
        assert.ok(
          traj.tokens_consumed <= 3000,
          `Trajectory ${traj.trajectory_id} exceeded token ceiling: ${traj.tokens_consumed}`
        );
        assert.equal(traj.max_token_budget, 3000);
      }
    });

    it('Probe 7.2: all 12 canonical personas participate across deterministic trajectory batches', () => {
      const seenPersonas = new Set();
      for (let i = 0; i < 24; i++) {
        const traj = buildPersonaTrajectory(i);
        for (const p of traj.participating_personas) {
          seenPersonas.add(p);
        }
      }
      assert.equal(seenPersonas.size, 12);
      for (const p of ALL_12_PERSONAS) {
        assert.ok(seenPersonas.has(p), `Expected persona ${p} to be present in curriculum`);
      }
    });

    it('Probe 7.3: REJECT_AS_UNSAFE trajectories enforce mandatory Tier 1 Watchdog participation', () => {
      for (let i = 0; i < 100; i++) {
        const traj = buildPersonaTrajectory(i);
        if (traj.final_state === 'REJECT_AS_UNSAFE') {
          assert.ok(traj.participating_personas.includes('dark_pattern_ethics_watchdog'));
          assert.ok(traj.participating_personas.includes('visual_balance_density'));
          assert.ok(traj.collisions.length > 0);
          assert.match(traj.resolution_rationale, /Tier 1 Ethics .* takes absolute precedence/);
        }
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SECTION 8: MILESTONE 3 — STAGE 6 ADVERSARIAL PII & DEFERRAL CURRICULUM (G-UX-014)
  // ══════════════════════════════════════════════════════════════════════════════
  describe('Suite 8: Stage 6 Adversarial Dark Patterns, Deferrals & PII Scrubbing (G-UX-014)', () => {

    it('Probe 8.1: regex PII sanitizer detects and redacts AWS access keys', () => {
      const raw = 'Deploying with AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE to S3 bucket';
      const { sanitized, detections } = sanitizePii(raw);
      assert.equal(sanitized, 'Deploying with AWS_ACCESS_KEY_ID=[REDACTED_AWS_KEY] to S3 bucket');
      assert.equal(detections.api_keys, 1);
    });

    it('Probe 8.2: regex PII sanitizer detects and redacts GitHub personal access tokens', () => {
      const raw = 'Git clone https://ghp_1234567890abcdefghijklmnopqrstuvwxyz12@github.com/repo.git';
      const { sanitized, detections } = sanitizePii(raw);
      assert.equal(sanitized, 'Git clone https://[REDACTED_GITHUB_TOKEN]@github.com/repo.git');
      assert.equal(detections.api_keys, 1);
    });

    it('Probe 8.3: regex PII sanitizer detects and redacts OpenAI API keys', () => {
      const raw = 'Configuring OPENAI_API_KEY=sk-proj1234567890abcdefghijklmnopqrst in environment';
      const { sanitized, detections } = sanitizePii(raw);
      assert.equal(sanitized, 'Configuring OPENAI_API_KEY=[REDACTED_OPENAI_KEY] in environment');
      assert.equal(detections.api_keys, 1);
    });

    it('Probe 8.4: regex PII sanitizer detects and redacts JWT bearer tokens', () => {
      const raw = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const { sanitized, detections } = sanitizePii(raw);
      assert.equal(sanitized, 'Authorization: Bearer [REDACTED_JWT]');
      assert.equal(detections.api_keys, 1);
    });

    it('Probe 8.5: credit card numbers with valid Luhn checksums are redacted, while invalid sequences are preserved', () => {
      // Valid Visa card: 4532 0150 0000 0007
      assert.equal(isLuhnValid('4532015000000007'), true);
      const validCardText = 'Payment processed for card 4532-0150-0000-0007 successfully';
      const resValid = sanitizePii(validCardText);
      assert.equal(resValid.sanitized, 'Payment processed for card [REDACTED_CREDIT_CARD] successfully');
      assert.equal(resValid.detections.credit_cards, 1);

      // Invalid number sequence (fails Luhn)
      assert.equal(isLuhnValid('4532015000000008'), false);
      const invalidCardText = 'Random serial 4532-0150-0000-0008 in log';
      const resInvalid = sanitizePii(invalidCardText);
      assert.equal(resInvalid.sanitized, invalidCardText); // Not redacted!
      assert.equal(resInvalid.detections.credit_cards, 0);
    });

    it('Probe 8.6: US SSNs and phone numbers are scrubbed cleanly', () => {
      const raw = 'User profile: SSN 123-45-6789, Phone (555) 123-4567, Email user.name@test.org';
      const { sanitized, detections } = sanitizePii(raw);
      assert.equal(sanitized, 'User profile: SSN [REDACTED_SSN], Phone [REDACTED_PHONE], Email [REDACTED_EMAIL]');
      assert.equal(detections.ssn, 1);
      assert.equal(detections.phones, 1);
      assert.equal(detections.emails, 1);
    });

    it('Probe 8.7: non-string input edge cases return safe empty detections without throwing', () => {
      assert.deepEqual(sanitizePii(null), { sanitized: '', detections: {} });
      assert.deepEqual(sanitizePii(undefined), { sanitized: '', detections: {} });
      assert.deepEqual(sanitizePii(12345), { sanitized: '', detections: {} });
    });

    it('Probe 8.8: 800 redteam scenarios partition into exactly 400 dark patterns and 400 deferrals', () => {
      let darkCount = 0;
      let deferCount = 0;

      for (let i = 0; i < 800; i++) {
        const scenario = buildAdversarialScenario(i);
        if (scenario.target_outcome === 'REJECT_AS_UNSAFE') {
          darkCount++;
          assert.equal(scenario.adversarial_type, 'dark_pattern');
          assert.ok(CANONICAL_DARK_PATTERNS.includes(scenario.dark_pattern_category));
        } else if (scenario.target_outcome === 'DEFER') {
          deferCount++;
          assert.equal(scenario.adversarial_type, 'justified_deferral');
          assert.ok(DEFERRAL_REASONS.includes(scenario.deferral_category));
        }
      }

      assert.equal(darkCount, 400);
      assert.equal(deferCount, 400);
    });
  });
});
