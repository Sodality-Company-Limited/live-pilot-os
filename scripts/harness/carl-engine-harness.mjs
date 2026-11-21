#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ CALIBRATION-AWARE RL (CARL) & "REWARDING DOUBT" HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Goal: G-UX-017
 * Epic: UX (Multimodal UX/UI Design Decision Making Layer)
 * 
 * Verifies:
 * 1. Strictly proper Brier score loss <= 0.150.
 * 2. Expected Calibration Error (ECE) <= 0.050 across 10 bins.
 * 3. AUROC discriminator >= 0.880.
 * 4. High-Confidence Error Rate (HCER) <= 0.010 on c >= 0.80.
 * 5. Asymmetric 10x overconfidence penalty: P_overconf = I(y*=0) * I(c>=0.75) * 10.0 * c^2.
 * 6. Rewarding Justified Doubt: Bounded reward +1.0 * (1-c) for routing to DEFER.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import { runCarlEvaluation, computeCarlLoss, CARL_DEFAULTS } from '../lib/carl-engine.mjs';

async function main() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('🛡️  SODA OS CARL & REWARDING DOUBT VERIFICATION HARNESS (G-UX-017)');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  console.log('[1/3] Verifying Asymmetric 10x Overconfidence Penalty and Doubt Rewards...');
  // Case A: Confident wrong prediction
  const badLoss = computeCarlLoss({ confidence: 0.90, target: false });
  const expectedPenalty = 10.0 * Math.pow(0.90, 2);
  if (Math.abs(badLoss.overconfPenalty - expectedPenalty) > 1e-4) {
    console.error(`❌ Expected overconfidence penalty ${expectedPenalty}, got ${badLoss.overconfPenalty}`);
    process.exit(1);
  }
  console.log(`      Active Overconfidence Penalty: +${badLoss.overconfPenalty.toFixed(4)} (Expected: ${expectedPenalty.toFixed(4)})`);

  // Case B: Rewarding Justified Doubt on ambiguous input
  const deferLoss = computeCarlLoss({ confidence: 0.35, target: false, action: 'DEFER', isAmbiguous: true });
  if (deferLoss.doubtReward <= 0.0) {
    console.error(`❌ Expected positive doubt reward for DEFER, got ${deferLoss.doubtReward}`);
    process.exit(1);
  }
  console.log(`      Rewarding Justified Doubt:    +${deferLoss.doubtReward.toFixed(4)} reward on ambiguous input deferral`);

  console.log('\n[2/3] Evaluating 1,000-Episode Statistical Calibration Battery...');
  const summary = await runCarlEvaluation({ sampleCount: 1000 });

  console.log('\n[3/3] Statistical Calibration Invariants Assessment:');
  const inv = summary.invariants;

  console.log(`      1. Brier Score Loss:        ${inv.brier_score.value.toFixed(4)} (Ceiling: <= ${inv.brier_score.ceiling.toFixed(3)}) -> ${inv.brier_score.passed ? 'PASS' : 'FAIL'}`);
  console.log(`      2. Expected Calibration (ECE): ${(inv.expected_calibration_error.value * 100).toFixed(2)}% (Ceiling: <= ${(inv.expected_calibration_error.ceiling * 100).toFixed(1)}%) -> ${inv.expected_calibration_error.passed ? 'PASS' : 'FAIL'}`);
  console.log(`      3. AUROC Discriminator:     ${inv.auroc_discriminator.value.toFixed(4)} (Floor: >= ${inv.auroc_discriminator.floor.toFixed(3)}) -> ${inv.auroc_discriminator.passed ? 'PASS' : 'FAIL'}`);
  console.log(`      4. High-Conf Error (HCER):  ${(inv.high_confidence_error_rate.value * 100).toFixed(3)}% (Ceiling: <= ${(inv.high_confidence_error_rate.ceiling * 100).toFixed(1)}%) -> ${inv.high_confidence_error_rate.passed ? 'PASS' : 'FAIL'}`);

  if (!summary.passed) {
    console.error('\n❌ CARL Statistical Invariants Gate FAILED.');
    process.exit(1);
  }

  // Persist receipt
  const rootDir = process.cwd();
  const evidenceDir = path.join(rootDir, 'artifacts/evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const receiptPath = path.join(evidenceDir, 'G-UX-017-carl-receipt.json');
  fs.writeFileSync(receiptPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\n✅ G-UX-017 CARL & Rewarding Doubt Invariants Verified Successfully.`);
  console.log(`   Receipt persisted at: ${receiptPath}`);
  process.exit(0);
}

main().catch(err => {
  console.error(`❌ Harness execution error: ${err.message}`);
  process.exit(1);
});
