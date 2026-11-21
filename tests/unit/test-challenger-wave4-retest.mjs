#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ ADVERSARIAL RETEST & FUZZING SUITE: G-UX-015 (SFT) & G-UX-016 (DPO)
 * ════════════════════════════════════════════════════════════════════════════════
 * Agent: challenger_wave4_retest (Empirical Challenger)
 * Target Goals: G-UX-015 (SFT Pipeline) & G-UX-016 (DPO Pipeline)
 *
 * Verifications:
 * 1. G-UX-015 SFT: validateUxDecisionSchema empty-string fail-closed property
 *    - Rejects empty strings "" on decision_id, lifecycle_state, risk_level, summary.
 * 2. G-UX-015 SFT: runSftPipeline real curriculum evaluation
 *    - Ingests 2,500 real trajectories & 4,000 real scene graphs.
 *    - Evaluates 500 samples with empirical conformance >= 98.0%.
 *    - Dynamic loss progression computation across epochs.
 * 3. G-UX-016 DPO: evaluateDpoWinRate candidate token sensitivity
 *    - Inverted pairs (dark patterns / raw hex) drop win rate to 0.0%.
 *    - Normal pairs achieve 100% win rate and positive reward margin.
 * 4. Constitutional Article I Zero-Mock Compliance in JS modules.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  createCanonicalUxDecision,
  validateUxDecisionSchema,
  evaluateSchemaConformance,
  runSftPipeline
} from '../../scripts/lib/ux-sft-pipeline.mjs';

import {
  scoreCandidateSequence,
  computeDpoLoss,
  evaluateDpoWinRate
} from '../../scripts/lib/ux-dpo-pipeline.mjs';

// ════════════════════════════════════════════════════════════════════════════════
// 1. G-UX-015 SFT: validateUxDecisionSchema Empty-String Fail-Closed Rejection
// ════════════════════════════════════════════════════════════════════════════════

test('Retest 1.1: validateUxDecisionSchema rejects empty string "" across required fields fail-closed', () => {
  // 1. Empty string decision_id
  const dEmptyId = createCanonicalUxDecision();
  dEmptyId.decision_id = '';
  const resEmptyId = validateUxDecisionSchema(dEmptyId);
  assert.strictEqual(resEmptyId.valid, false, 'Empty string decision_id must be rejected fail-closed');
  assert.ok(resEmptyId.errors.some(e => e.includes('pattern UX-DEC-XXXX-XXX')));

  // 2. Empty string lifecycle_state
  const dEmptyState = createCanonicalUxDecision();
  dEmptyState.lifecycle_state = '';
  const resEmptyState = validateUxDecisionSchema(dEmptyState);
  assert.strictEqual(resEmptyState.valid, false, 'Empty string lifecycle_state must be rejected fail-closed');
  assert.ok(resEmptyState.errors.some(e => e.includes('Invalid lifecycle_state')));

  // 3. Empty string risk_level
  const dEmptyRisk = createCanonicalUxDecision();
  dEmptyRisk.risk_level = '';
  const resEmptyRisk = validateUxDecisionSchema(dEmptyRisk);
  assert.strictEqual(resEmptyRisk.valid, false, 'Empty string risk_level must be rejected fail-closed');
  assert.ok(resEmptyRisk.errors.some(e => e.includes('risk_level')));

  // 4. Empty string decision.summary
  const dEmptySummary = createCanonicalUxDecision();
  dEmptySummary.decision.summary = '';
  const resEmptySummary = validateUxDecisionSchema(dEmptySummary);
  assert.strictEqual(resEmptySummary.valid, false, 'Empty string decision.summary must be rejected fail-closed');
  assert.ok(resEmptySummary.errors.some(e => e.includes('summary')));

  // 5. Valid decision passes cleanly
  const dValid = createCanonicalUxDecision();
  const resValid = validateUxDecisionSchema(dValid);
  assert.strictEqual(resValid.valid, true, `Valid decision rejected: ${resValid.errors.join('; ')}`);
});


// ════════════════════════════════════════════════════════════════════════════════
// 2. G-UX-015 SFT: runSftPipeline Real Curriculum Ingestion & Conformance
// ════════════════════════════════════════════════════════════════════════════════

test('Retest 2.1: runSftPipeline ingests real trajectories and achieves >= 98.0% conformance', async () => {
  const result = await runSftPipeline({
    validationSampleCount: 500,
    targetConformanceRate: 0.980,
    epochs: 3
  });

  // Verify real dataset ingestion
  assert.strictEqual(result.pipeline, 'ux_supervised_fine_tuning');
  assert.strictEqual(result.goal_id, 'G-UX-015');
  assert.strictEqual(result.datasets_ingested.scene_graphs_count, 4000);
  assert.strictEqual(result.datasets_ingested.trajectories_count, 2500);

  // Verify evaluation
  assert.strictEqual(result.evaluation.evaluated_samples, 500);
  assert.strictEqual(result.evaluation.conforming_samples, 500);
  assert.ok(result.evaluation.conformance_rate >= 0.980, `Conformance rate ${result.evaluation.conformance_rate} < 0.980`);
  assert.strictEqual(result.evaluation.passed, true);

  // Verify dynamic loss progression
  assert.strictEqual(result.loss_progression.length, 3);
  for (let i = 0; i < result.loss_progression.length; i++) {
    const lp = result.loss_progression[i];
    assert.strictEqual(lp.epoch, i + 1);
    assert.ok(typeof lp.loss === 'number' && lp.loss > 0, 'Epoch loss must be a positive number');
    if (i > 0) {
      assert.ok(lp.loss < result.loss_progression[i - 1].loss, 'Loss must strictly decrease across epochs');
    }
  }
});


// ════════════════════════════════════════════════════════════════════════════════
// 3. G-UX-016 DPO: evaluateDpoWinRate Candidate Token Sensitivity Fuzzing
// ════════════════════════════════════════════════════════════════════════════════

test('Retest 3.1: evaluateDpoWinRate responds dynamically to candidate tokens (normal vs inverted)', () => {
  // Normal candidate pair: chosen has accessible design tokens; rejected has anti-patterns
  const normalPairs = [
    {
      chosen: { text: 'PrimaryButton bg-primary-600 focus-visible:ring-2 text-content-inverted px-4 py-2 rounded-md' },
      rejected: { text: 'button style color #ffffff backgroundColor #0000ff outline-none w-4 h-4' },
      preference_delta: { contrast_margin: 4.5, accessibility_score_delta: 0.8 }
    },
    {
      chosen: { text: 'Modal role dialog aria-labelledby modal-title aria-modal true bg-surface-card' },
      rejected: { text: 'div style backgroundColor #333333 #ff0000 outline-none' },
      preference_delta: { contrast_margin: 3.5, accessibility_score_delta: 0.6 }
    }
  ];

  const resNormal = evaluateDpoWinRate(normalPairs);
  assert.strictEqual(resNormal.total, 2);
  assert.strictEqual(resNormal.wins, 2);
  assert.strictEqual(resNormal.winRate, 1.0);
  assert.ok(resNormal.averageMargin > 0, `Expected positive margin, got ${resNormal.averageMargin}`);
  assert.strictEqual(resNormal.passed, true);

  // Inverted candidate pair: chosen has anti-patterns; rejected has accessible tokens
  const invertedPairs = [
    {
      chosen: { text: 'button style color #ffffff backgroundColor #0000ff outline-none w-4 h-4' },
      rejected: { text: 'PrimaryButton bg-primary-600 focus-visible:ring-2 text-content-inverted px-4 py-2 rounded-md' },
      preference_delta: { contrast_margin: -4.5, accessibility_score_delta: -0.8 }
    },
    {
      chosen: { text: 'div style backgroundColor #333333 #ff0000 outline-none' },
      rejected: { text: 'Modal role dialog aria-labelledby modal-title aria-modal true bg-surface-card' },
      preference_delta: { contrast_margin: -3.5, accessibility_score_delta: -0.6 }
    }
  ];

  const resInverted = evaluateDpoWinRate(invertedPairs);
  assert.strictEqual(resInverted.total, 2);
  assert.strictEqual(resInverted.wins, 0);
  assert.strictEqual(resInverted.winRate, 0.0);
  assert.ok(resInverted.averageMargin < 0, `Expected negative margin, got ${resInverted.averageMargin}`);
  assert.strictEqual(resInverted.passed, false);

  // Proves candidate evaluation is genuinely driven by candidate token distributions
  assert.ok(
    resNormal.winRate > resInverted.winRate,
    'Normal pairs must strictly outperform inverted pairs'
  );
});

test('Retest 3.2: scoreCandidateSequence gives positive policy log-ratio shift to accessible tokens and negative to flawed', () => {
  const accessibleText = 'PrimaryButton bg-primary-600 focus-visible:ring-2 aria-label "Submit"';
  const flawedText = 'button style backgroundColor #ff0000 outline-none';

  // Implicit reward: r(x, y) = beta * (log pi_policy - log pi_ref)
  const shiftAcc = scoreCandidateSequence(accessibleText, true) - scoreCandidateSequence(accessibleText, false);
  const shiftFlawed = scoreCandidateSequence(flawedText, true) - scoreCandidateSequence(flawedText, false);

  assert.ok(
    shiftAcc > 0,
    `Accessible token shift (${shiftAcc}) must be strictly positive`
  );
  assert.ok(
    shiftFlawed < 0,
    `Flawed token shift (${shiftFlawed}) must be strictly negative`
  );
  assert.ok(
    shiftAcc > shiftFlawed,
    `Accessible shift (${shiftAcc}) must exceed flawed shift (${shiftFlawed})`
  );
});


// ════════════════════════════════════════════════════════════════════════════════
// 4. CONSTITUTIONAL ARTICLE I ZERO-MOCK COMPLIANCE IN JS FILES
// ════════════════════════════════════════════════════════════════════════════════

test('Retest 4.1: zero occurrences of mock in JavaScript SFT and DPO pipelines', () => {
  const root = process.cwd();
  const filesToCheck = [
    path.join(root, 'scripts/lib/ux-sft-pipeline.mjs'),
    path.join(root, 'scripts/lib/ux-dpo-pipeline.mjs'),
    path.join(root, 'scripts/harness/ux-sft-pipeline-harness.mjs'),
    path.join(root, 'scripts/harness/ux-dpo-pipeline-harness.mjs')
  ];

  for (const fp of filesToCheck) {
    const content = fs.readFileSync(fp, 'utf8');
    const matches = content.match(/\bmock\w*/gi);
    assert.strictEqual(
      matches,
      null,
      `Found mock occurrence in ${path.relative(root, fp)}: ${JSON.stringify(matches)}`
    );
  }
});
