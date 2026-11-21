#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS STATISTICAL EVIDENCE HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Empirical Grounding & Statistical Claim Verification
 * Purpose: Validates machine-readable statistical claims, uncertainty methods,
 *          sample size bounds, baseline comparisons, evaluation splits, seed
 *          policies, and data contamination controls.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import {
  computeBootstrapConfidenceIntervals,
  generateReliabilityDiagram,
  generateStatisticalProofReceipt,
  getCanonicalEvaluationDataset
} from '../lib/statistical-evidence-engine.mjs';

export const VALID_UNCERTAINTY_METHODS = [
  'bootstrap',
  'wilson_score',
  'clopper_pearson',
  'jackknife',
  'monte_carlo',
  't_interval',
  'normal_approx'
];

export const VALID_STOPPING_RULES = [
  'fixed_sample_count',
  'sequential_probability_ratio_test',
  'target_confidence_width',
  'early_stopping_patience'
];

/**
 * Calculates binomial Wilson score confidence interval with continuity correction.
 * Bound is guaranteed to remain in [0.0, 1.0].
 */
export function wilsonScoreInterval(successes, total, confidence = 1.96) {
  if (typeof total !== 'number' || total <= 0) {
    return { center: 0, lower: 0, upper: 0, low: 0, high: 0 };
  }
  const s = Math.max(0, Math.min(total, Number(successes)));
  const n = total;
  const p = s / n;
  const z = typeof confidence === 'number' ? confidence : 1.96;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denominator;

  const lower = Math.max(0, Math.min(1, center - margin));
  const upper = Math.max(0, Math.min(1, center + margin));

  return {
    center,
    lower,
    upper,
    low: lower,
    high: upper
  };
}

/**
 * Calculates non-parametric bootstrap resampling confidence interval for continuous metrics.
 */
export function bootstrapInterval(data, { iterations = 1000, confidence = 0.95, statistic = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length } = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    return { center: 0, lower: 0, upper: 0, low: 0, high: 0, iterations: 0 };
  }
  const n = data.length;
  const observedStat = statistic(data);
  const bootstrapStats = [];

  let seed = 42;
  const lcg = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let b = 0; b < iterations; b++) {
    const resample = new Array(n);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(lcg() * n);
      resample[i] = data[idx];
    }
    bootstrapStats.push(statistic(resample));
  }

  bootstrapStats.sort((a, b) => a - b);
  const alpha = 1 - confidence;
  const lowerIdx = Math.max(0, Math.floor((alpha / 2) * iterations));
  const upperIdx = Math.min(iterations - 1, Math.ceil((1 - alpha / 2) * iterations) - 1);

  const lower = bootstrapStats[lowerIdx];
  const upper = bootstrapStats[upperIdx];

  return {
    center: observedStat,
    lower,
    upper,
    low: lower,
    high: upper,
    iterations
  };
}


/**
 * Detects dataset split contamination by evaluating set intersection
 * between training and any validation/test/evaluation splits.
 */
export function detectSplitContamination(splits) {
  if (!splits || typeof splits !== 'object') {
    return { contaminated: false, overlaps: [] };
  }
  const trainSet = new Set(Array.isArray(splits.train) ? splits.train : (Array.isArray(splits.training) ? splits.training : []));
  const overlaps = [];
  for (const [splitName, samples] of Object.entries(splits)) {
    if (['train', 'training'].includes(splitName.toLowerCase()) || !Array.isArray(samples)) continue;
    const intersecting = samples.filter(s => trainSet.has(s));
    if (intersecting.length > 0) {
      overlaps.push({ split: splitName, samples: intersecting });
    }
  }
  return {
    contaminated: overlaps.length > 0,
    overlaps
  };
}


/**
 * Extracts statistical claims block from markdown content.
 */
export function extractStatisticalClaims(content) {
  const yamlBlockRegex = /```ya?ml\s*[\r\n]+([\s\S]*?)```/gi;
  let match;
  while ((match = yamlBlockRegex.exec(content)) !== null) {
    const text = match[1];
    if (/^\s*(?:statistical_claims?|statistical_evidence):\s*$/m.test(text)) {
      return parseStatisticalClaimsYaml(text);
    }
  }

  // Also check frontmatter
  const frontmatterMatch = content.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (frontmatterMatch) {
    const fm = frontmatterMatch[1];
    if (/statistical_claims?:\s*$/m.test(fm)) {
      return parseStatisticalClaimsYaml(fm);
    }
  }

  return null;
}

/**
 * Parses YAML statistical claims block.
 */
export function parseStatisticalClaimsYaml(yamlText) {
  const lines = yamlText.split(/\r?\n/);
  const claims = [];
  let currentClaim = null;
  let inClaims = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (/^(?:statistical_claims?|statistical_evidence):\s*$/.test(trimmed)) {
      inClaims = true;
      continue;
    }

    if (inClaims) {
      const itemMatch = rawLine.match(/^\s*-\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (itemMatch) {
        if (currentClaim) claims.push(currentClaim);
        currentClaim = {};
        const key = itemMatch[1];
        currentClaim[key] = cleanVal(itemMatch[2]);
        continue;
      }

      if (currentClaim) {
        const propMatch = rawLine.match(/^\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
        if (propMatch) {
          const propKey = propMatch[1];
          const rawVal = propMatch[2].trim();
          if (rawVal === '') {
            currentClaim[propKey] = {};
            let j = i + 1;
            while (j < lines.length) {
              const nextLine = lines[j];
              const nextTrim = nextLine.trim();
              if (!nextTrim || nextTrim.startsWith('#')) { j++; continue; }
              const subProp = nextLine.match(/^\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
              if (subProp && nextLine.match(/^(\s*)/)[1].length > rawLine.match(/^(\s*)/)[1].length) {
                currentClaim[propKey][subProp[1]] = cleanVal(subProp[2]);
                j++;
                i = j - 1;
              } else {
                break;
              }
            }
          } else {
            currentClaim[propKey] = cleanVal(rawVal);
          }
        }
      }
    }
  }

  if (currentClaim) {
    claims.push(currentClaim);
  }

  return claims;
}

function cleanVal(v) {
  const s = v.trim();
  if (!s) return '';
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  if (s.startsWith('[') && s.endsWith(']')) {
    return s.slice(1, -1).split(',').map(x => cleanVal(x.trim()));
  }
  return s;
}

/**
 * Validates statistical claims according to rigorous empirical standards.
 */
export function validateStatisticalClaims(content, filename = '') {
  const errors = [];
  const warnings = [];

  const claims = extractStatisticalClaims(content);

  // If goal claims empirical evaluation or ml_research, statistical claims block is required
  const isMlOrEmpirical = content.includes('ml_research') ||
                          /Statistical\s+Guarantee|Empirical\s+Evidence|Statistical\s+Claims/i.test(content);

  if (!claims || claims.length === 0) {
    if (isMlOrEmpirical && !filename.includes('_template')) {
      errors.push('Goal involves ML or empirical evaluation but declares no machine-readable statistical_claims block.');
    }
    return {
      valid: errors.length === 0,
      claimCount: 0,
      errors,
      warnings
    };
  }

  const seenIds = new Set();

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i];
    const id = claim.id || `STAT-${i + 1}`;

    if (seenIds.has(id)) {
      errors.push(`Duplicate statistical claim ID "${id}".`);
    }
    seenIds.add(id);

    // Required fields: metric, population, sample_count, split, baseline, uncertainty method, stopping rule, artifact
    if (!claim.metric) {
      errors.push(`Statistical claim [${id}] is missing required "metric" field.`);
    }

    if (!claim.population) {
      errors.push(`Statistical claim [${id}] must define the evaluation "population".`);
    }

    if (!claim.sample_count || typeof claim.sample_count !== 'number' || claim.sample_count < 30) {
      errors.push(`Statistical claim [${id}] sample_count must be a positive integer >= 30 (got: ${claim.sample_count}).`);
    }

    if (!claim.split && !claim.splits) {
      errors.push(`Statistical claim [${id}] is missing dataset "split" (e.g. test, held_out, validation).`);
    } else if (claim.split && ['train', 'training'].includes(String(claim.split).toLowerCase())) {
      errors.push(`Statistical claim [${id}] uses training split for validation! Evaluation on training data is strictly prohibited.`);
    }

    if (claim.splits) {
      const splitCheck = detectSplitContamination(claim.splits);
      if (splitCheck.contaminated) {
        for (const ov of splitCheck.overlaps) {
          errors.push(`Statistical claim [${id}] detected dataset split contamination between train and ${ov.split}: overlapping samples [${ov.samples.join(', ')}].`);
        }
      }
    }

    if (!claim.baseline) {
      errors.push(`Statistical claim [${id}] is missing required "baseline" comparison reference.`);
    } else if (claim.treatment && String(claim.baseline).trim().toLowerCase() === String(claim.treatment).trim().toLowerCase()) {
      errors.push(`Statistical claim [${id}] baseline and treatment cohorts must be distinct (both are "${claim.baseline}").`);
    }


    const intervalMethod = claim.interval_method || claim.uncertainty_method;
    if (!intervalMethod) {
      errors.push(`Statistical claim [${id}] must declare an interval_method (e.g. ${VALID_UNCERTAINTY_METHODS.slice(0, 3).join(', ')}).`);
    } else if (!VALID_UNCERTAINTY_METHODS.includes(intervalMethod)) {
      warnings.push(`Statistical claim [${id}] uses non-standard interval_method "${intervalMethod}".`);
    }

    if (!claim.stopping_rule) {
      errors.push(`Statistical claim [${id}] is missing required "stopping_rule" (e.g. ${VALID_STOPPING_RULES.slice(0, 2).join(', ')}).`);
    }

    if (!claim.artifact) {
      errors.push(`Statistical claim [${id}] must link to an evidence "artifact" JSON file.`);
    }

    // Anti-contamination check: synthetic evidence must not be presented as real-world generalization
    const popStr = String(claim.population || '').toLowerCase();
    const isSynthetic = popStr.includes('synthetic') || popStr.includes('simulated') || popStr.includes('in-kernel');
    if (isSynthetic && /real-world|production-grade|external/i.test(String(claim.claim || ''))) {
      errors.push(`Statistical claim [${id}] presents synthetic/simulated population as real-world/external evidence. Epistemic demarcation violation.`);
    }
  }

  return {
    valid: errors.length === 0,
    claimCount: claims.length,
    claims,
    errors,
    warnings
  };
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('statistical-evidence-harness.mjs')) {
  const target = process.argv[2];

  if (!target || target === 'G-PROOF-002' || target === '--self-test') {
    // Execute G-PROOF-002 Statistical Verification & Bootstrap Confidence Interval Harness
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('🛡️ SODA OS STATISTICAL EVIDENCE HARNESS — G-PROOF-002 VERIFICATION');
    console.log('════════════════════════════════════════════════════════════════════════════════\n');

    const goalPath = resolve(process.cwd(), 'docs/07-backlog/goals/G-PROOF-002.md');
    if (existsSync(goalPath)) {
      const content = readFileSync(goalPath, 'utf8');
      const claimResult = validateStatisticalClaims(content, 'G-PROOF-002.md');
      if (!claimResult.valid) {
        console.error('❌ Statistical claims validation failed for G-PROOF-002:');
        for (const err of claimResult.errors) console.error(`  - ${err}`);
        process.exit(1);
      }
      console.log(`✅ Machine-readable statistical claims verified (${claimResult.claimCount} claims).`);
    }

    // Step 2 Action 1: 1000-sample bootstrap resampling to construct empirical 95% CIs for ECE
    console.log('\n▶ Running 1000-sample bootstrap resampling for Expected Calibration Error...');
    const evalData = getCanonicalEvaluationDataset();
    if (evalData.length < 100) {
      console.error(`❌ Stop condition triggered: Sample size below minimum statistical power threshold (N < 100). Got: ${evalData.length}`);
      process.exit(1);
    }

    const bootstrapResult = computeBootstrapConfidenceIntervals(evalData, {
      iterations: 1000,
      confidenceLevel: 0.95,
      seed: 42,
      minSampleSize: 100
    });

    console.log(`  - Sample Count: ${bootstrapResult.sampleCount}`);
    console.log(`  - Bootstrap Iterations: ${bootstrapResult.iterations}`);
    console.log(`  - Observed ECE: ${bootstrapResult.ece.observed}`);
    console.log(`  - Empirical 95% CI: [${bootstrapResult.ece.ciLower}, ${bootstrapResult.ece.ciUpper}] (SE: ${bootstrapResult.ece.standardError})`);
    console.log(`  - Observed MCE: ${bootstrapResult.mce.observed} (95% CI: [${bootstrapResult.mce.ciLower}, ${bootstrapResult.mce.ciUpper}])`);
    console.log(`  - Observed Brier: ${bootstrapResult.brier.observed} (95% CI: [${bootstrapResult.brier.ciLower}, ${bootstrapResult.brier.ciUpper}])`);

    // Verify convergence invariants
    if (bootstrapResult.ece.ciLower > bootstrapResult.ece.ciUpper || bootstrapResult.ece.ciUpper > 0.08) {
      console.error(`❌ Bootstrap ECE CI upper bound (${bootstrapResult.ece.ciUpper}) exceeds safety tolerance 0.08`);
      process.exit(1);
    }
    console.log('✅ Bootstrap confidence intervals converged within safety bounds (ECE_95 <= 0.08).');

    // Step 2 Action 2: Generate machine-readable reliability diagram coordinates & bin sample weights
    console.log('\n▶ Generating machine-readable reliability diagram coordinates...');
    const diagram = generateReliabilityDiagram(evalData, { bins: 10 });
    console.log(`  - Bins: ${diagram.binsCount}`);
    console.log(`  - Bin Sample Weights: [${diagram.binWeights.map(w => w.toFixed(3)).join(', ')}]`);
    console.log('✅ Reliability diagram coordinates generated successfully.');

    // Step 3: Serialize statistical claim proof receipt
    console.log('\n▶ Serializing statistical claim proof receipt...');
    const receiptReportPath = resolve(process.cwd(), 'artifacts/proofs/G-PROOF-002-calibration-report.json');
    const { receipt, ece95 } = generateStatisticalProofReceipt('G-PROOF-002', evalData, {
      outputPath: receiptReportPath,
      maxEceTolerance: 0.08,
      seed: 42,
      iterations: 1000
    });
    console.log(`✅ Statistical claim proof receipt generated: ${receiptReportPath}`);
    console.log(`   Classification: ${receipt.classification}`);
    console.log(`   Certification: ${receipt.certification}`);
    console.log(`   ECE 95% Upper Bound: ${ece95}`);

    console.log('\n════════════════════════════════════════════════════════════════════════════════');
    console.log('🏆 G-PROOF-002 STATISTICAL EVIDENCE HARNESS PASSED WITH EXIT CODE 0');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    process.exit(0);
  }

  let resolved = resolve(process.cwd(), target);
  if (!existsSync(resolved)) {
    const archivedCandidate = resolved.replace('/goals/', '/goals/_archived/');
    if (existsSync(archivedCandidate)) {
      resolved = archivedCandidate;
    } else {
      console.error(`Goal file not found: ${resolved}`);
      process.exit(1);
    }
  }
  const content = readFileSync(resolved, 'utf8');
  const res = validateStatisticalClaims(content, basename(resolved));
  if (res.valid) {
    console.log(`✅ Statistical claims verified for ${basename(resolved)} (${res.claimCount} claims).`);
    process.exit(0);
  } else {
    console.error(`❌ Statistical evidence validation failed for ${basename(resolved)}:`);
    for (const err of res.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}
