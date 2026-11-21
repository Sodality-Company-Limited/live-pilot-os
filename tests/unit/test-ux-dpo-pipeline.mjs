import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDpoLoss,
  loadPreferenceDataset,
  evaluateDpoWinRate,
  runDpoPipeline
} from '../../scripts/lib/ux-dpo-pipeline.mjs';

test('computeDpoLoss computes Bradley-Terry loss and implicit rewards with beta=0.20', () => {
  // Case 1: Policy strongly prefers chosen
  const resWin = computeDpoLoss({
    policyChosenLogp: -10.0,
    policyRejectedLogp: -20.0,
    refChosenLogp: -15.0,
    refRejectedLogp: -15.0,
    beta: 0.20
  });

  assert.ok(resWin.logits > 0, `Logits should be positive, got ${resWin.logits}`);
  assert.ok(resWin.loss < 0.693, `Loss should be less than log(2), got ${resWin.loss}`);
  assert.ok(resWin.rewardMargin > 0, `Reward margin should be positive, got ${resWin.rewardMargin}`);
  assert.strictEqual(resWin.isWin, true);

  // Case 2: Policy prefers rejected (loss increases)
  const resLoss = computeDpoLoss({
    policyChosenLogp: -20.0,
    policyRejectedLogp: -10.0,
    refChosenLogp: -15.0,
    refRejectedLogp: -15.0,
    beta: 0.20
  });

  assert.ok(resLoss.logits < 0);
  assert.ok(resLoss.loss > 0.693);
  assert.strictEqual(resLoss.isWin, false);
});

test('computeDpoLoss rejects non-positive beta fail-closed', () => {
  assert.throws(() => {
    computeDpoLoss({
      policyChosenLogp: -10.0,
      policyRejectedLogp: -20.0,
      refChosenLogp: -15.0,
      refRejectedLogp: -15.0,
      beta: 0.0
    });
  }, /beta must be strictly positive/);
});

test('loadPreferenceDataset successfully parses Stage 5 test pairs', () => {
  const pairs = loadPreferenceDataset('artifacts/curriculum/stage5_preferences/splits/test.jsonl');
  assert.ok(Array.isArray(pairs));
  assert.ok(pairs.length > 0, 'Test split should contain records');

  const first = pairs[0];
  assert.ok(first.pair_id);
  assert.ok(first.prompt);
  assert.ok(first.chosen);
  assert.ok(first.rejected);
  assert.ok(first.preference_delta);
});

test('evaluateDpoWinRate asserts >= 68.0% win rate over SFT baseline', () => {
  const pairs = loadPreferenceDataset('artifacts/curriculum/stage5_preferences/splits/test.jsonl');
  const result = evaluateDpoWinRate(pairs, { beta: 0.20, targetWinRate: 0.680 });

  assert.strictEqual(result.total, pairs.length);
  assert.ok(result.winRate >= 0.680, `Win rate ${result.winRate} should be >= 0.680`);
  assert.strictEqual(result.passed, true);
});

test('runDpoPipeline executes end-to-end and outputs structured receipt', async () => {
  const summary = await runDpoPipeline({
    preferenceDatasetPath: 'artifacts/curriculum/stage5_preferences/splits/test.jsonl',
    beta: 0.20,
    targetWinRate: 0.680
  });

  assert.strictEqual(summary.pipeline, 'ux_direct_preference_optimization');
  assert.strictEqual(summary.goal_id, 'G-UX-016');
  assert.ok(summary.evaluation.win_rate >= 0.680);
  assert.strictEqual(summary.evaluation.passed, true);
  assert.strictEqual(summary.hyperparameters.beta, 0.20);
  assert.strictEqual(summary.hyperparameters.reference_model_frozen, true);
});
