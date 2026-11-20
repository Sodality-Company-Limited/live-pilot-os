/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ UNIT TESTS: HITL REVIEW PACKET & CORRECTION LEARNER (G-UX-025)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HITL_SCHEMA_VERSION,
  CORRECTION_TAXONOMY,
  formatReviewPacket,
  parseReviewPacket,
  parseHumanCorrection,
  serializeRlcdPreferencePair
} from '../../scripts/lib/hitl-review-packet.mjs';

describe('G-UX-025: HITL Review Packet Formatter & Correction Learner', () => {

  describe('1. Schema & Taxonomy Definitions', () => {
    it('declares schema version 1 and 9 canonical correction categories', () => {
      assert.equal(HITL_SCHEMA_VERSION, 1);
      assert.equal(CORRECTION_TAXONOMY.length, 9);
      assert.deepEqual(CORRECTION_TAXONOMY, [
        'layout',
        'typography',
        'color',
        'navigation',
        'motion',
        'component_state',
        'form_input',
        'feedback_modal',
        'ethical_guardrail'
      ]);
    });
  });

  describe('2. Review Packet Markdown Formatter', () => {
    it('formats a zero-opacity markdown review packet with all mandatory sections', () => {
      const packet = formatReviewPacket({
        decision_id: 'DAVE-UX-0042',
        goal_id: 'G-UX-025',
        calibrated_confidence: 0.92,
        brier_score: 0.045,
        route: 'PROCEED',
        where: '`code/src/components/Dashboard.tsx`',
        why: 'Streamlined decision visualization.',
        selected_action: 'approve'
      });

      assert.ok(packet.includes('# 📋 DAVE HUMAN-IN-THE-LOOP (HITL) COMPACT REVIEW PACKET'));
      assert.ok(packet.includes('`DAVE-UX-0042`'));
      assert.ok(packet.includes('`G-UX-025`'));
      assert.ok(packet.includes('**`PROCEED`**'));
      assert.ok(packet.includes('Confidence: `0.920`'));
      assert.ok(packet.includes('Brier Risk: `0.045`'));
      assert.ok(packet.includes('## 1. Executive Summary & Intent'));
      assert.ok(packet.includes('## 2. Spatial & Semantic Zone Deconstruction'));
      assert.ok(packet.includes('Zone 1'));
      assert.ok(packet.includes('## 3. Epistemic Confidence & Doubt Metrics'));
      assert.ok(packet.includes('## 4. Persona Deliberation Matrix'));
      assert.ok(packet.includes('## 5. Interactive Human Approval Actions'));
      assert.ok(packet.includes('- [x] **[Approve]**'));
      assert.ok(packet.includes('- [ ] **[Reject]**'));
      assert.ok(packet.includes('## 6. Human Reviewer Feedback & Correction Directives'));
    });
  });

  describe('3. 9-Class Human Correction Taxonomy Parser', () => {
    it('handles empty or whitespace feedback gracefully', () => {
      const parsed = parseHumanCorrection('   ');
      assert.equal(parsed.has_feedback, false);
      assert.equal(parsed.categories.length, 0);
    });

    it('classifies all 9 taxonomy categories correctly', () => {
      const samples = [
        { text: 'Adjust the grid alignment and spacing in Zone 1.', expected: 'layout' },
        { text: 'Increase font-size and line-height for the header typography.', expected: 'typography' },
        { text: 'Contrast ratio fails WCAG AAA, change text-color token.', expected: 'color' },
        { text: 'Add breadcrumbs and drawer navigation to this screen.', expected: 'navigation' },
        { text: 'The motion transition duration is too jarring, adjust spring easing and check reduced-motion.', expected: 'motion' },
        { text: 'The button hover and disabled states need visual differentiation.', expected: 'component_state' },
        { text: 'Add a search placeholder and input validation error hint.', expected: 'form_input' },
        { text: 'Display an alert dialog modal before confirming the payment.', expected: 'feedback_modal' },
        { text: 'This text is confirmshaming and a deceptive dark pattern.', expected: 'ethical_guardrail' }
      ];

      for (const s of samples) {
        const result = parseHumanCorrection(s.text);
        assert.ok(result.categories.includes(s.expected), `Expected category "${s.expected}" in "${s.text}", got: ${result.categories.join(',')}`);
      }
    });

    it('extracts targeted zones, directives, and rejection flags', () => {
      const feedback = `
        Zone 1 navigation layout needs fixes:
        - Move the search bar to the top right
        - Make sure the logo is centered
        Reject the current proposal because it is broken.
      `;
      const result = parseHumanCorrection(feedback);

      assert.equal(result.has_feedback, true);
      assert.ok(result.categories.includes('layout'));
      assert.ok(result.categories.includes('navigation'));
      assert.ok(result.target_zones.includes('ZONE 1'));
      assert.equal(result.requires_rejection, true);
      assert.equal(result.sentiment, 'negative');
      assert.equal(result.directives.length, 2);
    });
  });

  describe('4. RLCD / DPO Preference Pair Serialization', () => {
    it('serializes human correction into paired (chosen, rejected) preference tuple', () => {
      const modelProposal = {
        goal_id: 'G-UX-025',
        prompt: 'Design primary action button with contrast',
        content: { color: 'indigo-500', text: 'Submit' }
      };

      const humanCorrection = parseHumanCorrection('Increase contrast ratio and add hover state for Zone 3');
      const prefTuple = serializeRlcdPreferencePair(modelProposal, humanCorrection, { margin: 1.5 });

      assert.ok(prefTuple.id.startsWith('PREF-'));
      assert.equal(prefTuple.goal_id, 'G-UX-025');
      assert.ok(prefTuple.categories.includes('color'));
      assert.ok(prefTuple.categories.includes('component_state'));
      assert.ok(prefTuple.target_zones.includes('ZONE 3'));
      assert.equal(prefTuple.chosen.provenance, 'human_correction');
      assert.equal(prefTuple.chosen.score, 1.0);
      assert.equal(prefTuple.rejected.provenance, 'model_original');
      assert.equal(prefTuple.rejected.score, 0.0);
      assert.equal(prefTuple.margin, 1.5);
    });

    it('assigns 10x asymmetric loss weight to ethical guardrail corrections', () => {
      const modelProposal = { goal_id: 'G-UX-025', prompt: 'Cancel subscription page' };
      const correction = parseHumanCorrection('Remove confirmshaming dark pattern from cancellation dialog');
      const prefTuple = serializeRlcdPreferencePair(modelProposal, correction);

      assert.ok(prefTuple.categories.includes('ethical_guardrail'));
      assert.equal(prefTuple.loss_weight, 10.0);
    });
  });

  describe('5. Dedicated Review Packet Document Parser', () => {
    it('parses approved review packet without false rejection triggers', () => {
      const packet = formatReviewPacket({
        decision_id: 'DAVE-UX-0101',
        goal_id: 'G-UX-025',
        calibrated_confidence: 0.95,
        brier_score: 0.02,
        route: 'PROCEED',
        selected_action: 'approve',
        human_feedback: 'All architectural requirements approved without revisions.'
      });

      const parsed = parseReviewPacket(packet);
      assert.equal(parsed.action, 'approve');
      assert.equal(parsed.requires_rejection, false);
      assert.equal(parsed.sentiment, 'positive');
      assert.equal(parsed.decision_id, 'DAVE-UX-0101');
      assert.equal(parsed.goal_id, 'G-UX-025');
    });

    it('parses rejected review packet and sets requires_rejection to true', () => {
      const packet = formatReviewPacket({
        decision_id: 'DAVE-UX-0102',
        goal_id: 'G-UX-025',
        calibrated_confidence: 0.40,
        brier_score: 0.25,
        route: 'REJECT_AS_UNSAFE',
        selected_action: 'reject',
        human_feedback: 'Reject this proposal due to deceptive drip pricing.'
      });

      const parsed = parseReviewPacket(packet);
      assert.equal(parsed.action, 'reject');
      assert.equal(parsed.requires_rejection, true);
      assert.equal(parsed.sentiment, 'negative');
      assert.ok(parsed.categories.includes('ethical_guardrail'));
    });

    it('classifies canonical dark patterns into ethical_guardrail with 10.0x weight', () => {
      const darkPatterns = [
        'bait and switch pricing',
        'forced continuity subscription',
        'disguised advertisement styled as button',
        'drip pricing hidden fees at checkout',
        'ethical guardrail issues on this screen'
      ];

      for (const phrase of darkPatterns) {
        const parsed = parseHumanCorrection(phrase);
        assert.ok(
          parsed.categories.includes('ethical_guardrail'),
          `"${phrase}" must match ethical_guardrail taxonomy`
        );
        const pref = serializeRlcdPreferencePair({ goal_id: 'G-UX-025' }, parsed);
        assert.equal(pref.loss_weight, 10.0);
      }
    });
  });
});
