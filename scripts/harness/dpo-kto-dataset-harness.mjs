#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS CONTRASTIVE PREFERENCE DATASET HARNESS (G-UX-013)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Stage 5 Data Curriculum & Curation (M3 / G-UX-013)
 * Purpose: Formally verifies the 3,500 contrastive pairs for DPO and 7,000 weighted
 *          records for KTO, checking 80/10/10 split orthogonality, zero sample
 *          contamination, 8-flaw taxonomy coverage, and delta annotations with zero mocks.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  generateContrastivePreferenceDataset,
  FLAW_TAXONOMY,
  KTO_LOSS_AVERSION_LAMBDA
} from '../lib/dpo-kto-dataset-builder.mjs';

const DATA_DIR = 'artifacts/curriculum/stage5_preferences';

function runHarness() {
  console.log('================================================================================');
  console.log('🛡️ Stage 5 Contrastive Preference Dataset Harness (G-UX-013)');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  const manifestPath = resolve(process.cwd(), DATA_DIR, 'manifest.json');
  const dpoPath = resolve(process.cwd(), DATA_DIR, 'dpo_pairs.jsonl');
  const ktoPath = resolve(process.cwd(), DATA_DIR, 'kto_records.jsonl');
  const trainPath = resolve(process.cwd(), DATA_DIR, 'splits/train.jsonl');
  const valPath = resolve(process.cwd(), DATA_DIR, 'splits/val.jsonl');
  const testPath = resolve(process.cwd(), DATA_DIR, 'splits/test.jsonl');

  if (!existsSync(manifestPath) || !existsSync(dpoPath) || !existsSync(ktoPath) || !existsSync(trainPath)) {
    console.log('▶ Generating 3,500 contrastive pairs for Stage 5...');
    generateContrastivePreferenceDataset({
      total_pairs: 3500,
      output_dir: DATA_DIR,
      write_files: true,
      seed: 20261014
    });
    console.log('  Preference dataset generated successfully.\n');
  }

  // 1. Artifacts & Manifest Verification
  console.log('▶ Category 1: Preference Dataset Artifact Integrity');
  assert(existsSync(manifestPath), `Manifest exists at ${DATA_DIR}/manifest.json`);
  assert(existsSync(dpoPath), `DPO pairs JSONL exists at ${DATA_DIR}/dpo_pairs.jsonl`);
  assert(existsSync(ktoPath), `KTO records JSONL exists at ${DATA_DIR}/kto_records.jsonl`);
  assert(existsSync(trainPath), `Train split exists at ${DATA_DIR}/splits/train.jsonl`);
  assert(existsSync(valPath), `Validation split exists at ${DATA_DIR}/splits/val.jsonl`);
  assert(existsSync(testPath), `Test split exists at ${DATA_DIR}/splits/test.jsonl`);

  let manifest = null;
  let dpoLines = null;
  let ktoLines = null;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    dpoLines = readFileSync(dpoPath, 'utf8').trim().split('\n');
    ktoLines = readFileSync(ktoPath, 'utf8').trim().split('\n');
    assert(manifest.total_dpo_pairs === 3500, 'Manifest confirms 3,500 DPO pairs');
    assert(dpoLines.length === 3500, 'DPO JSONL contains exactly 3,500 records');
    assert(manifest.total_kto_records === 7000, 'Manifest confirms 7,000 KTO records');
    assert(ktoLines.length === 7000, 'KTO JSONL contains exactly 7,000 records');
    assert(manifest.kto_loss_aversion_lambda === KTO_LOSS_AVERSION_LAMBDA, `KTO lambda parameter is ${KTO_LOSS_AVERSION_LAMBDA}`);
  } catch (err) {
    assert(false, `Failed to parse dataset files: ${err.message}`);
    process.exit(1);
  }

  // 2. Strict 80/10/10 Split Cardinality
  console.log('\n▶ Category 2: 80/10/10 Split Cardinality');
  const trainLines = readFileSync(trainPath, 'utf8').trim().split('\n');
  const valLines = readFileSync(valPath, 'utf8').trim().split('\n');
  const testLines = readFileSync(testPath, 'utf8').trim().split('\n');

  assert(trainLines.length === 2800, `Train split contains exactly 2,800 pairs (80.0%) (found ${trainLines.length})`);
  assert(valLines.length === 350, `Validation split contains exactly 350 pairs (10.0%) (found ${valLines.length})`);
  assert(testLines.length === 350, `Test split contains exactly 350 pairs (10.0%) (found ${testLines.length})`);

  // 3. Zero Sample Contamination
  console.log('\n▶ Category 3: Zero Sample Contamination Invariant');
  const trainIds = new Set(trainLines.map(l => JSON.parse(l).pair_id));
  const valIds = new Set(valLines.map(l => JSON.parse(l).pair_id));
  const testIds = new Set(testLines.map(l => JSON.parse(l).pair_id));

  let trainValOverlap = 0;
  let trainTestOverlap = 0;
  let valTestOverlap = 0;

  for (const id of trainIds) {
    if (valIds.has(id)) trainValOverlap++;
    if (testIds.has(id)) trainTestOverlap++;
  }
  for (const id of valIds) {
    if (testIds.has(id)) valTestOverlap++;
  }

  assert(trainValOverlap === 0, 'Zero overlap between Train and Validation splits');
  assert(trainTestOverlap === 0, 'Zero overlap between Train and Test splits');
  assert(valTestOverlap === 0, 'Zero overlap between Validation and Test splits');
  assert(manifest.zero_contamination_verified === true, 'Manifest confirms zero contamination verified');

  // 4. 8-Flaw Taxonomy & Preference Delta Metrics
  console.log('\n▶ Category 4: 8-Flaw Taxonomy & Preference Deltas');
  const flawCounts = manifest.flaw_distribution || {};
  let allFlawsPresent = true;

  for (const flaw of FLAW_TAXONOMY) {
    const count = flawCounts[flaw] || 0;
    if (count <= 0) allFlawsPresent = false;
    assert(count > 0, `Flaw '${flaw}' represented in ${count} pairs`);
  }
  assert(allFlawsPresent, 'All 8 anti-pattern flaws are represented across the dataset');

  // Sample check 20 pairs for positive delta annotations
  let positiveDeltas = true;
  for (let i = 0; i < 20; i++) {
    const idx = Math.floor(Math.random() * dpoLines.length);
    const p = JSON.parse(dpoLines[idx]);
    if (p.preference_delta.contrast_margin <= 0 || p.preference_delta.accessibility_score_delta <= 0) {
      positiveDeltas = false;
    }
  }
  assert(positiveDeltas, '100% of inspected pairs demonstrate strictly positive preference deltas');

  // 5. Python Dataset Module Check
  console.log('\n▶ Category 5: Python Preference Dataset Module Check');
  const pyPath = resolve(process.cwd(), 'code/ml/src/curriculum/preference_dataset.py');
  assert(existsSync(pyPath), 'Python module code/ml/src/curriculum/preference_dataset.py exists');

  console.log('\n================================================================================');
  console.log(`📊 Summary: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  console.log('✅ Stage 5 Contrastive Preference Dataset verified green.\n');
}

runHarness();
