import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  UX_PERSONA_TIERS,
  UX_PERSONA_PRIORITY_SCORES,
  UX_SEMANTIC_PROPERTY_PAIRS,
  resolveUxConflicts,
  detectUxConflicts,
  formatUxReviewPacket,
  UxConflictResolver,
  UxConflictDetector,
  UxConflictSynthesizer,
  UxDeadlockEscalator
} from '../../scripts/lib/ux-conflict-resolver.mjs';
import {
  UxPersonaRegistry,
  PERSONA_TIERS,
  DARK_PATTERNS_TAXONOMY
} from '../../scripts/lib/ux-persona-registry.mjs';
import {
  UxDecisionLifecycleEngine,
  routeDoubt
} from '../../scripts/lib/ux-decision-lifecycle.mjs';
import {
  createDefaultUxDecision,
  validateUxDecisionContract
} from '../../scripts/lib/ux-decision-contract.mjs';

describe('Adversarial Stress Test Suite: UX Conflict Resolver & Veto Engine (M1)', () => {
  const registry = new UxPersonaRegistry();

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: VETO INVARIANCE & HIERARCHY DEFENSE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Veto Invariance & Precedence Hierarchy Stress Testing', () => {
    it('1.1 should uphold Tier 1 precedence against extreme Tier 4 confidence (1.0 vs 0.1)', () => {
      const proposals = [
        {
          persona: 'dark_pattern_ethics_watchdog',
          property: 'opt_in_mode',
          value: 'explicit_opt_in',
          confidence: 0.10,
          priority_score: 1000
        },
        {
          persona: 'motion_haptics_engineer',
          property: 'opt_in_mode',
          value: 'pre_checked_recurring',
          confidence: 1.0,
          priority_score: 999999,
          constraint_type: 'EXACT'
        }
      ];

      const res = resolveUxConflicts(proposals);
      assert.strictEqual(res.status, 'RESOLVED');
      assert.strictEqual(res.resolved_proposals.length, 1);
      assert.strictEqual(res.resolved_proposals[0].persona, 'dark_pattern_ethics_watchdog');
      assert.strictEqual(res.overridden_proposals.length, 1);
      assert.strictEqual(res.overridden_proposals[0].proposal.persona, 'motion_haptics_engineer');
    });

    it('1.2 should uphold Tier 2 WCAG 2.2 AAA contrast veto against Tier 3/4 styling preferences', () => {
      const proposals = [
        {
          persona: 'color_contrast_specialist', // Tier 4
          property: 'contrast_ratio',
          value: 3.2,
          confidence: 0.99,
          rationale: 'Subtle pastel brand aesthetic'
        },
        {
          persona: 'design_systems_lead', // Tier 3
          property: 'contrast_ratio',
          value: 4.5,
          confidence: 0.95,
          rationale: 'Minimum AA contrast token'
        },
        {
          persona: 'accessibility_auditor', // Tier 2
          property: 'contrast_ratio',
          value: 7.0,
          confidence: 0.85,
          rationale: 'Mandatory WCAG 2.2 AAA 7.0:1 contrast for regular text'
        }
      ];

      const res = resolveUxConflicts(proposals);
      assert.strictEqual(res.status, 'RESOLVED');
      assert.strictEqual(res.resolved_proposals.length, 1);
      assert.strictEqual(res.resolved_proposals[0].persona, 'accessibility_auditor');
      assert.strictEqual(res.resolved_proposals[0].proposed_value, 7.0);
      assert.strictEqual(res.overridden_proposals.length, 2);
    });

    it('1.3 should enforce canonical hierarchy and reject spoofed tier/priority input', () => {
      // In normalizeUxProposal: canonical UX_PERSONA_TIERS takes precedence over caller-injected tier
      const spoofedProposals = [
        {
          persona: 'dark_pattern_ethics_watchdog', // Canonical Tier 1, Priority 1000
          property: 'opt_in_mode',
          value: 'explicit_opt_in'
        },
        {
          persona: 'motion_haptics_engineer', // Canonical Tier 4, Priority 350
          tier: 1, // SPOOFED TIER 1 - must be overridden by canonical tier
          priority_score: 1500, // SPOOFED HIGHER PRIORITY - must be overridden
          property: 'opt_in_mode',
          value: 'pre_checked_recurring'
        }
      ];

      const res = resolveUxConflicts(spoofedProposals);

      // Remediated: Canonical Tier 1 Ethics Watchdog overrides spoofed Tier 4 persona
      assert.strictEqual(res.resolved_proposals[0].persona, 'dark_pattern_ethics_watchdog',
        'Remediated: Canonical Tier 1 Ethics Watchdog wins despite spoofed tier/priority input');
      assert.strictEqual(res.overridden_proposals[0].proposal.persona, 'motion_haptics_engineer',
        'Remediated: Spoofed persona is overridden by canonical hierarchy');
    });

    it('1.4 should ensure lower-tier force_escalate cannot block unambiguous higher-tier winner', () => {
      // In resolvePair: higher-tier unambiguous precedence overrides lower-tier force_escalate
      const proposals = [
        {
          persona: 'dark_pattern_ethics_watchdog', // Tier 1
          property: 'button_label',
          value: 'Decline Offer'
        },
        {
          persona: 'microcopy_tone_specialist', // Tier 4
          property: 'button_label',
          value: 'No thanks, I hate saving money',
          force_escalate: true // Tier 4 tries to trigger deadlock
        }
      ];

      const res = resolveUxConflicts(proposals);
      assert.strictEqual(res.status, 'RESOLVED',
        'Remediated: Higher-tier winner overrides lower-tier force_escalate');
      assert.strictEqual(res.blocked_until_approved, false);
      assert.strictEqual(res.resolved_proposals.length, 1);
      assert.strictEqual(res.resolved_proposals[0].persona, 'dark_pattern_ethics_watchdog');
      assert.strictEqual(res.overridden_proposals.length, 1);
    });

    it('1.5 should verify routeDoubt unconditionally routes to REJECT_AS_UNSAFE when veto_asserted is true', () => {
      const candidates = [
        { veto_asserted: true, confidence: 1.0, confidence_calibrated: true, risk_level: 'low', evidence_verified: true },
        { dark_pattern_detected: true, confidence: 0.99, confidence_calibrated: true, risk_level: 'low', evidence_verified: true },
        { wcag_hard_fail: true, confidence: 0.95, confidence_calibrated: true, risk_level: 'low', evidence_verified: true }
      ];

      for (const cand of candidates) {
        const route = routeDoubt(cand);
        assert.strictEqual(route.route, 'REJECT_AS_UNSAFE');
        assert.strictEqual(route.authorized, false);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: COLLISION MATRIX FUZZING (1,584 COMBINATIONS)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Collision Matrix Fuzzing Battery', () => {
    it('2.1 should execute 1,584 pairwise combinations across all 12 personas and 12 semantic properties with 100% commutativity', () => {
      const personas = Object.keys(UX_PERSONA_TIERS);
      let totalCases = 0;
      let commutativityErrors = 0;
      let crashes = 0;

      for (const p1 of personas) {
        for (const p2 of personas) {
          if (p1 === p2) continue;
          for (const pair of UX_SEMANTIC_PROPERTY_PAIRS) {
            totalCases++;
            const propA = { persona: p1, property: pair.p1, value: `val_${p1}` };
            const propB = { persona: p2, property: pair.p2, value: `val_${p2}` };

            try {
              const resForward = resolveUxConflicts([propA, propB]);
              const resReverse = resolveUxConflicts([propB, propA]);

              // Check commutativity
              const winnerFwd = resForward.resolved_proposals.map(p => p.persona).sort().join(',');
              const winnerRev = resReverse.resolved_proposals.map(p => p.persona).sort().join(',');

              if (winnerFwd !== winnerRev || resForward.status !== resReverse.status) {
                commutativityErrors++;
              }
            } catch (err) {
              crashes++;
            }
          }
        }
      }

      assert.strictEqual(totalCases, 1584, 'Must execute exactly 12*11*12 = 1,584 fuzzing cases');
      assert.strictEqual(crashes, 0, 'Zero unhandled exceptions allowed during fuzzing');
      assert.strictEqual(commutativityErrors, 0, 'All 1,584 pairwise resolutions must be strictly commutative');
    });

    it('2.2 should resolve simultaneous 12-way clash to dark_pattern_ethics_watchdog', () => {
      const personas = Object.keys(UX_PERSONA_TIERS);
      const simultaneousProposals = personas.map((p, idx) => ({
        persona: p,
        property: 'primary_action_behavior',
        value: `behavior_${idx}`
      }));

      const res = resolveUxConflicts(simultaneousProposals);
      assert.strictEqual(res.status, 'RESOLVED');
      assert.strictEqual(res.resolved_proposals.length, 1);
      assert.strictEqual(res.resolved_proposals[0].persona, 'dark_pattern_ethics_watchdog');
      assert.strictEqual(res.overridden_proposals.length, 11);
      assert.strictEqual(res.blocked_until_approved, false);
      assert.strictEqual(res.consensus_score, 0.0833);
    });

    it('2.3 should resolve simultaneous 11-way clash (excluding Tier 1) to accessibility_auditor', () => {
      const personas = Object.keys(UX_PERSONA_TIERS).filter(p => p !== 'dark_pattern_ethics_watchdog');
      const simultaneousProposals = personas.map((p, idx) => ({
        persona: p,
        property: 'primary_action_behavior',
        value: `behavior_${idx}`
      }));

      const res = resolveUxConflicts(simultaneousProposals);
      assert.strictEqual(res.status, 'RESOLVED');
      assert.strictEqual(res.resolved_proposals.length, 1);
      assert.strictEqual(res.resolved_proposals[0].persona, 'accessibility_auditor');
      assert.strictEqual(res.overridden_proposals.length, 10);
    });

    it('2.4 should strictly respect numeric MIN constraints selecting strictest maximum value in intra-tier clashes', () => {
      const proposals = [
        { persona: 'accessibility_auditor', tier: 2, property: 'touch_target', value: 44, constraint_type: 'MIN' },
        { persona: 'i18n_multilocale_stylist', tier: 2, property: 'touch_target', value: 52, constraint_type: 'MIN' },
        { persona: 'ergonomics_cognitive_critic', tier: 2, property: 'touch_target', value: 48, constraint_type: 'MIN' }
      ];

      const res = resolveUxConflicts(proposals);
      assert.strictEqual(res.status, 'RESOLVED');
      assert.strictEqual(res.resolved_proposals.length, 1);
      assert.strictEqual(res.resolved_proposals[0].proposed_value, 52);
      assert.strictEqual(res.overridden_proposals.length, 2);
    });

    it('2.5 should strictly respect numeric MAX constraints selecting strictest minimum value in intra-tier clashes', () => {
      const proposals = [
        { persona: 'motion_haptics_engineer', tier: 4, property: 'duration', value: 300, constraint_type: 'MAX' },
        { persona: 'microcopy_tone_specialist', tier: 4, property: 'duration', value: 180, constraint_type: 'MAX' },
        { persona: 'color_contrast_specialist', tier: 4, property: 'duration', value: 250, constraint_type: 'MAX' }
      ];

      const res = resolveUxConflicts(proposals);
      assert.strictEqual(res.status, 'RESOLVED');
      assert.strictEqual(res.resolved_proposals.length, 1);
      assert.strictEqual(res.resolved_proposals[0].proposed_value, 180);
      assert.strictEqual(res.overridden_proposals.length, 2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: DEADLOCK ESCALATION & REVIEW PACKET INTEGRITY
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Deadlock Escalation & Review Packet Integrity', () => {
    it('3.1 should escalate equal-tier equal-score clash into DEADLOCK_ESCALATED with valid cryptographic SHA-256', () => {
      const deadlockProposals = [
        {
          persona: 'custom_agent_alpha',
          tier: 3,
          priority_score: 550,
          property: 'layout_grid_columns',
          value: 12,
          rationale: 'Standard 12-column responsive layout'
        },
        {
          persona: 'custom_agent_beta',
          tier: 3,
          priority_score: 550,
          property: 'layout_grid_columns',
          value: 16,
          rationale: 'High-density 16-column layout'
        }
      ];

      const res = resolveUxConflicts(deadlockProposals, { decision_id: 'UX-DEC-2026-999' });
      assert.strictEqual(res.status, 'DEADLOCK_ESCALATED');
      assert.strictEqual(res.blocked_until_approved, true);
      assert.strictEqual(res.deadlocks.length, 1);
      assert.ok(res.review_packet);

      const packet = res.review_packet;
      assert.strictEqual(packet.decision_id, 'UX-DEC-2026-999');
      assert.strictEqual(packet.status, 'DEADLOCK_ESCALATED');
      assert.strictEqual(packet.requires_human_signoff, true);
      assert.strictEqual(packet.options.length, 3);
      assert.strictEqual(packet.recommended_action.action, 'FAIL_SAFE_CONSERVATIVE_HOLD');

      // Validate cryptographic signature
      const { packet_sha256, ...payload } = packet;
      const expectedDigest = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      assert.strictEqual(packet_sha256, expectedDigest, 'Review packet SHA-256 digest must match payload bytes');
    });

    it('3.2 should prune phantom deadlocks between already-eliminated proposals', () => {
      // In synthesize: deadlocks where any participant was eliminated are pruned
      const proposals = [
        {
          persona: 'dark_pattern_ethics_watchdog', // Tier 1 (Winner)
          property: 'checkout_flow',
          value: 'transparent_breakdown'
        },
        {
          persona: 'custom_sub_agent_a', // Tier 3, Score 500 (Loser against Tier 1)
          tier: 3,
          priority_score: 500,
          property: 'checkout_flow',
          value: 'flow_type_a'
        },
        {
          persona: 'custom_sub_agent_b', // Tier 3, Score 500 (Loser against Tier 1)
          tier: 3,
          priority_score: 500,
          property: 'checkout_flow',
          value: 'flow_type_b'
        }
      ];

      const res = resolveUxConflicts(proposals);

      // Remediated: Tier 1 wins cleanly without phantom deadlocks from defeated proposals
      assert.strictEqual(res.status, 'RESOLVED',
        'Remediated: Deadlock between defeated proposals is pruned; status is RESOLVED');
      assert.strictEqual(res.blocked_until_approved, false,
        'Remediated: blocked_until_approved is false');
      assert.strictEqual(res.resolved_proposals.length, 1);
      assert.strictEqual(res.resolved_proposals[0].persona, 'dark_pattern_ethics_watchdog');
      assert.strictEqual(res.overridden_proposals.length, 2);
    });

    it('3.3 [DEFICIENCY REPRODUCTION] Multi-Deadlock Discard: Resolver only formats first deadlock into review packet', () => {
      const multiDeadlockProposals = [
        // Deadlock 1 on property_1
        { persona: 'agent_1a', tier: 3, priority_score: 500, property: 'prop_1', value: 'val1' },
        { persona: 'agent_1b', tier: 3, priority_score: 500, property: 'prop_1', value: 'val2' },
        // Deadlock 2 on property_2
        { persona: 'agent_2a', tier: 4, priority_score: 300, property: 'prop_2', value: 'valA' },
        { persona: 'agent_2b', tier: 4, priority_score: 300, property: 'prop_2', value: 'valB' }
      ];

      const res = resolveUxConflicts(multiDeadlockProposals);
      assert.strictEqual(res.deadlocks.length, 2, 'Two independent deadlocks detected');
      assert.strictEqual(res.review_packet.conflict_dimension, res.deadlocks[0].collision.category);
      // Demonstrates that deadlock 2 is omitted from the human review packet
      assert.ok(res.review_packet.options.every(opt => opt.label.includes('1a') || opt.label.includes('1b') || opt.requires_input),
        'DEFICIENCY CONFIRMED: Deadlock 2 (agent_2a vs agent_2b) is omitted from review packet options');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: DARK PATTERN INJECTION & DECEPTIVE DESIGN DEFENSE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Dark Pattern Injection & Deceptive Design Defense', () => {
    it('4.1 should verify watchdog correctly detects 5 hardcoded dark patterns', () => {
      const supportedTestCases = [
        {
          pattern: 'confirmshaming',
          proposal: { copy: 'No thanks, I hate saving money' },
          expectedFound: 'confirmshaming'
        },
        {
          pattern: 'sneak_into_basket',
          proposal: { mechanics: { pre_checked_recurring: true } },
          expectedFound: 'sneak_into_basket'
        },
        {
          pattern: 'fake_urgency',
          proposal: { mechanics: { fake_timer: true } },
          expectedFound: 'fake_urgency'
        },
        {
          pattern: 'roach_motel',
          proposal: { mechanics: { cancel_hidden: true } },
          expectedFound: 'roach_motel'
        },
        {
          pattern: 'hidden_costs',
          proposal: { mechanics: { hidden_fee_at_final_step: true } },
          expectedFound: 'hidden_costs'
        }
      ];

      for (const tc of supportedTestCases) {
        const res = registry.evaluateProposal('dark_pattern_ethics_watchdog', tc.proposal);
        assert.strictEqual(res.veto_asserted, true, `Expected veto on ${tc.pattern}`);
        assert.strictEqual(res.approved, false);
        assert.ok(res.dark_patterns_found.includes(tc.expectedFound));
      }
    });

    it('4.2 should verify watchdog detects all canonical taxonomy patterns fail-closed', () => {
      const unsupportedPatterns = [
        'fake_countdown',
        'drip_pricing',
        'disguised_ads',
        'forced_continuity',
        'privacy_zuckering',
        'misdirection',
        'price_comparison_prevention',
        'bait_and_switch',
        'social_proof_fabrication'
      ];

      const passedWithoutVeto = [];

      for (const pattern of unsupportedPatterns) {
        const res = registry.evaluateProposal('dark_pattern_ethics_watchdog', {
          copy: `Special offer using deceptive ${pattern}`,
          mechanics: { [pattern]: true }
        });

        if (res.approved === true && res.veto_asserted === false) {
          passedWithoutVeto.push(pattern);
        }
      }

      // Proves that 0 patterns slip past the watchdog undetected
      assert.strictEqual(passedWithoutVeto.length, 0,
        `Remediated: All patterns detected by watchdog; 0 passed without veto: ${passedWithoutVeto.join(', ')}`);
    });

    it('4.3 should verify detected dark pattern transitions 100% fail-closed to REJECT_AS_UNSAFE in FSM', () => {
      const contract = createDefaultUxDecision({
        decision_id: 'UX-DEC-2026-101',
        confidence: 0.95,
        confidence_calibrated: true,
        risk_level: 'low'
      });

      const engine = new UxDecisionLifecycleEngine('OBSERVE');
      const res = engine.runFullLifecycle(contract, {
        darkPatternDetected: true,
        evidence_verified: true
      });

      assert.strictEqual(res.finalState, 'REJECT_AS_UNSAFE');
      assert.strictEqual(res.routingOutcome.route, 'REJECT_AS_UNSAFE');
      assert.strictEqual(res.routingOutcome.authorized, false);
    });

    it('4.4 should verify detected dark pattern (drip_pricing) transitions fail-closed to REJECT_AS_UNSAFE', () => {
      // 1. Propose drip pricing
      const proposal = {
        persona: 'dark_pattern_ethics_watchdog',
        copy: 'Book your hotel room now for only $99/night!',
        mechanics: {
          drip_pricing: true,
          resort_fee_hidden_until_checkout: true
        }
      };

      // 2. Evaluate via registry
      const evalResult = registry.evaluateProposal('dark_pattern_ethics_watchdog', proposal);
      assert.strictEqual(evalResult.veto_asserted, true, 'Remediated: Watchdog asserts veto on drip pricing');

      // 3. Feed evaluation into decision lifecycle
      const contract = createDefaultUxDecision({
        decision_id: 'UX-DEC-2026-102',
        confidence: 0.90,
        confidence_calibrated: true,
        risk_level: 'low'
      });

      const engine = new UxDecisionLifecycleEngine('OBSERVE');
      const runResult = engine.runFullLifecycle(contract, {
        darkPatternDetected: evalResult.veto_asserted, // Driven by watchdog output
        evidence_verified: true,
        confidence: 0.90,
        confidence_calibrated: true
      });

      // Remediated: Deceptive decision transitions fail-closed to REJECT_AS_UNSAFE!
      assert.strictEqual(runResult.finalState, 'REJECT_AS_UNSAFE',
        'Remediated: Detected drip pricing transitions to REJECT_AS_UNSAFE');
      assert.strictEqual(runResult.routingOutcome.authorized, false,
        'Remediated: Autonomous execution rejected for deceptive design');
    });
  });
});
