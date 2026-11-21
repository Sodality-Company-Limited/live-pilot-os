import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCarlLoss,
  computeBrierScore,
  computeEce,
  computeAuroc,
  computeHcer,
  evaluateCalibrationBattery,
  routeDecisionByConfidence,
  runCarlEvaluation,
  CARL_DEFAULTS
} from '../../scripts/lib/carl-engine.mjs';

test('computeCarlLoss enforces strictly proper scoring and 10x overconfidence penalty', () => {
  // Accurate prediction: c = 0.95, target = 1
  const good = computeCarlLoss({ confidence: 0.95, target: true });
  assert.ok(good.totalLoss < 0.1, `Good prediction loss should be small, got ${good.totalLoss}`);
  assert.strictEqual(good.overconfPenalty, 0.0);

  // Overconfident wrong prediction: c = 0.95, target = 0
  const bad = computeCarlLoss({ confidence: 0.95, target: false });
  assert.ok(bad.overconfPenalty > 8.0, `Overconfidence penalty should be > 8.0, got ${bad.overconfPenalty}`);
  assert.ok(bad.totalLoss > bad.properCalLoss, 'Total loss should include overconfidence penalty');
});

test('computeCarlLoss rewards justified doubt on ambiguous inputs', () => {
  // Deferring on ambiguous input -> positive reward
  const deferAmbiguous = computeCarlLoss({
    confidence: 0.40,
    target: false,
    action: 'DEFER',
    isAmbiguous: true
  });
  assert.ok(deferAmbiguous.doubtReward > 0.0, 'Doubt reward should be positive for deferring on ambiguous input');

  // Proceeding on ambiguous input -> penalized
  const proceedAmbiguous = computeCarlLoss({
    confidence: 0.80,
    target: false,
    action: 'PROCEED',
    isAmbiguous: true
  });
  assert.ok(proceedAmbiguous.doubtReward < 0.0, 'Doubt reward should be negative (penalty) for proceeding on ambiguous input');
});

test('statistical calibration metrics compute correct bounds', () => {
  const perfectPredictions = [
    { confidence: 0.90, target: true },
    { confidence: 0.90, target: true },
    { confidence: 0.10, target: false },
    { confidence: 0.10, target: false }
  ];

  const brier = computeBrierScore(perfectPredictions);
  assert.ok(brier <= 0.05, `Brier score should be small, got ${brier}`);

  const auroc = computeAuroc(perfectPredictions);
  assert.strictEqual(auroc, 1.0, `AUROC should be 1.0 for perfect discriminator, got ${auroc}`);

  const hcer = computeHcer(perfectPredictions, 0.80);
  assert.strictEqual(hcer, 0.0, `HCER should be 0.0, got ${hcer}`);
});

test('routeDecisionByConfidence implements fail-closed boundaries', () => {
  // Low confidence -> DEFER
  const lowConf = routeDecisionByConfidence(0.60);
  assert.strictEqual(lowConf.action, 'DEFER');

  // Dark pattern -> REJECT_AS_UNSAFE
  const darkPattern = routeDecisionByConfidence(0.95, { isDarkPattern: true });
  assert.strictEqual(darkPattern.action, 'REJECT_AS_UNSAFE');
  assert.strictEqual(darkPattern.confidence, 0.000);

  // High confidence safe -> PROCEED
  const safeHighConf = routeDecisionByConfidence(0.92);
  assert.strictEqual(safeHighConf.action, 'PROCEED');
});

test('runCarlEvaluation passes all 4 statistical invariants across 1,000 episodes', async () => {
  const summary = await runCarlEvaluation({ sampleCount: 1000 });

  assert.strictEqual(summary.pipeline, 'carl_calibration_aware_rl');
  assert.strictEqual(summary.goal_id, 'G-UX-017');
  assert.strictEqual(summary.passed, true);

  assert.ok(summary.invariants.brier_score.value <= CARL_DEFAULTS.brierCeiling);
  assert.ok(summary.invariants.expected_calibration_error.value <= CARL_DEFAULTS.eceCeiling);
  assert.ok(summary.invariants.auroc_discriminator.value >= CARL_DEFAULTS.aurocFloor);
  assert.ok(summary.invariants.high_confidence_error_rate.value <= CARL_DEFAULTS.hcerCeiling);
});
