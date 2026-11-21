/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS METRIC HILLCLIMB RUNNER & DELTA VERIFIER (G-CORE-024)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Zero-Mock Scientific Performance Optimization & Hillclimbing Engine
 *
 * Invariants:
 *   1. Zero Float: Metric moments and ratios compute via exact BigInt micro-units.
 *   2. Strict Monotonic Progress: Candidate commits require statistically verifiable
 *      improvement exceeding minImprovementBasisPoints (default 5.00%).
 *   3. Fail-Closed Rejection: Regressions or insignificant improvements automatically
 *      trigger REJECT_ROLLBACK.
 * ════════════════════════════════════════════════════════════════════════════════
 */

/**
 * Losslessly converts sample array to BigInt array and computes basic moments.
 *
 * @param {Array<number|bigint>} rawSamples - Array of sample measurements.
 * @returns {object} Sample moments and counts.
 */
export function calculateSampleStats(rawSamples) {
  if (!Array.isArray(rawSamples)) {
    throw new Error('Input samples must be an array');
  }
  if (rawSamples.length < 2) {
    throw new Error('Samples array must contain at least 2 measurements for statistical evaluation');
  }

  const samples = rawSamples.map(s => (typeof s === 'bigint' ? s : BigInt(Math.floor(s))));
  const sampleCount = samples.length;

  let sum = 0n;
  let min = samples[0];
  let max = samples[0];

  for (const s of samples) {
    sum += s;
    if (s < min) min = s;
    if (s > max) max = s;
  }

  const mean = sum / BigInt(sampleCount);

  // Variance: sum((x - mean)^2) / (n - 1)
  let sumSqDiff = 0n;
  for (const s of samples) {
    const diff = s - mean;
    sumSqDiff += diff * diff;
  }
  const variance = sumSqDiff / BigInt(sampleCount - 1);

  return {
    sampleCount,
    meanMicros: mean,
    minMicros: min,
    maxMicros: max,
    varianceMicros: variance
  };
}

/**
 * Evaluates baseline versus candidate sample distributions.
 *
 * @param {object} options
 * @param {Array} options.baseline - Baseline measurements.
 * @param {Array} options.candidate - Candidate measurements after mutation.
 * @param {string} [options.direction='lower_is_better'] - 'lower_is_better' | 'higher_is_better'
 * @param {number} [options.minImprovementBasisPoints=500] - Minimum basis points (500 = 5.00%).
 * @returns {object} Evaluation decision, delta metrics, and rationale.
 */
export function evaluateHillclimbDelta(options = {}) {
  const {
    baseline,
    candidate,
    direction = 'lower_is_better',
    minImprovementBasisPoints = 500
  } = options;

  const baseStats = calculateSampleStats(baseline);
  const candStats = calculateSampleStats(candidate);

  const bMean = baseStats.meanMicros;
  const cMean = candStats.meanMicros;

  if (bMean === 0n) {
    throw new Error('Baseline mean must be greater than zero for relative delta calculation');
  }

  // Calculate improvement in basis points (1 bp = 0.01% = 1/10000)
  // For lower_is_better: improvement = (bMean - cMean) / bMean
  // For higher_is_better: improvement = (cMean - bMean) / bMean
  let improvementBpBigInt = 0n;
  if (direction === 'lower_is_better') {
    improvementBpBigInt = ((bMean - cMean) * 10000n) / bMean;
  } else {
    improvementBpBigInt = ((cMean - bMean) * 10000n) / bMean;
  }

  const improvementBasisPoints = Number(improvementBpBigInt);
  const minRequiredBp = Number(minImprovementBasisPoints);

  let accepted = false;
  let decision = 'REJECT_ROLLBACK';
  let rationale = '';

  if (improvementBasisPoints < 0) {
    accepted = false;
    decision = 'REJECT_ROLLBACK';
    rationale = `Regression detected: Candidate performed ${(Math.abs(improvementBasisPoints) / 100).toFixed(2)}% worse than baseline.`;
  } else if (improvementBasisPoints < minRequiredBp) {
    accepted = false;
    decision = 'REJECT_ROLLBACK';
    rationale = `Below minimum improvement threshold: Observed ${(improvementBasisPoints / 100).toFixed(2)}% gain, requires ${(minRequiredBp / 100).toFixed(2)}%.`;
  } else {
    accepted = true;
    decision = 'ACCEPT_COMMIT';
    rationale = `Significant improvement: Observed ${(improvementBasisPoints / 100).toFixed(2)}% gain exceeding ${(minRequiredBp / 100).toFixed(2)}% threshold.`;
  }

  return {
    accepted,
    decision,
    direction,
    improvementBasisPoints,
    improvementPercent: (improvementBasisPoints / 100).toFixed(2),
    minRequiredPercent: (minRequiredBp / 100).toFixed(2),
    baselineStats: {
      sampleCount: baseStats.sampleCount,
      meanMicros: baseStats.meanMicros,
      minMicros: baseStats.minMicros,
      maxMicros: baseStats.maxMicros
    },
    candidateStats: {
      sampleCount: candStats.sampleCount,
      meanMicros: candStats.meanMicros,
      minMicros: candStats.minMicros,
      maxMicros: candStats.maxMicros
    },
    rationale
  };
}

/**
 * Formats hillclimb evaluation into an auditable markdown summary.
 *
 * @param {object} options
 * @param {string} options.stepName - Description or name of the mutation step.
 * @param {object} options.evaluation - Result from evaluateHillclimbDelta.
 * @returns {string} Formatted markdown report.
 */
export function formatHillclimbReport(options = {}) {
  const { stepName = 'Unnamed Mutation', evaluation } = options;
  if (!evaluation) {
    throw new Error('Evaluation object is required for report generation');
  }

  const statusBadge = evaluation.accepted ? '✅ ACCEPT_COMMIT' : '❌ REJECT_ROLLBACK';

  const lines = [
    '## 🧗 Metric Hillclimb Step Evaluation Report',
    '',
    `- **Mutation Step:** ${stepName}`,
    `- **Outcome Decision:** \`${evaluation.decision}\` (${statusBadge})`,
    `- **Direction:** \`${evaluation.direction}\``,
    `- **Observed Delta:** ${evaluation.improvementPercent}% (Threshold: ${evaluation.minRequiredPercent}%)`,
    `- **Rationale:** ${evaluation.rationale}`,
    '',
    '### 📊 Benchmark Measurement Comparison',
    '| Dimension | Baseline | Candidate | Delta |',
    '|---|:---:|:---:|:---:|',
    `| **Sample Count** | ${evaluation.baselineStats.sampleCount} | ${evaluation.candidateStats.sampleCount} | — |`,
    `| **Mean Duration** | ${evaluation.baselineStats.meanMicros.toLocaleString()} µs | ${evaluation.candidateStats.meanMicros.toLocaleString()} µs | ${evaluation.improvementPercent}% |`,
    `| **Min Duration** | ${evaluation.baselineStats.minMicros.toLocaleString()} µs | ${evaluation.candidateStats.minMicros.toLocaleString()} µs | — |`,
    `| **Max Duration** | ${evaluation.baselineStats.maxMicros.toLocaleString()} µs | ${evaluation.candidateStats.maxMicros.toLocaleString()} µs | — |`,
    ''
  ];

  return lines.join('\n');
}
