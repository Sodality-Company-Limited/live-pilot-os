import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  UX_PERSONA_TIERS,
  UX_PERSONA_PRIORITY_SCORES,
  UX_SEMANTIC_PROPERTY_PAIRS,
  normalizeUxProposal,
  evaluatePairwiseCollision,
  UxConflictDetector,
  UxConflictSynthesizer,
  UxDeadlockEscalator,
  UxConflictResolver,
  detectUxConflicts,
  resolveUxConflicts,
  formatUxReviewPacket
} from '../../scripts/lib/ux-conflict-resolver.mjs';

describe('G-UX-004: UX Multi-Persona Conflict Resolution Unit Test Suite', () => {

  describe('1. 4-Tier Precedence Hierarchy & Invariants', () => {
    it('should assign correct tiers to all 12 personas', () => {
      assert.equal(UX_PERSONA_TIERS.dark_pattern_ethics_watchdog, 1);

      assert.equal(UX_PERSONA_TIERS.accessibility_auditor, 2);
      assert.equal(UX_PERSONA_TIERS.i18n_multilocale_stylist, 2);
      assert.equal(UX_PERSONA_TIERS.ergonomics_cognitive_critic, 2);

      assert.equal(UX_PERSONA_TIERS.enterprise_info_architect, 3);
      assert.equal(UX_PERSONA_TIERS.design_systems_lead, 3);
      assert.equal(UX_PERSONA_TIERS.typography_scale_architect, 3);
      assert.equal(UX_PERSONA_TIERS.visual_balance_density, 3);
      assert.equal(UX_PERSONA_TIERS.interaction_choreographer, 3);

      assert.equal(UX_PERSONA_TIERS.color_contrast_specialist, 4);
      assert.equal(UX_PERSONA_TIERS.motion_haptics_engineer, 4);
      assert.equal(UX_PERSONA_TIERS.microcopy_tone_specialist, 4);
    });

    it('should maintain strict monotonic priority scores across tiers', () => {
      // Tier 1 > Tier 2
      assert.ok(UX_PERSONA_PRIORITY_SCORES.dark_pattern_ethics_watchdog > UX_PERSONA_PRIORITY_SCORES.accessibility_auditor);
      // Tier 2 > Tier 3
      assert.ok(UX_PERSONA_PRIORITY_SCORES.ergonomics_cognitive_critic > UX_PERSONA_PRIORITY_SCORES.design_systems_lead);
      // Tier 3 > Tier 4
      assert.ok(UX_PERSONA_PRIORITY_SCORES.visual_balance_density > UX_PERSONA_PRIORITY_SCORES.color_contrast_specialist);
    });
  });

  describe('2. Proposal Normalization', () => {
    it('should normalize proposal attributes with proper defaults', () => {
      const prop = normalizeUxProposal({
        persona: 'accessibility_auditor',
        property: 'text_contrast',
        value: 7.0,
        rationale: 'WCAG AAA contrast'
      });

      assert.equal(prop.persona, 'accessibility_auditor');
      assert.equal(prop.tier, 2);
      assert.equal(prop.priority_score, 900);
      assert.equal(prop.property, 'text_contrast');
      assert.equal(prop.proposed_value, 7.0);
      assert.equal(prop.constraint_type, 'EXACT');
      assert.equal(prop.confidence, 0.90);
      assert.ok(prop.proposal_id.startsWith('prop_accessibility_auditor_'));
    });

    it('should throw error on invalid non-object proposal', () => {
      assert.throws(() => normalizeUxProposal(null), /must be a non-null object/);
    });
  });

  describe('3. Pairwise Collision Detection', () => {
    it('should detect collision on exact property overwrite with differing values', () => {
      const p1 = normalizeUxProposal({
        persona: 'accessibility_auditor',
        property: 'contrast_ratio',
        value: 7.0
      });
      const p2 = normalizeUxProposal({
        persona: 'visual_balance_density',
        property: 'contrast_ratio',
        value: 3.5
      });

      const res = evaluatePairwiseCollision(p1, p2);
      assert.equal(res.isCollision, true);
      assert.equal(res.category, 'exact_property_overwrite');
      assert.equal(res.severity, 'high'); // Tier 2 involved
    });

    it('should NOT flag collision if same persona or identical values', () => {
      const p1 = normalizeUxProposal({
        persona: 'accessibility_auditor',
        property: 'contrast_ratio',
        value: 7.0
      });
      const p2 = normalizeUxProposal({
        persona: 'accessibility_auditor',
        property: 'contrast_ratio',
        value: 4.5
      });
      const res = evaluatePairwiseCollision(p1, p2);
      assert.equal(res.isCollision, false);

      const p3 = normalizeUxProposal({
        persona: 'visual_balance_density',
        property: 'contrast_ratio',
        value: 7.0
      });
      const resIdentical = evaluatePairwiseCollision(p1, p3);
      assert.equal(resIdentical.isCollision, false);
    });

    it('should detect semantic property collisions (e.g. text_contrast vs brand_color)', () => {
      const p1 = normalizeUxProposal({
        persona: 'accessibility_auditor',
        property: 'text_contrast',
        value: 7.0
      });
      const p2 = normalizeUxProposal({
        persona: 'color_contrast_specialist',
        property: 'brand_color',
        value: '#a0c4ff'
      });

      const res = evaluatePairwiseCollision(p1, p2);
      assert.equal(res.isCollision, true);
      assert.equal(res.category, 'accessibility_vs_color');
      assert.equal(res.severity, 'critical');
    });

    it('should detect animation duration vs prefers reduced motion collision', () => {
      const p1 = normalizeUxProposal({
        persona: 'accessibility_auditor',
        property: 'prefers_reduced_motion',
        value: true
      });
      const p2 = normalizeUxProposal({
        persona: 'motion_haptics_engineer',
        property: 'animation_duration_ms',
        value: 400
      });

      const res = evaluatePairwiseCollision(p1, p2);
      assert.equal(res.isCollision, true);
      assert.equal(res.category, 'accessibility_vs_motion');
      assert.equal(res.severity, 'critical');
    });
  });

  describe('4. Cross-Tier Overrides', () => {
    it('should ensure Tier 1 Ethics Watchdog overrides all lower tiers', () => {
      const proposals = [
        {
          persona: 'interaction_choreographer',
          property: 'opt_in_mode',
          value: 'pre_checked_by_default',
          rationale: 'Frictionless conversion flow'
        },
        {
          persona: 'dark_pattern_ethics_watchdog',
          property: 'opt_in_mode',
          value: 'explicit_uncheck_required',
          rationale: 'Prohibit sneak-into-basket and pre-checked deceptive checkboxes'
        }
      ];

      const res = resolveUxConflicts(proposals);
      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.resolved_proposals.length, 1);
      assert.equal(res.resolved_proposals[0].persona, 'dark_pattern_ethics_watchdog');
      assert.equal(res.overridden_proposals.length, 1);
      assert.equal(res.overridden_proposals[0].proposal.persona, 'interaction_choreographer');
      assert.match(res.overridden_proposals[0].rationale, /Tier 1 \(dark_pattern_ethics_watchdog\) overrides Tier 3/);
    });

    it('should ensure Tier 2 Inclusion overrides Tier 3 Foundations', () => {
      const proposals = [
        {
          persona: 'visual_balance_density',
          property: 'touch_target_size',
          value: 24,
          rationale: 'Ultra compact high density toolbar'
        },
        {
          persona: 'accessibility_auditor',
          property: 'touch_target_size',
          value: 44,
          rationale: 'WCAG 2.2 AAA minimum 44x44px touch target'
        }
      ];

      const res = resolveUxConflicts(proposals);
      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.resolved_proposals.length, 1);
      assert.equal(res.resolved_proposals[0].persona, 'accessibility_auditor');
      assert.equal(res.overridden_proposals[0].proposal.persona, 'visual_balance_density');
      assert.match(res.overridden_proposals[0].rationale, /Tier 2 \(accessibility_auditor\) overrides Tier 3/);
    });

    it('should ensure Tier 2 Ergonomics overrides Tier 3 Interaction on destructive confirmation', () => {
      const proposals = [
        {
          persona: 'interaction_choreographer',
          property: 'requires_confirmation',
          value: false,
          rationale: 'Fast one-click deletion'
        },
        {
          persona: 'ergonomics_cognitive_critic',
          property: 'requires_confirmation',
          value: true,
          rationale: 'Mandatory confirmation modal to prevent irreversible data loss'
        }
      ];

      const res = resolveUxConflicts(proposals);
      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.resolved_proposals[0].persona, 'ergonomics_cognitive_critic');
      assert.equal(res.resolved_proposals[0].proposed_value, true);
    });

    it('should ensure Tier 3 Design Systems overrides Tier 4 Motion / Polish on tokens', () => {
      const proposals = [
        {
          persona: 'motion_haptics_engineer',
          property: 'animation_duration_ms',
          value: 750,
          rationale: 'Cinematic slow-motion transition'
        },
        {
          persona: 'design_systems_lead',
          property: 'animation_duration_ms',
          value: 200,
          rationale: 'Standard token motion-duration-fast (200ms)'
        }
      ];

      const res = resolveUxConflicts(proposals);
      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.resolved_proposals[0].persona, 'design_systems_lead');
      assert.equal(res.resolved_proposals[0].proposed_value, 200);
    });
  });

  describe('5. Intra-Tier Tie-Breaking', () => {
    it('should resolve intra-tier numeric MIN constraints by selecting strictest (maximum)', () => {
      const proposals = [
        {
          persona: 'accessibility_auditor',
          tier: 2,
          property: 'target_size',
          value: 44,
          constraint_type: 'MIN'
        },
        {
          persona: 'i18n_multilocale_stylist',
          tier: 2,
          property: 'target_size',
          value: 48,
          constraint_type: 'MIN'
        }
      ];

      const res = resolveUxConflicts(proposals);
      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.resolved_proposals.length, 1);
      assert.equal(res.resolved_proposals[0].proposed_value, 48);
      assert.match(res.overridden_proposals[0].rationale, /Stricter MIN bound 48 overrides 44/);
    });

    it('should resolve intra-tier numeric MAX constraints by selecting strictest (minimum)', () => {
      const proposals = [
        {
          persona: 'motion_haptics_engineer',
          tier: 4,
          property: 'duration',
          value: 300,
          constraint_type: 'MAX'
        },
        {
          persona: 'microcopy_tone_specialist',
          tier: 4,
          property: 'duration',
          value: 200,
          constraint_type: 'MAX'
        }
      ];

      const res = resolveUxConflicts(proposals);
      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.resolved_proposals.length, 1);
      assert.equal(res.resolved_proposals[0].proposed_value, 200);
      assert.match(res.overridden_proposals[0].rationale, /Stricter MAX bound 200 overrides 300/);
    });

    it('should resolve intra-tier categorical collisions by priority score', () => {
      const proposals = [
        {
          persona: 'design_systems_lead', // Score 700
          property: 'component_variant',
          value: 'tokenized_filled'
        },
        {
          persona: 'visual_balance_density', // Score 500
          property: 'component_variant',
          value: 'custom_glassmorphism'
        }
      ];

      const res = resolveUxConflicts(proposals);
      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.resolved_proposals.length, 1);
      assert.equal(res.resolved_proposals[0].persona, 'design_systems_lead');
      assert.match(res.overridden_proposals[0].rationale, /score resolution/);
    });
  });

  describe('6. Deadlock Escalation & Human Review Packet', () => {
    it('should escalate equal-tier equal-priority categorical clash to DEADLOCK_ESCALATED', () => {
      const proposals = [
        {
          persona: 'custom_agent_alpha',
          tier: 3,
          priority_score: 500,
          property: 'navigation_style',
          value: 'mega_menu',
          rationale: 'Comprehensive hierarchical expansion'
        },
        {
          persona: 'custom_agent_beta',
          tier: 3,
          priority_score: 500,
          property: 'navigation_style',
          value: 'drawer_accordion',
          rationale: 'Compact progressive disclosure'
        }
      ];

      const res = resolveUxConflicts(proposals, { decision_id: 'DEC-TEST-001' });
      assert.equal(res.status, 'DEADLOCK_ESCALATED');
      assert.equal(res.blocked_until_approved, true);
      assert.equal(res.deadlocks.length, 1);
      assert.ok(res.review_packet);

      const packet = res.review_packet;
      assert.equal(packet.decision_id, 'DEC-TEST-001');
      assert.equal(packet.status, 'DEADLOCK_ESCALATED');
      assert.equal(packet.tier, 3);
      assert.equal(packet.requires_human_signoff, true);
      assert.equal(packet.options.length, 3);
      assert.ok(packet.packet_sha256);
      assert.equal(typeof packet.packet_sha256, 'string');
      assert.equal(packet.packet_sha256.length, 64);
    });

    it('should escalate to review packet when force_escalate is set', () => {
      const proposals = [
        {
          persona: 'typography_scale_architect',
          property: 'font_scale',
          value: 'minor_third',
          force_escalate: true
        },
        {
          persona: 'visual_balance_density',
          property: 'font_scale',
          value: 'perfect_fourth'
        }
      ];

      const res = resolveUxConflicts(proposals);
      assert.equal(res.status, 'DEADLOCK_ESCALATED');
      assert.equal(res.blocked_until_approved, true);
      assert.ok(res.review_packet);
    });
  });

  describe('7. Multi-Way Collisions & Clean Aggregations', () => {
    it('should return NO_CONFLICT when proposals are disjoint', () => {
      const proposals = [
        { persona: 'accessibility_auditor', property: 'contrast', value: 7.0 },
        { persona: 'motion_haptics_engineer', property: 'spring_damping', value: 20 },
        { persona: 'microcopy_tone_specialist', property: 'button_label', value: 'Submit Order' }
      ];

      const res = resolveUxConflicts(proposals);
      assert.equal(res.status, 'NO_CONFLICT');
      assert.equal(res.resolved_proposals.length, 3);
      assert.equal(res.consensus_score, 1.0);
      assert.equal(res.blocked_until_approved, false);
    });

    it('should handle 3-way collision on same property selecting single highest winner', () => {
      const proposals = [
        { persona: 'microcopy_tone_specialist', property: 'button_text', value: 'Buy Now!' }, // Tier 4
        { persona: 'visual_balance_density', property: 'button_text', value: 'Buy' }, // Tier 3
        { persona: 'dark_pattern_ethics_watchdog', property: 'button_text', value: 'Confirm Purchase ($29.99)' } // Tier 1
      ];

      const res = resolveUxConflicts(proposals);
      assert.equal(res.status, 'RESOLVED');
      assert.equal(res.resolved_proposals.length, 1);
      assert.equal(res.resolved_proposals[0].persona, 'dark_pattern_ethics_watchdog');
      assert.equal(res.overridden_proposals.length, 2);
    });
  });

});
