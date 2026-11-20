#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS MODEL TRAINING CONTRACT HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Contract-First ML Training Governance & Split Isolation
 * Purpose: Verifies ML training contracts, dataset split isolation,
 *          reproducibility configurations, baseline comparison significance,
 *          language preservation bounds, and RLCD preference dataset schemas (G-ML-025).
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

/**
 * Validates a model training contract manifest or goal specification.
 */
export function validateModelTrainingContract(contractOrPath) {
  const errors = [];
  const warnings = [];
  let contract = null;

  if (typeof contractOrPath === 'string') {
    const fullPath = resolve(process.cwd(), contractOrPath);
    if (!existsSync(fullPath)) {
      return {
        valid: false,
        errors: [`Model training contract file not found: ${contractOrPath}`],
        warnings
      };
    }
    try {
      contract = JSON.parse(readFileSync(fullPath, 'utf8'));
    } catch (err) {
      return {
        valid: false,
        errors: [`Malformed model training contract JSON: ${err.message}`],
        warnings
      };
    }
  } else if (typeof contractOrPath === 'object' && contractOrPath !== null) {
    contract = contractOrPath;
  } else {
    return {
      valid: false,
      errors: ['Contract must be a file path string or an object'],
      warnings
    };
  }

  // 1. Model & Checkpoint Identity
  if (!contract.model_id && !contract.model_name) {
    errors.push('Contract missing "model_id" or "model_name"');
  }
  if (!contract.base_checkpoint) {
    errors.push('Contract missing "base_checkpoint" specification');
  }

  // 2. Dataset Contract & Split Isolation
  if (!contract.dataset) {
    errors.push('Contract missing "dataset" contract block');
  } else {
    const ds = contract.dataset;
    if (!ds.name) errors.push('Dataset contract missing "name"');
    if (!ds.sha256) errors.push('Dataset contract missing "sha256" digest');
    
    // Check splits
    const splits = ds.splits || {};
    if (!splits.train || !splits.validation || !splits.test) {
      errors.push('Dataset contract must declare "train", "validation", and "test" splits');
    } else {
      // Split contamination check
      const trainSet = new Set(Array.isArray(splits.train) ? splits.train : [splits.train]);
      const valSet = new Set(Array.isArray(splits.validation) ? splits.validation : [splits.validation]);
      const testSet = new Set(Array.isArray(splits.test) ? splits.test : [splits.test]);

      for (const item of valSet) {
        if (trainSet.has(item)) {
          errors.push(`Split contamination: Validation set overlaps with Training set (${item})`);
        }
      }
      for (const item of testSet) {
        if (trainSet.has(item)) {
          errors.push(`Split contamination: Test set overlaps with Training set (${item})`);
        }
      }
    }
  }

  // 3. Label-Oracle Definition
  if (!contract.label_oracle) {
    errors.push('Contract missing "label_oracle" definition');
  } else if (!contract.label_oracle.type || !contract.label_oracle.agreement_threshold) {
    errors.push('Label-oracle must define "type" and "agreement_threshold"');
  }

  // 4. Reproducibility Configuration
  if (!contract.reproducibility) {
    errors.push('Contract missing "reproducibility" block');
  } else {
    const repro = contract.reproducibility;
    if (repro.random_seed === undefined || repro.random_seed === null) {
      errors.push('Reproducibility block missing "random_seed"');
    }
    if (!repro.hyperparameters) {
      errors.push('Reproducibility block missing "hyperparameters"');
    }
  }

  // 5. Baseline Comparison & Significance
  if (contract.baseline_comparison) {
    const bc = contract.baseline_comparison;
    if (bc.statistically_significant !== true) {
      errors.push('Baseline comparison must demonstrate statistically significant improvement');
    }
    if (bc.p_value !== undefined && bc.p_value >= 0.05) {
      errors.push(`Baseline comparison p-value must be < 0.05 (got ${bc.p_value})`);
    }
  }

  // 6. Language Generation Quality Preservation
  if (contract.evaluation) {
    const ev = contract.evaluation;
    if (ev.delta_perplexity_pct !== undefined && ev.delta_perplexity_pct > 5.0) {
      errors.push(`Base language perplexity degraded by ${ev.delta_perplexity_pct}% (SLA ceiling: 5.0%)`);
    }
    if (ev.ece !== undefined && ev.ece > 0.08) {
      errors.push(`Expected Calibration Error (ECE) is ${ev.ece} (SLA ceiling: 0.08)`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    contract
  };
}

/**
 * Validates an RLCD Preference Dataset file (JSONL) against training schema & split isolation invariants (G-ML-025).
 * 
 * @param {string|Array<object>} datasetOrPath Path to JSONL dataset or array of records
 * @param {object} options
 * @returns {object} { valid: boolean, errors: [], warnings: [], stats: object }
 */
export function validateRlcdPreferenceDataset(datasetOrPath, options = {}) {
  const errors = [];
  const warnings = [];
  let records = [];

  const targetPath = typeof datasetOrPath === 'string'
    ? resolve(process.cwd(), datasetOrPath)
    : resolve(process.cwd(), 'artifacts/rlcd/train_dataset.jsonl');

  if (typeof datasetOrPath === 'string') {
    if (!existsSync(targetPath)) {
      return {
        valid: false,
        errors: [`RLCD preference dataset file not found: ${targetPath}`],
        warnings,
        stats: null
      };
    }

    try {
      const lines = readFileSync(targetPath, 'utf8').split('\n').filter(l => l.trim().length > 0);
      records = lines.map((l, i) => {
        try {
          return JSON.parse(l);
        } catch (e) {
          errors.push(`Line ${i + 1} is malformed JSON: ${e.message}`);
          return null;
        }
      }).filter(Boolean);
    } catch (err) {
      return {
        valid: false,
        errors: [`Failed to read RLCD preference dataset: ${err.message}`],
        warnings,
        stats: null
      };
    }
  } else if (Array.isArray(datasetOrPath)) {
    records = datasetOrPath;
  } else {
    return {
      valid: false,
      errors: ['Dataset must be a file path string or an array of records'],
      warnings,
      stats: null
    };
  }

  if (records.length === 0) {
    errors.push('Dataset contains zero records.');
    return { valid: false, errors, warnings, stats: null };
  }

  const trainSet = new Set();
  const valSet = new Set();
  const testSet = new Set();
  const trainPrompts = new Set();
  const testPrompts = new Set();

  for (let idx = 0; idx < records.length; idx++) {
    const r = records[idx];

    // Schema verification: trajectory_id, prompt, chosen, rejected, confidence, reward
    if (!r.trajectory_id || typeof r.trajectory_id !== 'string') {
      errors.push(`Record ${idx + 1}: Missing valid 'trajectory_id'`);
    }

    if (!r.prompt || (typeof r.prompt !== 'string' && typeof r.prompt !== 'object')) {
      errors.push(`Record ${idx + 1}: Missing valid non-empty 'prompt'`);
    } else if (typeof r.prompt === 'string' && r.prompt.trim().length === 0) {
      errors.push(`Record ${idx + 1}: 'prompt' cannot be empty`);
    }

    if (!r.chosen) {
      errors.push(`Record ${idx + 1}: Missing 'chosen' proposal completion`);
    }

    if (!r.rejected) {
      errors.push(`Record ${idx + 1}: Missing 'rejected' proposal completion`);
    }

    if (typeof r.confidence !== 'number' || isNaN(r.confidence) || r.confidence < 0.0 || r.confidence > 1.0) {
      errors.push(`Record ${idx + 1}: Confidence must be float in [0.0, 1.0] (got ${r.confidence})`);
    }

    // Stop condition: missing reward score
    if (r.reward === undefined || r.reward === null) {
      errors.push(`Record ${idx + 1}: Missing reward score (stop condition violated)`);
    } else if (typeof r.reward === 'object') {
      if (typeof r.reward.net_reward !== 'number' || isNaN(r.reward.net_reward)) {
        errors.push(`Record ${idx + 1}: Reward object missing numeric 'net_reward'`);
      }
    } else if (typeof r.reward !== 'number' || isNaN(r.reward)) {
      errors.push(`Record ${idx + 1}: Reward must be a valid number or object with net_reward`);
    }

    const split = r.split || 'train';
    if (!['train', 'validation', 'test'].includes(split)) {
      errors.push(`Record ${idx + 1}: Invalid split tag '${split}'`);
    }

    const promptStr = typeof r.prompt === 'string' ? r.prompt : JSON.stringify(r.prompt);

    if (split === 'train') {
      trainSet.add(r.trajectory_id);
      trainPrompts.add(promptStr);
    } else if (split === 'validation') {
      valSet.add(r.trajectory_id);
    } else if (split === 'test') {
      testSet.add(r.trajectory_id);
      testPrompts.add(promptStr);
    }
  }

  // Split distribution checks
  const total = records.length;
  const trainCount = trainSet.size;
  const valCount = valSet.size;
  const testCount = testSet.size;

  if (total >= 3) {
    if (valCount === 0) errors.push('Dataset missing "validation" split');
    if (testCount === 0) errors.push('Dataset missing "test" split');
    if (trainCount === 0) errors.push('Dataset missing "train" split');
  }

  // Split isolation and data leakage checks
  for (const id of valSet) {
    if (trainSet.has(id)) {
      errors.push(`Data leakage: Validation sample '${id}' found in Training set`);
    }
  }

  for (const id of testSet) {
    if (trainSet.has(id)) {
      errors.push(`Data leakage: Test sample '${id}' found in Training set`);
    }
    if (valSet.has(id)) {
      errors.push(`Data leakage: Test sample '${id}' found in Validation set`);
    }
  }

  // Prompt contamination between train and test
  for (const p of testPrompts) {
    if (trainPrompts.has(p)) {
      errors.push(`Data leakage: Exact prompt found in both Train and Test splits`);
    }
  }

  const stats = {
    totalRecords: total,
    trainCount,
    valCount,
    testCount,
    trainRatio: total > 0 ? (trainCount / total) : 0,
    valRatio: total > 0 ? (valCount / total) : 0,
    testRatio: total > 0 ? (testCount / total) : 0
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats
  };
}

// -----------------------------------------------------------------------------
// CLI Execution
// -----------------------------------------------------------------------------
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const target = process.argv[2];

  // Default behavior when run without arguments or with G-ML-025:
  // Validate RLCD preference dataset AND training contract if present
  if (!target || target === 'G-ML-025') {
    console.log('🔬 SODA OS MODEL TRAINING CONTRACT & RLCD DATASET HARNESS');
    console.log('   Target: G-ML-025 / artifacts/rlcd/train_dataset.jsonl\n');

    let allValid = true;

    // 1. Validate RLCD Dataset
    const datasetPath = 'artifacts/rlcd/train_dataset.jsonl';
    const dsResult = validateRlcdPreferenceDataset(datasetPath);
    if (!dsResult.valid) {
      console.error(`❌ RLCD Preference Dataset Validation Failed for: ${datasetPath}`);
      for (const err of dsResult.errors) {
        console.error(`  - ${err}`);
      }
      allValid = false;
    } else {
      console.log(`✅ RLCD Preference Dataset Validated: ${datasetPath}`);
      console.log(`   Total Records: ${dsResult.stats.totalRecords}`);
      console.log(`   Splits: Train=${dsResult.stats.trainCount} (${(dsResult.stats.trainRatio * 100).toFixed(1)}%), Val=${dsResult.stats.valCount} (${(dsResult.stats.valRatio * 100).toFixed(1)}%), Test=${dsResult.stats.testCount} (${(dsResult.stats.testRatio * 100).toFixed(1)}%)`);
      console.log(`   Split Isolation: 0% Contamination / 0 Data Leakage [VERIFIED]`);
    }

    // 2. Validate Training Contract if available
    let contractPath = 'artifacts/evidence/G-ML-025-training-contract.json';
    if (!existsSync(contractPath)) {
      contractPath = 'docs/07-backlog/evidence/G-ML-025-training-contract.json';
    }

    if (existsSync(contractPath)) {
      const contractResult = validateModelTrainingContract(contractPath);
      if (!contractResult.valid) {
        console.error(`❌ Model Training Contract Validation Failed for: ${contractPath}`);
        for (const err of contractResult.errors) {
          console.error(`  - ${err}`);
        }
        allValid = false;
      } else {
        console.log(`\n✅ Model Training Contract Validated: ${contractPath}`);
        console.log(`   Model ID: ${contractResult.contract.model_id}`);
        console.log(`   Base Checkpoint: ${contractResult.contract.base_checkpoint}`);
        console.log(`   Reproducibility Seed: ${contractResult.contract.reproducibility.random_seed}`);
        console.log(`   Calibration ECE Ceiling: ${contractResult.contract.evaluation?.ece ?? 'N/A'}`);
      }
    }

    if (!allValid) {
      process.exit(1);
    }

    console.log('\n🔒 ALL MODEL TRAINING & DATASET GOVERNANCE GATES SATISFIED.');
    process.exit(0);
  }

  // When target is a JSONL dataset file
  if (target.endsWith('.jsonl')) {
    const dsResult = validateRlcdPreferenceDataset(target);
    if (!dsResult.valid) {
      console.error(`❌ RLCD Preference Dataset Validation Failed for: ${target}`);
      for (const err of dsResult.errors) {
        console.error(`  - ${err}`);
      }
      process.exit(1);
    }
    console.log(`✅ RLCD Preference Dataset Validated: ${target}`);
    console.log(`   Total Records: ${dsResult.stats.totalRecords}`);
    console.log(`   Splits: Train=${dsResult.stats.trainCount}, Val=${dsResult.stats.valCount}, Test=${dsResult.stats.testCount}`);
    process.exit(0);
  }

  // When target is a contract file or goal ID
  let contractPath = target;
  if (!target.endsWith('.json')) {
    contractPath = `docs/07-backlog/evidence/${target}-training-contract.json`;
    if (!existsSync(contractPath)) {
      contractPath = `artifacts/evidence/${target}-training-contract.json`;
    }
  }

  const result = validateModelTrainingContract(contractPath);
  if (!result.valid) {
    console.error(`❌ Model Training Contract Validation Failed for: ${contractPath}`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`✅ Model Training Contract Validated: ${contractPath}`);
  console.log(`   Model: ${result.contract.model_id || result.contract.model_name}`);
  console.log(`   Base: ${result.contract.base_checkpoint}`);
  process.exit(0);
}
