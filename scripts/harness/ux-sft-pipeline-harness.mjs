#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ GEMMA 4 MULTIMODAL UX SUPERVISED FINE-TUNING (SFT) HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Goal: G-UX-015
 * Epic: UX (Multimodal UX/UI Design Decision Making Layer)
 * 
 * Verifies:
 * 1. Stage 2 UI Scene Graphs and Stage 4 Deliberation Trajectories ingestion.
 * 2. Chat template multi-turn formatting with 12-persona constraints.
 * 3. Token cross-entropy loss computation with completion label masking.
 * 4. JSON schema validation engine verifying >= 98.0% conformance against
 *    schemas/ux-decision-contract.schema.json.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import { runSftPipeline } from '../lib/ux-sft-pipeline.mjs';

async function main() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('🛡️  SODA OS UX SUPERVISED FINE-TUNING (SFT) VERIFICATION HARNESS (G-UX-015)');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  const rootDir = process.cwd();
  const sgTrainPath = path.join(rootDir, 'artifacts/curriculum/stage2_scene_graphs/train.jsonl');
  const trajPath = path.join(rootDir, 'artifacts/curriculum/stage4_trajectories/trajectories_2500.jsonl');

  if (!fs.existsSync(sgTrainPath)) {
    console.error(`❌ Stage 2 scene graph dataset missing at: ${sgTrainPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(trajPath)) {
    console.error(`❌ Stage 4 trajectory dataset missing at: ${trajPath}`);
    process.exit(1);
  }

  console.log(`[1/4] Ingesting Stage 2 Scene Graphs (${sgTrainPath})...`);
  const sgLines = fs.readFileSync(sgTrainPath, 'utf8').split('\n').filter(Boolean);
  console.log(`      Ingested ${sgLines.length} UI Scene Graph training records.`);

  console.log(`[2/4] Ingesting Stage 4 Trajectories (${trajPath})...`);
  const trajLines = fs.readFileSync(trajPath, 'utf8').split('\n').filter(Boolean);
  console.log(`      Ingested ${trajLines.length} 12-Persona Trajectory records.`);

  console.log('[3/4] Executing SFT Pipeline and formatting chat templates...');
  const summary = await runSftPipeline({
    sceneGraphDatasetPath: 'artifacts/curriculum/stage2_scene_graphs/train.jsonl',
    trajectoryDatasetPath: 'artifacts/curriculum/stage4_trajectories/trajectories_2500.jsonl',
    validationSampleCount: 500,
    targetConformanceRate: 0.980,
    epochs: 3
  });

  console.log('\n[4/4] Verifying JSON Schema Conformance against schemas/ux-decision-contract.schema.json:');
  console.log(`      Evaluated samples:    ${summary.evaluation.evaluated_samples}`);
  console.log(`      Conforming samples:   ${summary.evaluation.conforming_samples}`);
  console.log(`      Conformance rate:     ${(summary.evaluation.conformance_rate * 100).toFixed(2)}% (Target: >= ${(summary.evaluation.target_conformance_rate * 100).toFixed(1)}%)`);

  if (!summary.evaluation.passed) {
    console.error(`\n❌ SFT Conformance Target FAILED: Conformance rate ${(summary.evaluation.conformance_rate * 100).toFixed(2)}% < ${(summary.evaluation.target_conformance_rate * 100).toFixed(1)}%`);
    process.exit(1);
  }

  // Persist receipt
  const evidenceDir = path.join(rootDir, 'artifacts/evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const receiptPath = path.join(evidenceDir, 'G-UX-015-sft-receipt.json');
  fs.writeFileSync(receiptPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\n✅ G-UX-015 SFT Pipeline Conformance Verified Successfully.`);
  console.log(`   Receipt persisted at: ${receiptPath}`);
  process.exit(0);
}

main().catch(err => {
  console.error(`❌ Harness execution error: ${err.message}`);
  process.exit(1);
});
