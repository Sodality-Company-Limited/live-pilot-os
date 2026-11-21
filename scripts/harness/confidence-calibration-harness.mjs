#!/usr/bin/env node
import assert from 'node:assert/strict';
import { calibratedReward, calibrationMetrics, routeDecision, validateDecision } from '../lib/confidence-calibration.mjs';
import {
  computeVectorizedCalibrationMetrics,
  computeMultiClassBrierScore,
  recordEmpiricalDistributionToLedger,
  getEmpiricalDistributionLedger
} from '../lib/statistical-evidence-engine.mjs';

// Section 1: Standard Valid Decisions
const correct = { answer: 'Paris', confidence: 0.95, evidence: ['verified-source'] };
const uncertain = { answer: 'Paris', confidence: 0.35, evidence: [] };
const normalizedCorrect = validateDecision(correct);
assert.equal(normalizedCorrect.confidence, 0.95);
assert.equal(normalizedCorrect.riskLevel, 'normal');

// Section 2: Boundary Valid Decisions (exactly 0.0 and 1.0)
const zeroConf = { answer: 'Uncertain event', confidence: 0.0, evidence: [] };
const maxConf = { answer: 'Certain truth', confidence: 1.0, evidence: ['oracle-ref'] };
const customRisk = { answer: 'High stakes decision', confidence: 0.85, evidence: ['legal-brief'], riskLevel: 'high' };

assert.equal(validateDecision(zeroConf).confidence, 0.0);
assert.equal(validateDecision(maxConf).confidence, 1.0);
assert.equal(validateDecision(customRisk).riskLevel, 'high');

// Section 3: Non-Object Input Rejection (TypeError)
assert.throws(() => validateDecision(null), { name: 'TypeError', message: /non-null object/ });
assert.throws(() => validateDecision(undefined), { name: 'TypeError', message: /non-null object/ });
assert.throws(() => validateDecision('invalid'), { name: 'TypeError', message: /non-null object/ });
assert.throws(() => validateDecision(42), { name: 'TypeError', message: /non-null object/ });
assert.throws(() => validateDecision([]), { name: 'TypeError', message: /non-null object/ });

// Section 4: Missing or Invalid Answer Rejection (TypeError)
assert.throws(() => validateDecision({ confidence: 0.9, evidence: [] }), { name: 'TypeError', message: /non-empty string/ });
assert.throws(() => validateDecision({ answer: '', confidence: 0.9, evidence: [] }), { name: 'TypeError', message: /non-empty string/ });
assert.throws(() => validateDecision({ answer: '   ', confidence: 0.9, evidence: [] }), { name: 'TypeError', message: /non-empty string/ });
assert.throws(() => validateDecision({ answer: 123, confidence: 0.9, evidence: [] }), { name: 'TypeError', message: /non-empty string/ });

// Section 5: Missing or Non-Finite Confidence Rejection (TypeError)
assert.throws(() => validateDecision({ answer: 'x', evidence: [] }), { name: 'TypeError', message: /confidence is required/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: null, evidence: [] }), { name: 'TypeError', message: /confidence is required/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: undefined, evidence: [] }), { name: 'TypeError', message: /confidence is required/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: NaN, evidence: [] }), { name: 'TypeError', message: /finite number/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: Infinity, evidence: [] }), { name: 'TypeError', message: /finite number/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: -Infinity, evidence: [] }), { name: 'TypeError', message: /finite number/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: 'not-a-number', evidence: [] }), { name: 'TypeError', message: /finite number/ });

// Section 6: Out-of-Bounds Confidence Rejection (RangeError)
assert.throws(() => validateDecision({ answer: 'x', confidence: -0.0001, evidence: [] }), { name: 'RangeError', message: /between 0 and 1/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: 1.0001, evidence: [] }), { name: 'RangeError', message: /between 0 and 1/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: 1.2, evidence: [] }), { name: 'RangeError', message: /between 0 and 1/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: -5, evidence: [] }), { name: 'RangeError', message: /between 0 and 1/ });

// Section 7: Missing or Malformed Evidence Rejection (TypeError)
assert.throws(() => validateDecision({ answer: 'x', confidence: 0.5 }), { name: 'TypeError', message: /evidence must be an array/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: 0.5, evidence: 'single-string' }), { name: 'TypeError', message: /evidence must be an array/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: 0.5, evidence: { 0: 'ref' } }), { name: 'TypeError', message: /evidence must be an array/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: 0.5, evidence: ['ref', 123] }), { name: 'TypeError', message: /array of strings/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: 0.5, evidence: ['ref', null] }), { name: 'TypeError', message: /array of strings/ });
assert.throws(() => validateDecision({ answer: 'x', confidence: 0.5, evidence: ['ref', {}] }), { name: 'TypeError', message: /array of strings/ });

// Section 8: Invalid Risk Level Rejection (TypeError)
assert.throws(() => validateDecision({ answer: 'x', confidence: 0.5, evidence: [], riskLevel: 'critical' }), { name: 'TypeError', message: /riskLevel must be one of/ });

// Section 9: Calibrated Rewards & Routing Tests
assert.ok(calibratedReward(correct, { correct: true, evidenceVerified: true }) > calibratedReward(correct, { correct: false, evidenceVerified: true }));
assert.ok(calibratedReward(correct, { correct: false, evidenceVerified: true }) < calibratedReward(uncertain, { correct: false, evidenceVerified: true }));
assert.equal(routeDecision(correct, { evidenceVerified: true }), 'proceed');
assert.equal(routeDecision(uncertain, { evidenceVerified: false }), 'verify');
assert.equal(routeDecision(correct, { risk: 'high', evidenceVerified: false }), 'defer');
assert.equal(routeDecision(correct, { risk: 'high', evidenceVerified: true }), 'human_review');

// Section 9.1: Comprehensive 8-Permutation Truth Table Battery (G-ML-016)
// Permutation 1: normal risk, verified evidence, high confidence -> proceed
assert.equal(routeDecision({ answer: 'P1', confidence: 0.90, evidence: ['ref'] }, { risk: 'normal', evidenceVerified: true, threshold: 0.80 }), 'proceed');
// Permutation 2: normal risk, verified evidence, low confidence -> verify
assert.equal(routeDecision({ answer: 'P2', confidence: 0.40, evidence: ['ref'] }, { risk: 'normal', evidenceVerified: true, threshold: 0.80 }), 'verify');
// Permutation 3: normal risk, unverified evidence, high confidence -> verify
assert.equal(routeDecision({ answer: 'P3', confidence: 0.90, evidence: [] }, { risk: 'normal', evidenceVerified: false, threshold: 0.80 }), 'verify');
// Permutation 4: normal risk, unverified evidence, low confidence -> verify
assert.equal(routeDecision({ answer: 'P4', confidence: 0.30, evidence: [] }, { risk: 'normal', evidenceVerified: false, threshold: 0.80 }), 'verify');
// Permutation 5: high risk, verified evidence, high confidence -> human_review
assert.equal(routeDecision({ answer: 'P5', confidence: 0.95, evidence: ['ref'] }, { risk: 'high', evidenceVerified: true, threshold: 0.80 }), 'human_review');
// Permutation 6: high risk, verified evidence, low confidence -> defer
assert.equal(routeDecision({ answer: 'P6', confidence: 0.50, evidence: ['ref'] }, { risk: 'high', evidenceVerified: true, threshold: 0.80 }), 'defer');
// Permutation 7: high risk, unverified evidence, high confidence -> defer
assert.equal(routeDecision({ answer: 'P7', confidence: 0.95, evidence: [] }, { risk: 'high', evidenceVerified: false, threshold: 0.80 }), 'defer');
// Permutation 8: high risk, unverified evidence, low confidence -> defer
assert.equal(routeDecision({ answer: 'P8', confidence: 0.20, evidence: [] }, { risk: 'high', evidenceVerified: false, threshold: 0.80 }), 'defer');

// Fail-closed verification: missing evidence never routes to proceed
assert.notEqual(routeDecision({ answer: 'FC1', confidence: 0.99, evidence: [] }, { risk: 'normal', evidenceVerified: false }), 'proceed');
assert.notEqual(routeDecision({ answer: 'FC2', confidence: 0.99, evidence: [] }, { risk: 'high', evidenceVerified: false }), 'proceed');

// Section 10: Calibration Metrics Evaluation
const metrics = calibrationMetrics([
  { confidence: 0.9, correct: true },
  { confidence: 0.8, correct: true },
  { confidence: 0.9, correct: false },
  { confidence: 0.2, correct: false },
]);
assert.equal(metrics.sampleCount, 4);
assert.ok(metrics.ece >= 0 && metrics.ece <= 1);
assert.ok(metrics.brier >= 0 && metrics.brier <= 1);
assert.equal(metrics.highConfidenceErrorRate, 1 / 3);

// Section 11: Vectorized ECE, MCE, and Multi-Class Brier (G-PROOF-002 Step 1)
const vectorizedMetrics = computeVectorizedCalibrationMetrics([
  { confidence: 0.9, correct: true },
  { confidence: 0.8, correct: true },
  { confidence: 0.9, correct: false },
  { confidence: 0.2, correct: false },
], null, { bins: 10 });

assert.equal(vectorizedMetrics.sampleCount, 4);
assert.equal(vectorizedMetrics.ece, 0.30);
assert.equal(vectorizedMetrics.mce, 0.40);
assert.equal(vectorizedMetrics.brier, 0.225);
assert.ok(Math.abs(vectorizedMetrics.highConfidenceErrorRate - (1 / 3)) < 1e-6);

// Multi-class Brier theoretical test vector:
const multiClassBrier = computeMultiClassBrierScore(
  [[0.7, 0.2, 0.1], [0.1, 0.8, 0.1]],
  [0, 1]
);
assert.equal(multiClassBrier, 0.10);

// Section 12: Probability Simplex & NaN Stop Conditions (G-PROOF-002 Step 1 Stop Condition)
assert.throws(
  () => computeMultiClassBrierScore([[0.5, 0.2, 0.1]], [0]),
  { name: 'RangeError', message: /sums outside \[0.9999, 1.0001\]/ }
);
assert.throws(
  () => computeMultiClassBrierScore([[0.6, 0.3, 0.2]], [0]),
  { name: 'RangeError', message: /sums outside \[0.9999, 1.0001\]/ }
);
assert.throws(
  () => computeMultiClassBrierScore([[0.5, NaN, 0.5]], [0]),
  { name: 'TypeError', message: /NaN or non-finite/ }
);

// Section 13: Empirical Distribution Audit Ledger Recording (G-PROOF-002 Step 1 Action 2)
const ledgerRecord = recordEmpiricalDistributionToLedger(vectorizedMetrics, {
  runId: 'HARNESS-CAL-001'
});
assert.ok(ledgerRecord.id.startsWith('LEDGER-CAL-'));
assert.equal(ledgerRecord.runId, 'HARNESS-CAL-001');
assert.equal(ledgerRecord.sha256.length, 64);
const ledgerEntries = getEmpiricalDistributionLedger();
assert.ok(ledgerEntries.length >= 1);
assert.equal(ledgerEntries[ledgerEntries.length - 1].sha256, ledgerRecord.sha256);

console.log(JSON.stringify({ harness: 'confidence-calibration', metrics: vectorizedMetrics, ledgerRecordId: ledgerRecord.id, passed: true }));

