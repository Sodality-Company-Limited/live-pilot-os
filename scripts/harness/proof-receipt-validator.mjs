#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS PROOF RECEIPT VALIDATOR HARNESS
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Cryptographic Proof Assurance & Epistemic Verification
 * Purpose: Validates machine-readable proof receipts, verifies epistemic levels,
 *          checks source file SHA256 hashes against active working tree bytes,
 *          and rejects unverified, skipped, or simulated proof claims.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

export const VALID_CLASSIFICATIONS = [
  'formal_proof',
  'executable_invariant',
  'statistical_evidence',
  'statistical_claim',
  'production_evidence'
];

/**
 * Validates a machine-readable proof receipt object or file.
 */
export function validateProofReceipt(receiptOrPath, options = {}) {
  const errors = [];
  const warnings = [];
  let receipt = null;

  if (typeof receiptOrPath === 'string') {
    const fullPath = resolve(process.cwd(), receiptOrPath);
    if (!existsSync(fullPath)) {
      return {
        valid: false,
        errors: [`Proof receipt file not found: ${receiptOrPath}`],
        warnings
      };
    }
    try {
      receipt = JSON.parse(readFileSync(fullPath, 'utf8'));
    } catch (err) {
      return {
        valid: false,
        errors: [`Malformed proof receipt JSON: ${err.message}`],
        warnings
      };
    }
  } else if (typeof receiptOrPath === 'object' && receiptOrPath !== null) {
    receipt = receiptOrPath;
  } else {
    return {
      valid: false,
      errors: ['Receipt must be a file path string or an object'],
      warnings
    };
  }

  // 1. Schema version
  if (receipt.schema_version !== 1) {
    errors.push(`Missing or invalid schema_version in proof receipt: got ${receipt.schema_version} (expected 1)`);
  }

  // 2. Goal ID
  if (!receipt.goal_id || typeof receipt.goal_id !== 'string') {
    errors.push('Missing or non-string goal_id in proof receipt');
  }

  // 3. Epistemic Classification
  if (!receipt.classification || !VALID_CLASSIFICATIONS.includes(receipt.classification)) {
    errors.push(
      `Invalid classification: "${receipt.classification}". Must be one of: ${VALID_CLASSIFICATIONS.join(', ')}`
    );
  }

  // 4. Source Revision
  if (!receipt.source_revision || typeof receipt.source_revision !== 'string') {
    errors.push('Missing or invalid source_revision commit SHA');
  }

  // 5. Invariants Array
  if (!Array.isArray(receipt.invariants) || receipt.invariants.length === 0) {
    errors.push('Proof receipt must contain a non-empty "invariants" array');
  } else {
    for (let i = 0; i < receipt.invariants.length; i++) {
      const inv = receipt.invariants[i];
      const prefix = `Invariant [${i}] (${inv.id || 'unidentified'}):`;

      if (!inv.id) errors.push(`${prefix} missing id`);
      if (!inv.statement) errors.push(`${prefix} missing statement`);

      if (!inv.verification_command) {
        errors.push(`${prefix} missing verification_command`);
      }

      if (inv.passed !== true) {
        errors.push(`${prefix} passed flag is not true (failed or skipped proofs are invalid)`);
      }

      if (inv.exit_code !== undefined && inv.exit_code !== 0) {
        errors.push(`${prefix} exit_code is ${inv.exit_code} (expected 0)`);
      }

      // Hard check: unit test scripts cannot be classified as formal_proof
      if (receipt.classification === 'formal_proof') {
        const cmd = (inv.verification_command || '').toLowerCase();
        if (cmd.includes('jest') || cmd.includes('mocha') || cmd.includes('pytest') || cmd.includes('test-')) {
          errors.push(
            `${prefix} Unit/integration test suites cannot be classified as "formal_proof". Downgrade to "executable_invariant".`
          );
        }
      }
    }
  }

  // 6. Source Files SHA256 Check (if declared)
  if (Array.isArray(receipt.source_files) && receipt.source_files.length > 0) {
    for (const sf of receipt.source_files) {
      if (!sf.path || !sf.sha256) continue;
      let fullSourcePath = resolve(process.cwd(), sf.path);
      if (!existsSync(fullSourcePath) && sf.path.includes('/goals/') && !sf.path.includes('/_archived/')) {
        const archivedPath = sf.path.replace('/goals/', '/goals/_archived/');
        const fullArchivedPath = resolve(process.cwd(), archivedPath);
        if (existsSync(fullArchivedPath)) {
          fullSourcePath = fullArchivedPath;
        }
      }
      if (!existsSync(fullSourcePath)) {
        errors.push(`Referenced source file missing: ${sf.path}`);
        continue;
      }
      const actualHash = crypto.createHash('sha256').update(readFileSync(fullSourcePath)).digest('hex');
      if (actualHash !== sf.sha256) {
        errors.push(
          `SHA256 mismatch for ${sf.path}: receipt recorded ${sf.sha256.slice(0, 12)}..., current working tree is ${actualHash.slice(0, 12)}...`
        );
      }
    }
  }

  // 7. Certification
  if (receipt.certification !== 'PASS') {
    errors.push(`Proof receipt certification must be "PASS", got "${receipt.certification}"`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    receipt
  };
}

// CLI Execution
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: node proof-receipt-validator.mjs <receipt-path-or-goal-id>');
    process.exit(1);
  }

  let receiptPath = target;
  if (!target.endsWith('.json')) {
    receiptPath = `docs/07-backlog/evidence/${target}-proof-receipt.json`;
    if (!existsSync(receiptPath)) {
      receiptPath = `artifacts/evidence/${target}-proof-receipt.json`;
    }
  }

  const result = validateProofReceipt(receiptPath);
  if (!result.valid) {
    console.error(`❌ Proof Receipt Validation Failed for: ${receiptPath}`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`✅ Proof Receipt Validated: ${receiptPath}`);
  console.log(`   Goal: ${result.receipt.goal_id}`);
  console.log(`   Classification: ${result.receipt.classification}`);
  console.log(`   Invariants Proven: ${result.receipt.invariants.length}`);
  process.exit(0);
}
