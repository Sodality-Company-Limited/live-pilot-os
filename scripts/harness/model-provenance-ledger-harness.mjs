#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ CRYPTOGRAPHIC MODEL PROVENANCE & ARTIFACT LEDGER HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Goal: G-UX-019
 * Epic: UX (Multimodal UX/UI Design Decision Making Layer)
 * 
 * Verifies:
 * 1. Conformance against schemas/model-provenance.schema.json.
 * 2. Exact physical SHA-256 byte hashes across training artifacts and code revisions.
 * 3. Dataset lineage linking Stages 1-6 curriculum manifests.
 * 4. Tamper-evident ledger chaining with HMAC-SHA256 signatures across checkpoint blocks.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  runModelProvenanceVerification,
  collectCurriculumLineage,
  DEFAULT_PROVENANCE_KEY
} from '../lib/model-provenance-ledger.mjs';

async function main() {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('🛡️  SODA OS MODEL PROVENANCE & ARTIFACT LEDGER HARNESS (G-UX-019)');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  const rootDir = process.cwd();

  console.log('[1/4] Auditing Stage 1-6 Training Curriculum Dataset Lineage:');
  const lineage = collectCurriculumLineage(rootDir);
  for (const [stage, digest] of Object.entries(lineage)) {
    console.log(`      - ${stage.padEnd(28)}: ${digest}`);
  }

  console.log('\n[2/4] Constructing and Sealing Model Checkpoint Provenance Ledger Blocks...');
  const summary = await runModelProvenanceVerification({
    modelId: 'soda-ux-gemma4-lora-v1',
    baseCheckpoint: 'gemma-4-it-multimodal-base',
    sourceRevision: 'c960e7d8fb2daa110feaead40f33b785c7e345bd',
    secretKey: DEFAULT_PROVENANCE_KEY
  });

  console.log(`      Total Blocks Sealed:      ${summary.ledger_chain.total_blocks}`);
  console.log(`      Genesis Block SHA-256:    ${summary.ledger_chain.genesis_block_hash}`);
  console.log(`      Head Block SHA-256:       ${summary.ledger_chain.head_block_hash}`);
  console.log(`      Tracked Physical Files:   ${summary.ledger_chain.artifacts_tracked}`);

  console.log('\n[3/4] Verifying HMAC-SHA256 Signatures and Hash Linkage:');
  if (!summary.ledger_chain.chain_verified) {
    console.error('❌ Provenance ledger chain verification FAILED.');
    process.exit(1);
  }
  console.log('      Verified: All block hashes and HMAC-SHA256 signatures match exactly.');

  console.log('\n[4/4] Emitting G-UX-019 Model Provenance Verification Receipt...');
  const evidenceDir = path.join(rootDir, 'artifacts/evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const receiptPath = path.join(evidenceDir, 'G-UX-019-provenance-receipt.json');
  fs.writeFileSync(receiptPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\n✅ G-UX-019 Cryptographic Model Provenance Ledger Verified Successfully.`);
  console.log(`   Receipt persisted at: ${receiptPath}`);
  process.exit(0);
}

main().catch(err => {
  console.error(`❌ Harness execution error: ${err.message}`);
  process.exit(1);
});
