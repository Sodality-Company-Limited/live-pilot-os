#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS HITL REVIEW PACKET & CORRECTION LEARNING HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M6 / G-UX-025)
 * Purpose: Verifies zero-opacity review packet formatting, 9-class human correction
 *          parsing across 25 feedback probes, and RLCD preference tuple serialization.
 *          Emits machine-readable proof artifact to artifacts/proofs/G-UX-025-hitl-review.json
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  CORRECTION_TAXONOMY,
  formatReviewPacket,
  parseHumanCorrection,
  serializeRlcdPreferencePair
} from '../lib/hitl-review-packet.mjs';

const SODA_ROOT = path.resolve(import.meta.dirname, '../..');
const PROOFS_DIR = path.join(SODA_ROOT, 'artifacts/proofs');

const FEEDBACK_CORPUS = [
  { text: 'Adjust the grid alignment and spacing in Zone 1.', expected_category: 'layout' },
  { text: 'The padding on the container in Zone 2 is too tight.', expected_category: 'layout' },
  { text: 'Increase font-size and line-height on header typography.', expected_category: 'typography' },
  { text: 'Use font-mono for the telemetry numbers instead of font-sans.', expected_category: 'typography' },
  { text: 'The contrast ratio fails WCAG AAA, darken the background token.', expected_category: 'color' },
  { text: 'Switch to the dark mode palette for high contrast mode.', expected_category: 'color' },
  { text: 'Add breadcrumbs and drawer navigation to this screen.', expected_category: 'navigation' },
  { text: 'The back button in Zone 1 is missing, add proper routing.', expected_category: 'navigation' },
  { text: 'Motion spring physics is too bouncy, reduce transition duration.', expected_category: 'motion' },
  { text: 'Ensure instant zero-duration transition under reduced-motion.', expected_category: 'motion' },
  { text: 'Button hover and disabled states need visual differentiation.', expected_category: 'component_state' },
  { text: 'The active state should scale down by 5% on click.', expected_category: 'component_state' },
  { text: 'Add search placeholder and input validation error hint.', expected_category: 'form_input' },
  { text: 'The select dropdown needs clearer focus indicators.', expected_category: 'form_input' },
  { text: 'Display an alert dialog modal before confirming deletion.', expected_category: 'feedback_modal' },
  { text: 'Show a success toast banner when the changes are saved.', expected_category: 'feedback_modal' },
  { text: 'This text is confirmshaming and a deceptive dark pattern.', expected_category: 'ethical_guardrail' },
  { text: 'Do not use fake urgency countdowns or hidden subscription terms.', expected_category: 'ethical_guardrail' },
  { text: 'Zone 3 center canvas layout needs wider margins.', expected_category: 'layout' },
  { text: 'Font kerning and leading on the title look unbalanced.', expected_category: 'typography' },
  { text: 'Text color is unreadable on this gray background.', expected_category: 'color' },
  { text: 'The tab navigation should highlight the current active tab.', expected_category: 'navigation' },
  { text: 'Loading state shimmer animation should run at 60 fps.', expected_category: 'motion' },
  { text: 'Input field error state must display accessible aria-invalid.', expected_category: 'form_input' },
  { text: 'Remove deceptive pre-selected checkboxes for newsletter opt-in.', expected_category: 'ethical_guardrail' }
];

export async function runHitlReviewPacketHarness() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('🛡️ RUNNING G-UX-025 HITL REVIEW PACKET & CORRECTION HARNESS');
  console.log('══════════════════════════════════════════════════════════════════');

  const results = {
    total_feedback_probes: FEEDBACK_CORPUS.length,
    taxonomy_categories_covered: 0,
    parser_accuracy: 0,
    packet_formats_verified: 0,
    preference_tuples_generated: 0,
    ethical_10x_weights_verified: 0,
    all_gates_passed: false,
    timestamp: new Date().toISOString()
  };

  // 1. Verify Review Packet Formatting across 5 Scenarios
  const scenarios = [
    { decision_id: 'DAVE-UX-0010', calibrated_confidence: 0.94, brier_score: 0.03, route: 'PROCEED' },
    { decision_id: 'DAVE-UX-0011', calibrated_confidence: 0.62, brier_score: 0.18, route: 'DEFER' },
    { decision_id: 'DAVE-UX-0012', calibrated_confidence: 0.00, brier_score: 0.40, route: 'REJECT_AS_UNSAFE' },
    { decision_id: 'DAVE-UX-0013', calibrated_confidence: 0.88, brier_score: 0.05, route: 'PROCEED' },
    { decision_id: 'DAVE-UX-0014', calibrated_confidence: 0.76, brier_score: 0.09, route: 'PROCEED' }
  ];

  for (const sc of scenarios) {
    const md = formatReviewPacket({
      ...sc,
      goal_id: 'G-UX-025',
      where: '`code/src/components/ReviewMatrix.tsx`',
      why: 'Calibrated HITL governance gate.',
      for_whom: 'Lead UX Architect',
      how: 'Zero-opacity Markdown review packet synthesis.'
    });

    if (
      md.includes(sc.decision_id) &&
      md.includes(sc.route) &&
      md.includes('Executive Summary & Intent') &&
      md.includes('Spatial & Semantic Zone Deconstruction') &&
      md.includes('Interactive Human Approval Actions')
    ) {
      results.packet_formats_verified++;
    }
  }

  // 2. Verify Taxonomy Parsing Across Corpus
  const coveredTaxonomies = new Set();
  let correctParses = 0;

  for (const item of FEEDBACK_CORPUS) {
    const parsed = parseHumanCorrection(item.text);
    if (parsed.has_feedback && parsed.categories.includes(item.expected_category)) {
      correctParses++;
    }
    for (const cat of parsed.categories) {
      coveredTaxonomies.add(cat);
    }

    // 3. Serialize RLCD Preference Tuples
    const pref = serializeRlcdPreferencePair(
      { goal_id: 'G-UX-025', prompt: 'UI Component Decision' },
      parsed
    );
    results.preference_tuples_generated++;

    if (parsed.categories.includes('ethical_guardrail')) {
      if (pref.loss_weight === 10.0) {
        results.ethical_10x_weights_verified++;
      }
    }
  }

  results.taxonomy_categories_covered = coveredTaxonomies.size;
  results.parser_accuracy = correctParses / FEEDBACK_CORPUS.length;

  const passed = results.packet_formats_verified === scenarios.length &&
                 results.taxonomy_categories_covered === CORRECTION_TAXONOMY.length &&
                 results.parser_accuracy === 1.0 &&
                 results.ethical_10x_weights_verified >= 3;

  results.all_gates_passed = passed;

  if (!fs.existsSync(PROOFS_DIR)) {
    fs.mkdirSync(PROOFS_DIR, { recursive: true });
  }

  const proofPath = path.join(PROOFS_DIR, 'G-UX-025-hitl-review.json');
  fs.writeFileSync(proofPath, JSON.stringify(results, null, 2), 'utf8');

  console.log(`✅ Review Packet Formats Verified: ${results.packet_formats_verified}/${scenarios.length}`);
  console.log(`✅ Taxonomy Categories Covered: ${results.taxonomy_categories_covered}/${CORRECTION_TAXONOMY.length}`);
  console.log(`✅ Human Parser Accuracy: ${(results.parser_accuracy * 100).toFixed(1)}% (Target: 100%)`);
  console.log(`✅ Preference Tuples Generated: ${results.preference_tuples_generated}`);
  console.log(`✅ Ethical 10x Loss Weights Verified: ${results.ethical_10x_weights_verified}`);
  console.log(`📁 Proof Artifact Emitted: ${proofPath}`);
  console.log(`Verdict: ${passed ? 'PASSED' : 'FAILED'}`);
  console.log('══════════════════════════════════════════════════════════════════');

  if (!passed) {
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runHitlReviewPacketHarness().catch((err) => {
    console.error('Fatal Harness Error:', err);
    process.exit(1);
  });
}
