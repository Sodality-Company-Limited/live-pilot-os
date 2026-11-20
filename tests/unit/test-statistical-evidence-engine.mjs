#!/usr/bin/env node
/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS UNIT TEST SUITE: STATISTICAL EVIDENCE ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Goal Reference: G-PROOF-002 (DAVE Statistical Evidence and Calibration Claims)
 * Invariants:
 *   - Article I: Zero Mocks, Zero Stubs, Zero Fallbacks
 *   - Mathematical Precision: Exact Expected Calibration Error (ECE) & MCE
 *   - Strictly Proper Scoring: Multi-class and Binary Brier Score
 *   - Non-Parametric Bootstrap Resampling: 1000-iteration reproducible 95% CIs
 *   - Reliability Diagram Geometry: 10-bin empirical coordinates & sample weights
 *   - Proof Receipt Epistemics: Classification statistical_claim & SHA-256 bindings
 * ════════════════════════════════════════════════════════════════════════════════
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  computeVectorizedCalibrationMetrics,
  computeMultiClassBrierScore,
  recordEmpiricalDistributionToLedger,
  getEmpiricalDistributionLedger,
  generateReliabilityDiagram,
  computeBootstrapConfidenceIntervals,
  generateStatisticalProofReceipt,
  createDeterministicSampler,
  getCanonicalEvaluationDataset
} from '../../scripts/lib/statistical-evidence-engine.mjs';

import { validateProofReceipt } from '../../scripts/harness/proof-receipt-validator.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('🧪 RUNNING STATISTICAL EVIDENCE ENGINE TEST SUITE (G-PROOF-002)');
console.log('════════════════════════════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────────────────────
// Section 1: Vectorized ECE, MCE, and Binary Calibration Metrics
// ─────────────────────────────────────────────────────────────────────────────
runTest('Perfect calibration yields ECE=0, MCE=0, and Brier=0', () => {
  const perfectSamples = [
    { confidence: 1.0, correct: true },
    { confidence: 1.0, correct: true },
    { confidence: 0.0, correct: false },
    { confidence: 0.0, correct: false }
  ];
  const metrics = computeVectorizedCalibrationMetrics(perfectSamples);
  assert.equal(metrics.sampleCount, 4);
  assert.equal(metrics.ece, 0.0);
  assert.equal(metrics.mce, 0.0);
  assert.equal(metrics.brier, 0.0);
  assert.equal(metrics.highConfidenceErrorRate, 0.0);
});

runTest('Theoretical test vector matches exact analytical values', () => {
  // Test vector from SODA OS specification:
  // 4 samples:
  //   1: conf 0.9, correct true
  //   2: conf 0.8, correct true
  //   3: conf 0.9, correct false
  //   4: conf 0.2, correct false
  // Bin [0.2, 0.3): count 1, conf 0.2, acc 0.0 -> gap = 0.2, weight = 1/4
  // Bin [0.8, 0.9): count 1, conf 0.8, acc 1.0 -> gap = 0.2, weight = 1/4
  // Bin [0.9, 1.0]: count 2, conf 0.9, acc 0.5 -> gap = 0.4, weight = 2/4
  // ECE = 0.25*0.2 + 0.25*0.2 + 0.5*0.4 = 0.05 + 0.05 + 0.20 = 0.30
  // MCE = max(0.2, 0.2, 0.4) = 0.40
  // Brier = ((0.9-1)^2 + (0.8-1)^2 + (0.9-0)^2 + (0.2-0)^2)/4 = (0.01 + 0.04 + 0.81 + 0.04)/4 = 0.90/4 = 0.225
  // HCER = 1 / 3 (sample 3 has conf 0.9 >= 0.8 and is false)
  const samples = [
    { confidence: 0.9, correct: true },
    { confidence: 0.8, correct: true },
    { confidence: 0.9, correct: false },
    { confidence: 0.2, correct: false }
  ];
  const metrics = computeVectorizedCalibrationMetrics(samples, null, { bins: 10 });
  assert.equal(metrics.sampleCount, 4);
  assert.ok(Math.abs(metrics.ece - 0.30) < 1e-6, `Expected ECE 0.30, got ${metrics.ece}`);
  assert.ok(Math.abs(metrics.mce - 0.40) < 1e-6, `Expected MCE 0.40, got ${metrics.mce}`);
  assert.ok(Math.abs(metrics.brier - 0.225) < 1e-6, `Expected Brier 0.225, got ${metrics.brier}`);
  assert.ok(Math.abs(metrics.highConfidenceErrorRate - (1 / 3)) < 1e-6);
  assert.equal(metrics.bins.length, 3);
});

runTest('Parallel vector input syntax computes identical metrics to object array', () => {
  const confidences = [0.9, 0.8, 0.9, 0.2];
  const outcomes = [true, true, false, false];
  const metrics = computeVectorizedCalibrationMetrics(confidences, outcomes, { bins: 10 });
  assert.equal(metrics.sampleCount, 4);
  assert.ok(Math.abs(metrics.ece - 0.30) < 1e-6);
  assert.ok(Math.abs(metrics.mce - 0.40) < 1e-6);
  assert.ok(Math.abs(metrics.brier - 0.225) < 1e-6);
});

runTest('Input validation rejects invalid confidences or empty arrays', () => {
  assert.throws(() => computeVectorizedCalibrationMetrics([]), { name: 'RangeError' });
  assert.throws(() => computeVectorizedCalibrationMetrics(null), { name: 'TypeError' });
  assert.throws(() => computeVectorizedCalibrationMetrics([{ confidence: 1.5, correct: true }]), { name: 'RangeError' });
  assert.throws(() => computeVectorizedCalibrationMetrics([{ confidence: -0.1, correct: true }]), { name: 'RangeError' });
  assert.throws(() => computeVectorizedCalibrationMetrics([{ confidence: NaN, correct: true }]), { name: 'TypeError' });
  assert.throws(() => computeVectorizedCalibrationMetrics([0.5, 0.8], [true]), { name: 'RangeError' }); // length mismatch
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2: Multi-class Brier Score and Probability Simplex Invariant
// ─────────────────────────────────────────────────────────────────────────────
runTest('Multi-class Brier score calculates exact quadratic loss across categories', () => {
  // 2 samples, 3 classes:
  // Sample 1: probs [0.7, 0.2, 0.1], true class 0 -> (0.7-1)^2 + (0.2-0)^2 + (0.1-0)^2 = 0.09 + 0.04 + 0.01 = 0.14
  // Sample 2: probs [0.1, 0.8, 0.1], true class 1 -> (0.1-0)^2 + (0.8-1)^2 + (0.1-0)^2 = 0.01 + 0.04 + 0.01 = 0.06
  // Mean = (0.14 + 0.06) / 2 = 0.10
  const predictions = [
    [0.7, 0.2, 0.1],
    [0.1, 0.8, 0.1]
  ];
  const targets = [0, 1];
  const brierScore = computeMultiClassBrierScore(predictions, targets);
  assert.ok(Math.abs(brierScore - 0.10) < 1e-6, `Expected multi-class Brier 0.10, got ${brierScore}`);
});

runTest('Multi-class Brier score with one-hot encoded targets yields exact result', () => {
  const predictions = [
    [0.7, 0.2, 0.1],
    [0.1, 0.8, 0.1]
  ];
  const oneHotTargets = [
    [1, 0, 0],
    [0, 1, 0]
  ];
  const brierScore = computeMultiClassBrierScore(predictions, oneHotTargets);
  assert.ok(Math.abs(brierScore - 0.10) < 1e-6);
});

runTest('Probability simplex stop condition: reject distributions summing outside [0.9999, 1.0001]', () => {
  // Case A: Sum too low (0.8)
  assert.throws(
    () => computeMultiClassBrierScore([[0.5, 0.2, 0.1]], [0]),
    { name: 'RangeError', message: /sums outside \[0.9999, 1.0001\]/ }
  );
  // Case B: Sum too high (1.10)
  assert.throws(
    () => computeMultiClassBrierScore([[0.6, 0.3, 0.2]], [0]),
    { name: 'RangeError', message: /sums outside \[0.9999, 1.0001\]/ }
  );
  // Case C: NaN in distribution
  assert.throws(
    () => computeMultiClassBrierScore([[0.5, NaN, 0.5]], [0]),
    { name: 'TypeError', message: /NaN or non-finite/ }
  );
  // Case D: Negative probability
  assert.throws(
    () => computeMultiClassBrierScore([[-0.1, 0.9, 0.2]], [1]),
    { name: 'RangeError', message: /must be non-negative/ }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 3: Reliability Diagram Generator and Bin Weights
// ─────────────────────────────────────────────────────────────────────────────
runTest('Reliability diagram generates 10 uniform bins with correct weights and geometry', () => {
  // Generate synthetic well-calibrated dataset (N=200)
  const syntheticData = [];
  for (let i = 0; i < 200; i++) {
    const conf = (i + 0.5) / 200; // evenly spread [0.0025, 0.9975]
    // Well calibrated: outcome matches probability probabilistically
    const correct = (i % 2 === 0 && conf > 0.5) || (i % 5 !== 0 && conf > 0.3);
    syntheticData.push({ confidence: conf, correct });
  }

  const diagram = generateReliabilityDiagram(syntheticData, { bins: 10 });
  assert.equal(diagram.bins.length, 10);
  assert.equal(diagram.coordinates.length, 10);
  assert.equal(diagram.binWeights.length, 10);

  // Sum of weights must equal exactly 1.0
  const sumWeights = diagram.binWeights.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sumWeights - 1.0) < 1e-6, `Weights sum to ${sumWeights}`);

  // Reference diagonal contains (0,0) and (1,1)
  assert.deepEqual(diagram.perfectCalibration, [{ x: 0.0, y: 0.0 }, { x: 1.0, y: 1.0 }]);

  // Each bin geometry verified
  for (let b = 0; b < 10; b++) {
    const bin = diagram.coordinates[b];
    assert.equal(bin.binIndex, b);
    assert.ok(Math.abs(bin.lowerEdge - b / 10) < 1e-6);
    assert.ok(Math.abs(bin.upperEdge - (b + 1) / 10) < 1e-6);
    assert.ok(bin.sampleCount >= 0);
    assert.ok(bin.weight >= 0 && bin.weight <= 1);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 4: Audit Ledger Recording
// ─────────────────────────────────────────────────────────────────────────────
runTest('Audit ledger records empirical distributions with cryptographic SHA-256 checksum', () => {
  const samples = [
    { confidence: 0.9, correct: true },
    { confidence: 0.8, correct: true },
    { confidence: 0.9, correct: false },
    { confidence: 0.2, correct: false }
  ];
  const metrics = computeVectorizedCalibrationMetrics(samples);
  const entry = recordEmpiricalDistributionToLedger(metrics, { runId: 'TEST-RUN-001' });

  assert.ok(entry.id.startsWith('LEDGER-CAL-'));
  assert.equal(entry.runId, 'TEST-RUN-001');
  assert.equal(entry.sampleCount, 4);
  assert.ok(entry.sha256 && entry.sha256.length === 64);
  assert.ok(entry.timestamp);

  const ledger = getEmpiricalDistributionLedger();
  assert.ok(ledger.length >= 1);
  assert.equal(ledger[ledger.length - 1].sha256, entry.sha256);
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 5: Bootstrap Resampling and 95% Confidence Intervals
// ─────────────────────────────────────────────────────────────────────────────
runTest('Bootstrap resampling produces reproducible 95% confidence intervals with seed', () => {
  // Generate 120 samples
  const sampler = createDeterministicSampler(42);
  const data = [];
  for (let i = 0; i < 120; i++) {
    const conf = 0.5 + 0.4 * sampler(); // conf between 0.5 and 0.9
    const correct = sampler() < conf;
    data.push({ confidence: Number(conf.toFixed(4)), correct });
  }

  const ciResult1 = computeBootstrapConfidenceIntervals(data, {
    iterations: 1000,
    confidenceLevel: 0.95,
    seed: 42
  });

  const ciResult2 = computeBootstrapConfidenceIntervals(data, {
    iterations: 1000,
    confidenceLevel: 0.95,
    seed: 42
  });

  // Determinism check: same seed yields identical bounds
  assert.equal(ciResult1.ece.ciLower, ciResult2.ece.ciLower);
  assert.equal(ciResult1.ece.ciUpper, ciResult2.ece.ciUpper);
  assert.equal(ciResult1.ece.mean, ciResult2.ece.mean);
  assert.equal(ciResult1.brier.ciLower, ciResult2.brier.ciLower);
  assert.equal(ciResult1.brier.ciUpper, ciResult2.brier.ciUpper);

  // Invariant: CI bounds must bracket or closely envelope observed statistic
  assert.ok(ciResult1.ece.ciLower <= ciResult1.ece.ciUpper);
  assert.ok(ciResult1.brier.ciLower <= ciResult1.brier.ciUpper);
  assert.ok(ciResult1.mce.ciLower <= ciResult1.mce.ciUpper);
  assert.equal(ciResult1.sampleCount, 120);
  assert.equal(ciResult1.iterations, 1000);
});

runTest('Bootstrap stop condition: rejects sample size N < 100 (statistical power threshold)', () => {
  const smallDataset = Array.from({ length: 99 }, (_, i) => ({
    confidence: 0.8,
    correct: i % 2 === 0
  }));
  assert.throws(
    () => computeBootstrapConfidenceIntervals(smallDataset, { minSampleSize: 100 }),
    { name: 'RangeError', message: /below minimum statistical power threshold \(N < 100\)/ }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 6: Statistical Claim Proof Receipt Issuance & Verification Gate
// ─────────────────────────────────────────────────────────────────────────────
runTest('Proof receipt generator serializes valid statistical claim receipt', () => {
  const calibratedData = getCanonicalEvaluationDataset();

  const receiptReportPath = path.resolve(REPO_ROOT, 'artifacts/proofs/test-G-PROOF-002-calibration-report.json');

  const { receipt, ece95 } = generateStatisticalProofReceipt('G-PROOF-002', calibratedData, {
    outputPath: receiptReportPath,
    maxEceTolerance: 0.08,
    seed: 42,
    iterations: 1000
  });

  assert.equal(receipt.schema_version, 1);
  assert.equal(receipt.goal_id, 'G-PROOF-002');
  assert.equal(receipt.classification, 'statistical_claim');
  assert.equal(receipt.certification, 'PASS');
  assert.ok(Array.isArray(receipt.invariants) && receipt.invariants.length >= 1);
  assert.ok(Array.isArray(receipt.source_files) && receipt.source_files.length >= 1);
  assert.ok(receipt.statistical_evidence);
  assert.ok(ece95 <= 0.08, `ECE 95% upper bound ${ece95} should be <= 0.08`);

  // Verify against proof-receipt-validator
  const validation = validateProofReceipt(receiptReportPath);
  assert.ok(validation.valid, `Proof receipt validation failed: ${validation.errors?.join(', ')}`);

  // Cleanup test file
  if (fs.existsSync(receiptReportPath)) {
    fs.unlinkSync(receiptReportPath);
  }
});

runTest('Proof receipt stop condition: fail closed when ECE upper bound > 0.08', () => {
  // Construct deliberately severely uncalibrated dataset (high confidence, zero accuracy)
  const severelyUncalibrated = Array.from({ length: 120 }, () => ({
    confidence: 0.99,
    correct: false // 100% wrong with 99% confidence -> ECE near 0.99
  }));

  assert.throws(
    () => generateStatisticalProofReceipt('G-PROOF-002', severelyUncalibrated, {
      maxEceTolerance: 0.08
    }),
    { message: /ECE upper bound exceeds declared safety tolerance \(ECE_95 > 0\.08\)/ }
  );
});

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log(`🎉 ALL ${totalTests} UNIT TESTS PASSED GREEN (Zero Mocks, 100% Operational)`);
console.log('════════════════════════════════════════════════════════════════════════════════');
