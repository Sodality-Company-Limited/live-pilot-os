#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS MERKLE DECISION LEDGER VERIFICATION HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M6 / G-UX-026)
 * Purpose: Verifies append-only block hash chaining, Merkle tree root computation,
 *          inclusion proofs, physical evidence byte probing, and fail-closed
 *          tamper detection across a 50-decision operational ledger.
 *          Emits machine-readable proof artifact to artifacts/proofs/G-UX-026-merkle-ledger.json
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  MerkleDecisionLedger,
  verifyMerkleProof,
  probeEvidenceFiles,
  LedgerCorruptionError
} from '../lib/merkle-decision-ledger.mjs';

const SODA_ROOT = path.resolve(import.meta.dirname, '../..');
const PROOFS_DIR = path.join(SODA_ROOT, 'artifacts/proofs');

export async function runMerkleDecisionLedgerHarness() {
  console.log('══════════════════════════════════════════════════════════════════');
  console.log('🛡️ RUNNING G-UX-026 MERKLE DECISION LEDGER HARNESS');
  console.log('══════════════════════════════════════════════════════════════════');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-ledger-harness-'));
  const harnessLedgerPath = path.join(tmpDir, 'harness-decisions.jsonl');

  const results = {
    total_blocks_appended: 50,
    hash_chain_verified: false,
    merkle_root: '',
    inclusion_proofs_verified: 0,
    evidence_files_probed: 0,
    tamper_detection_passed: false,
    broken_chain_detection_passed: false,
    all_gates_passed: false,
    timestamp: new Date().toISOString()
  };

  try {
    const ledger = new MerkleDecisionLedger(harnessLedgerPath);

    // Physical evidence assets to bind
    const evidenceFiles = [
      'package.json',
      'AGENTS.md',
      'CLAUDE.md',
      'schemas/goal-contract.schema.json',
      'scripts/lib/merkle-decision-ledger.mjs'
    ];

    // 1. Append 50 sequential decision transactions
    for (let i = 0; i < 50; i++) {
      ledger.appendDecision(`DAVE-UX-${String(i + 1).padStart(4, '0')}`, {
        step: i + 1,
        component: i % 2 === 0 ? 'PrimaryButton' : 'CardContainer',
        confidence: 0.85 + (i % 10) * 0.01,
        approved: true
      }, {
        evidencePaths: evidenceFiles
      });
    }

    // 2. Verify Ledger Integrity
    const integrityRes = ledger.verifyIntegrity();
    results.hash_chain_verified = integrityRes.valid && integrityRes.block_count === 50;
    results.merkle_root = integrityRes.merkle_root;

    // 3. Verify Merkle Inclusion Proofs on 10 sampled blocks
    const sampleIndices = [0, 4, 9, 15, 23, 31, 38, 42, 47, 49];
    let proofPasses = 0;

    for (const idx of sampleIndices) {
      const proofObj = ledger.getInclusionProof(idx);
      const leaf = ledger.blocks[idx].block_hash;
      const valid = verifyMerkleProof(leaf, proofObj.proof, results.merkle_root);
      if (valid) proofPasses++;
    }
    results.inclusion_proofs_verified = proofPasses;

    // 4. Physical Evidence Disk Probing
    const probeRes = probeEvidenceFiles(evidenceFiles);
    results.evidence_files_probed = probeRes.probed;

    // 5. Adversarial Tamper Detection (Modify block 25 payload)
    const tamperedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-ledger-tamper-'));
    const tamperedPath = path.join(tamperedDir, 'tampered.jsonl');
    fs.copyFileSync(harnessLedgerPath, tamperedPath);

    const tamperedLines = fs.readFileSync(tamperedPath, 'utf8').trim().split('\n');
    const block25 = JSON.parse(tamperedLines[25]);
    block25.payload.approved = false; // tamper!
    tamperedLines[25] = JSON.stringify(block25);
    fs.writeFileSync(tamperedPath, tamperedLines.join('\n') + '\n', 'utf8');

    const tamperedLedger = new MerkleDecisionLedger(tamperedPath);
    try {
      tamperedLedger.verifyIntegrity();
    } catch (err) {
      if (err instanceof LedgerCorruptionError && err.message.includes('Tampered block payload')) {
        results.tamper_detection_passed = true;
      }
    }

    // 6. Adversarial Broken Chain Detection (Modify block 10 prev_hash)
    const brokenDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-ledger-broken-'));
    const brokenPath = path.join(brokenDir, 'broken.jsonl');
    fs.copyFileSync(harnessLedgerPath, brokenPath);

    const brokenLines = fs.readFileSync(brokenPath, 'utf8').trim().split('\n');
    const block10 = JSON.parse(brokenLines[10]);
    block10.prev_hash = 'f'.repeat(64); // break chain!
    brokenLines[10] = JSON.stringify(block10);
    fs.writeFileSync(brokenPath, brokenLines.join('\n') + '\n', 'utf8');

    const brokenLedger = new MerkleDecisionLedger(brokenPath);
    try {
      brokenLedger.verifyIntegrity();
    } catch (err) {
      if (err instanceof LedgerCorruptionError && err.message.includes('Broken hash chain')) {
        results.broken_chain_detection_passed = true;
      }
    }

    const passed = results.hash_chain_verified &&
                   results.inclusion_proofs_verified === sampleIndices.length &&
                   results.evidence_files_probed === evidenceFiles.length &&
                   results.tamper_detection_passed &&
                   results.broken_chain_detection_passed;

    results.all_gates_passed = passed;

    if (!fs.existsSync(PROOFS_DIR)) {
      fs.mkdirSync(PROOFS_DIR, { recursive: true });
    }

    const proofPath = path.join(PROOFS_DIR, 'G-UX-026-merkle-ledger.json');
    fs.writeFileSync(proofPath, JSON.stringify(results, null, 2), 'utf8');

    console.log(`✅ Blocks Appended & Chained: ${results.total_blocks_appended}/50`);
    console.log(`✅ Merkle Root: ${results.merkle_root.slice(0, 16)}...`);
    console.log(`✅ Inclusion Proofs Verified: ${results.inclusion_proofs_verified}/${sampleIndices.length}`);
    console.log(`✅ Physical Evidence Files Probed: ${results.evidence_files_probed}/${evidenceFiles.length}`);
    console.log(`✅ Tamper Detection Fail-Closed: ${results.tamper_detection_passed ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Broken Chain Detection: ${results.broken_chain_detection_passed ? 'PASSED' : 'FAILED'}`);
    console.log(`📁 Proof Artifact Emitted: ${proofPath}`);
    console.log(`Verdict: ${passed ? 'PASSED' : 'FAILED'}`);
    console.log('══════════════════════════════════════════════════════════════════');

    if (!passed) {
      process.exit(1);
    }
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  runMerkleDecisionLedgerHarness().catch((err) => {
    console.error('Fatal Harness Error:', err);
    process.exit(1);
  });
}
