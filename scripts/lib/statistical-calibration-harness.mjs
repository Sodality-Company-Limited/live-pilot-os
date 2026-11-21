#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS STATISTICAL CALIBRATION HARNESS (G-UX-020)
 * ════════════════════════════════════════════════════════════════════════════════
 * Mathematical Framework for Calibrated Confidence & Uncertainty Verification.
 *
 * Invariants & Bounds Enforced:
 *   1. 10-bin Expected Calibration Error (ECE): ECE <= 0.050
 *   2. Strictly Proper Quadratic Brier Score: Brier <= 0.150
 *   3. Area Under the ROC Curve (AUROC): AUROC >= 0.880
 *   4. High-Confidence Error Rate (HCER on c >= 0.80): HCER <= 0.010
 *   5. 1,000 Bootstrap Resampling: 95% Confidence Intervals & Empirical p-values
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Deterministic Lehmer / Park-Miller PRNG (modulus 2^31 - 1).
 * @param {number} [seed=42]
 * @returns {() => number} Random float in [0, 1)
 */
export function createDeterministicSampler(seed = 42) {
  let s = Math.floor(Math.abs(Number(seed) || 42)) % 2147483647;
  if (s === 0) s = 1;
  return function nextRandom() {
    s = (s * 48271) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Computes Area Under the ROC Curve (AUROC) discriminating correct (1) vs error (0).
 * Uses exact rank-order trapezoidal computation in O(N log N).
 *
 * @param {Array<number>} confidences - Model confidence scores in [0, 1]
 * @param {Array<boolean|number>} outcomes - Ground truth binary correctness (1=correct, 0=error)
 * @returns {number} AUROC score in [0, 1]
 */
export function computeAuroc(confidences, outcomes) {
  if (!Array.isArray(confidences) || !Array.isArray(outcomes)) {
    throw new TypeError('Confidences and outcomes must be arrays');
  }
  if (confidences.length !== outcomes.length) {
    throw new RangeError(`Length mismatch: confidences (${confidences.length}) vs outcomes (${outcomes.length})`);
  }
  const n = confidences.length;
  if (n === 0) {
    throw new RangeError('Arrays must not be empty');
  }

  // Pair scores with outcomes
  const paired = new Array(n);
  let posCount = 0;
  let negCount = 0;

  for (let i = 0; i < n; i++) {
    const c = Number(confidences[i]);
    if (!Number.isFinite(c) || c < 0 || c > 1) {
      throw new RangeError(`Invalid confidence at index ${i}: ${confidences[i]}`);
    }
    const y = Boolean(outcomes[i]) ? 1 : 0;
    if (y === 1) posCount++;
    else negCount++;
    paired[i] = { score: c, label: y };
  }

  if (posCount === 0 || negCount === 0) {
    // If all positive or all negative, discrimination is undefined
    return 1.0;
  }

  // Sort pairs by score descending
  paired.sort((a, b) => b.score - a.score);

  // Mann-Whitney U / Trapezoidal Integration handling tied scores
  let tp = 0;
  let fp = 0;
  let prevTp = 0;
  let prevFp = 0;
  let aurocArea = 0.0;

  let i = 0;
  while (i < n) {
    const currentScore = paired[i].score;
    let batchTp = 0;
    let batchFp = 0;

    while (i < n && paired[i].score === currentScore) {
      if (paired[i].label === 1) batchTp++;
      else batchFp++;
      i++;
    }

    tp += batchTp;
    fp += batchFp;

    // Trapezoid area: (current_fp - prev_fp) * (current_tp + prev_tp) / 2
    aurocArea += (fp - prevFp) * (tp + prevTp) / 2.0;

    prevTp = tp;
    prevFp = fp;
  }

  const finalAuroc = aurocArea / (posCount * negCount);
  return Number(finalAuroc.toFixed(6));
}

/**
 * Computes Wilson score interval for a binomial proportion.
 *
 * @param {number} k - Number of positive events
 * @param {number} n - Total number of trials
 * @param {number} [confidenceLevel=0.95] - e.g. 0.95
 * @returns {{ point: number, lower: number, upper: number, margin: number }}
 */
export function computeWilsonScoreInterval(k, n, confidenceLevel = 0.95) {
  if (n <= 0) {
    return { point: 0, lower: 0, upper: 0, margin: 0 };
  }
  const p = Math.max(0, Math.min(1, k / n));
  // Standard normal quantile z for confidenceLevel (e.g. 1.95996 for 95%)
  let z = 1.95996;
  if (Math.abs(confidenceLevel - 0.99) < 0.005) z = 2.57583;
  else if (Math.abs(confidenceLevel - 0.90) < 0.005) z = 1.64485;

  const z2 = z * z;
  const denominator = 1.0 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const rad = (z * Math.sqrt((p * (1.0 - p) + z2 / (4 * n)) / n)) / denominator;

  const lower = Math.max(0, center - rad);
  const upper = Math.min(1, center + rad);

  return {
    point: Number(p.toFixed(6)),
    lower: Number(lower.toFixed(6)),
    upper: Number(upper.toFixed(6)),
    margin: Number(((upper - lower) / 2).toFixed(6))
  };
}

/**
 * Computes comprehensive calibration metrics:
 *   - ECE (10 uniform bins)
 *   - MCE
 *   - Brier score
 *   - AUROC
 *   - HCER (High-Confidence Error Rate on c >= hcerThreshold)
 *   - Bin breakdown
 *
 * @param {Array<object>|Array<number>} recordsOrConfidences
 * @param {Array<boolean|number>} [optionalOutcomes=null]
 * @param {object} [options={}]
 * @returns {object} Full calibration metrics
 */
export function computeCalibrationMetrics(recordsOrConfidences, optionalOutcomes = null, options = {}) {
  const binsCount = Number(options.bins) || 10;
  const hcerThreshold = options.hcerThreshold !== undefined ? Number(options.hcerThreshold) : 0.80;

  let confidences = [];
  let outcomes = [];

  if (Array.isArray(optionalOutcomes)) {
    confidences = recordsOrConfidences.map(Number);
    outcomes = optionalOutcomes.map(Boolean);
  } else if (Array.isArray(recordsOrConfidences)) {
    for (const rec of recordsOrConfidences) {
      if (typeof rec === 'number') {
        confidences.push(rec);
      } else if (rec && typeof rec === 'object') {
        confidences.push(Number(rec.confidence));
        const out = rec.correct !== undefined ? rec.correct :
                    rec.groundTruthOutcome !== undefined ? rec.groundTruthOutcome :
                    rec.outcome !== undefined ? rec.outcome : rec.label;
        outcomes.push(Boolean(out));
      }
    }
  }

  const n = confidences.length;
  if (n === 0) {
    throw new RangeError('Input sample records must not be empty');
  }

  // Bin accumulators
  const binBuckets = Array.from({ length: binsCount }, (_, idx) => ({
    binIndex: idx,
    lowerEdge: idx / binsCount,
    upperEdge: (idx + 1) / binsCount,
    binCenter: (idx + 0.5) / binsCount,
    count: 0,
    sumConfidence: 0.0,
    sumAccuracy: 0.0
  }));

  let brierSum = 0.0;
  let highConfCount = 0;
  let highConfErrorCount = 0;

  for (let i = 0; i < n; i++) {
    const c = confidences[i];
    const y = outcomes[i] ? 1.0 : 0.0;

    brierSum += (c - y) * (c - y);

    if (c >= hcerThreshold) {
      highConfCount++;
      if (y === 0.0) {
        highConfErrorCount++;
      }
    }

    const bIndex = Math.min(binsCount - 1, Math.floor(c * binsCount));
    const bucket = binBuckets[bIndex];
    bucket.count += 1;
    bucket.sumConfidence += c;
    bucket.sumAccuracy += y;
  }

  const brier = brierSum / n;
  const hcer = highConfCount > 0 ? highConfErrorCount / highConfCount : 0.0;

  let ece = 0.0;
  let mce = 0.0;
  const populatedBins = [];

  for (let b = 0; b < binsCount; b++) {
    const bucket = binBuckets[b];
    if (bucket.count > 0) {
      const meanConfidence = bucket.sumConfidence / bucket.count;
      const accuracy = bucket.sumAccuracy / bucket.count;
      const weight = bucket.count / n;
      const gap = Math.abs(accuracy - meanConfidence);

      ece += weight * gap;
      if (gap > mce) mce = gap;

      populatedBins.push({
        binIndex: bucket.binIndex,
        lowerEdge: bucket.lowerEdge,
        upperEdge: bucket.upperEdge,
        binCenter: bucket.binCenter,
        sampleCount: bucket.count,
        weight: Number(weight.toFixed(6)),
        meanConfidence: Number(meanConfidence.toFixed(6)),
        empiricalAccuracy: Number(accuracy.toFixed(6)),
        calibrationGap: Number(gap.toFixed(6)),
        underconfident: accuracy > meanConfidence,
        overconfident: accuracy < meanConfidence
      });
    }
  }

  const auroc = computeAuroc(confidences, outcomes);

  return {
    sampleCount: n,
    binsCount,
    ece: Number(ece.toFixed(6)),
    mce: Number(mce.toFixed(6)),
    brier: Number(brier.toFixed(6)),
    auroc: Number(auroc.toFixed(6)),
    highConfidenceErrorRate: Number(hcer.toFixed(6)),
    highConfidenceCount: highConfCount,
    highConfidenceErrors: highConfErrorCount,
    bins: populatedBins
  };
}

/**
 * Runs 1,000 non-parametric bootstrap iterations to compute empirical confidence
 * intervals and empirical p-values for calibration metrics.
 *
 * @param {Array<object>|Array<number>} recordsOrConfidences
 * @param {Array<boolean|number>} [optionalOutcomes=null]
 * @param {object} [options={}]
 * @returns {object} Bootstrap evaluation report
 */
export function runBootstrapCalibrationEvaluation(recordsOrConfidences, optionalOutcomes = null, options = {}) {
  const iterations = Number(options.iterations) || 1000;
  const seed = options.seed !== undefined ? Number(options.seed) : 42;
  const confidenceLevel = Number(options.confidenceLevel) || 0.95;
  const binsCount = Number(options.bins) || 10;
  const eceThreshold = options.eceThreshold !== undefined ? Number(options.eceThreshold) : 0.050;

  let confidences = [];
  let outcomes = [];

  if (Array.isArray(optionalOutcomes)) {
    confidences = recordsOrConfidences.map(Number);
    outcomes = optionalOutcomes.map(Boolean);
  } else if (Array.isArray(recordsOrConfidences)) {
    for (const rec of recordsOrConfidences) {
      if (rec && typeof rec === 'object') {
        confidences.push(Number(rec.confidence));
        const out = rec.correct !== undefined ? rec.correct :
                    rec.groundTruthOutcome !== undefined ? rec.groundTruthOutcome :
                    rec.outcome !== undefined ? rec.outcome : rec.label;
        outcomes.push(Boolean(out));
      }
    }
  }

  const n = confidences.length;
  if (n === 0) {
    throw new RangeError('Bootstrap records cannot be empty');
  }

  const observed = computeCalibrationMetrics(confidences, outcomes, { bins: binsCount });
  const rng = createDeterministicSampler(seed);

  const eceSamples = new Float64Array(iterations);
  const brierSamples = new Float64Array(iterations);
  const aurocSamples = new Float64Array(iterations);
  const hcerSamples = new Float64Array(iterations);

  const resampleConf = new Float64Array(n);
  const resampleOut = new Uint8Array(n);

  let eceExceedCount = 0;

  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rng() * n);
      resampleConf[i] = confidences[idx];
      resampleOut[i] = outcomes[idx] ? 1 : 0;
    }

    const iterMetrics = computeCalibrationMetrics(Array.from(resampleConf), Array.from(resampleOut), { bins: binsCount });
    eceSamples[it] = iterMetrics.ece;
    brierSamples[it] = iterMetrics.brier;
    aurocSamples[it] = iterMetrics.auroc;
    hcerSamples[it] = iterMetrics.highConfidenceErrorRate;

    if (iterMetrics.ece > eceThreshold) {
      eceExceedCount++;
    }
  }

  function computeStats(samples, observedVal) {
    const sorted = Array.from(samples).sort((a, b) => a - b);
    let sum = 0;
    for (let i = 0; i < iterations; i++) sum += sorted[i];
    const mean = sum / iterations;

    let varSum = 0;
    for (let i = 0; i < iterations; i++) {
      const diff = sorted[i] - mean;
      varSum += diff * diff;
    }
    const stdErr = Math.sqrt(varSum / (iterations - 1));

    const lowerIdx = Math.floor(((1 - confidenceLevel) / 2) * iterations);
    const upperIdx = Math.min(iterations - 1, Math.floor((1 - (1 - confidenceLevel) / 2) * iterations));

    return {
      observed: observedVal,
      mean: Number(mean.toFixed(6)),
      stdErr: Number(stdErr.toFixed(6)),
      ciLower: Number(sorted[lowerIdx].toFixed(6)),
      ciUpper: Number(sorted[upperIdx].toFixed(6))
    };
  }

  const wilsonHcer = computeWilsonScoreInterval(observed.highConfidenceErrors, observed.highConfidenceCount, confidenceLevel);
  const empiricalPValue = Number(((eceExceedCount + 1) / (iterations + 1)).toFixed(6));

  return {
    iterations,
    sampleCount: n,
    seed,
    confidenceLevel,
    observed,
    bootstrap: {
      ece: computeStats(eceSamples, observed.ece),
      brier: computeStats(brierSamples, observed.brier),
      auroc: computeStats(aurocSamples, observed.auroc),
      hcer: computeStats(hcerSamples, observed.highConfidenceErrorRate)
    },
    wilsonHcerCi: wilsonHcer,
    empiricalPValueEceExceedsThreshold: empiricalPValue
  };
}

/**
 * Evaluates the full G-UX-020 Statistical Calibration Safety Gate:
 *   - ECE <= 0.050
 *   - Brier <= 0.150
 *   - AUROC >= 0.880
 *   - HCER <= 0.010
 *
 * @param {Array<object>} records
 * @param {object} [thresholds={}]
 * @returns {object} Evaluation gate verdict
 */
export function evaluateStatisticalCalibrationGate(records, thresholds = {}) {
  const eceCap = thresholds.eceMax !== undefined ? thresholds.eceMax : 0.050;
  const brierCap = thresholds.brierMax !== undefined ? thresholds.brierMax : 0.150;
  const aurocFloor = thresholds.aurocMin !== undefined ? thresholds.aurocMin : 0.880;
  const hcerCap = thresholds.hcerMax !== undefined ? thresholds.hcerMax : 0.010;

  const evalResult = runBootstrapCalibrationEvaluation(records, null, {
    iterations: thresholds.iterations || 1000,
    seed: thresholds.seed !== undefined ? thresholds.seed : 42,
    eceThreshold: eceCap
  });

  const { observed, bootstrap, empiricalPValueEceExceedsThreshold } = evalResult;

  const checks = [
    {
      gate: 'ECE_BOUND',
      invariant: 'ECE <= 0.050',
      observed: observed.ece,
      threshold: eceCap,
      passed: observed.ece <= eceCap
    },
    {
      gate: 'BRIER_BOUND',
      invariant: 'Brier <= 0.150',
      observed: observed.brier,
      threshold: brierCap,
      passed: observed.brier <= brierCap
    },
    {
      gate: 'AUROC_BOUND',
      invariant: 'AUROC >= 0.880',
      observed: observed.auroc,
      threshold: aurocFloor,
      passed: observed.auroc >= aurocFloor
    },
    {
      gate: 'HCER_BOUND',
      invariant: 'HCER (c >= 0.80) <= 0.010',
      observed: observed.highConfidenceErrorRate,
      threshold: hcerCap,
      passed: observed.highConfidenceErrorRate <= hcerCap
    },
    {
      gate: 'BOOTSTRAP_ECE_CI',
      invariant: 'ECE 95% CI Upper <= 0.055',
      observed: bootstrap.ece.ciUpper,
      threshold: 0.055,
      passed: bootstrap.ece.ciUpper <= 0.055
    }
  ];

  const allPassed = checks.every(c => c.passed);

  return {
    passed: allPassed,
    verdict: allPassed ? 'PASS_CALIBRATION_GATE' : 'FAIL_CALIBRATION_GATE',
    checks,
    metrics: observed,
    bootstrap,
    empiricalPValue: empiricalPValueEceExceedsThreshold
  };
}

/**
 * Generates a realistic calibrated test distribution matching G-UX-020 target bounds.
 * @param {object} [options={}]
 * @returns {Array<{ confidence: number, correct: boolean }>}
 */
export function generateCalibratedTestDistribution(options = {}) {
  const n = options.n || 1000;
  const seed = options.seed !== undefined ? options.seed : 42;
  const rng = createDeterministicSampler(seed);
  const records = [];

  function addBin(count, confMin, confMax, targetAcc) {
    const numCorrect = Math.round(count * targetAcc);
    for (let i = 0; i < count; i++) {
      const c = Number((confMin + (confMax - confMin) * rng()).toFixed(4));
      const correct = i < numCorrect;
      records.push({ confidence: c, correct });
    }
  }

  // Scale counts to match desired n
  const scale = n / 1000;
  addBin(Math.max(1, Math.round(700 * scale)), 0.92, 0.99, 0.995);
  addBin(Math.max(1, Math.round(70 * scale)), 0.71, 0.75, 0.73);
  addBin(Math.max(1, Math.round(60 * scale)), 0.61, 0.69, 0.65);
  addBin(Math.max(1, Math.round(50 * scale)), 0.51, 0.59, 0.55);
  addBin(Math.max(1, Math.round(40 * scale)), 0.41, 0.49, 0.45);
  addBin(Math.max(1, Math.round(35 * scale)), 0.31, 0.39, 0.35);
  addBin(Math.max(1, Math.round(25 * scale)), 0.21, 0.29, 0.25);
  addBin(Math.max(1, Math.round(20 * scale)), 0.11, 0.19, 0.15);

  return records;
}
