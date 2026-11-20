/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ UNIT TESTS: MERKLE-TREE DECISION LEDGER (G-UX-026)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  LEDGER_SCHEMA_VERSION,
  GENESIS_PREV_HASH,
  LedgerCorruptionError,
  sha256,
  canonicalJsonStringify,
  computeMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  probeEvidenceFiles,
  calculateBlockHash,
  MerkleDecisionLedger
} from '../../scripts/lib/merkle-decision-ledger.mjs';

describe('G-UX-026: Merkle-Tree Decision Ledger', () => {
  let tmpDir;
  let testLedgerPath;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'soda-ledger-test-'));
    testLedgerPath = path.join(tmpDir, 'test-decisions.jsonl');
  });

  after(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('1. Cryptographic Primitives & Canonical Serialization', () => {
    it('computes accurate SHA-256 digests and sorts JSON keys deterministically', () => {
      assert.equal(LEDGER_SCHEMA_VERSION, 1);
      assert.equal(GENESIS_PREV_HASH.length, 64);

      const d1 = sha256('hello');
      const d2 = sha256('hello');
      assert.equal(d1, d2);
      assert.equal(d1.length, 64);

      const objA = { b: 2, a: 1, c: { y: 20, x: 10 } };
      const objB = { c: { x: 10, y: 20 }, a: 1, b: 2 };
      assert.equal(canonicalJsonStringify(objA), canonicalJsonStringify(objB));
    });
  });

  describe('2. Binary Merkle Tree & Inclusion Proofs', () => {
    it('computes binary Merkle tree root over leaf hashes', () => {
      const leaves = [sha256('leaf-0'), sha256('leaf-1'), sha256('leaf-2'), sha256('leaf-3')];
      const root = computeMerkleRoot(leaves);

      assert.equal(typeof root, 'string');
      assert.equal(root.length, 64);

      // Determinism
      assert.equal(computeMerkleRoot(leaves), root);

      // Handles odd leaf counts
      const oddLeaves = [sha256('leaf-0'), sha256('leaf-1'), sha256('leaf-2')];
      const oddRoot = computeMerkleRoot(oddLeaves);
      assert.equal(oddRoot.length, 64);
    });

    it('generates and verifies Merkle inclusion proofs', () => {
      const leaves = [
        sha256('block-0'),
        sha256('block-1'),
        sha256('block-2'),
        sha256('block-3'),
        sha256('block-4')
      ];
      const root = computeMerkleRoot(leaves);

      for (let i = 0; i < leaves.length; i++) {
        const proofObj = generateMerkleProof(leaves, i);
        assert.equal(proofObj.targetIndex, i);
        assert.equal(proofObj.root, root);

        const isValid = verifyMerkleProof(leaves[i], proofObj.proof, root);
        assert.equal(isValid, true, `Inclusion proof failed for leaf ${i}`);

        // Altered leaf should fail verification
        const isTamperedValid = verifyMerkleProof(sha256('tampered-leaf'), proofObj.proof, root);
        assert.equal(isTamperedValid, false);
      }
    });
  });

  describe('3. Physical Evidence Probing', () => {
    it('probes physical disk files and computes exact byte hashes', () => {
      const probeRes = probeEvidenceFiles(['package.json', 'README.md']);
      assert.equal(probeRes.valid, true);
      assert.equal(probeRes.probed, 2);
      assert.equal(probeRes.missing.length, 0);
      assert.equal(probeRes.evidence_manifest[0].path, 'package.json');
      assert.equal(probeRes.evidence_manifest[0].sha256.length, 64);
    });

    it('identifies missing evidence files cleanly', () => {
      const probeRes = probeEvidenceFiles(['package.json', 'non-existent-artifact.xyz']);
      assert.equal(probeRes.valid, false);
      assert.equal(probeRes.probed, 1);
      assert.deepEqual(probeRes.missing, ['non-existent-artifact.xyz']);
    });
  });

  describe('4. Merkle Decision Ledger Lifecycle & Tamper Detection', () => {
    it('initializes empty ledger, appends blocks with cryptographic chaining, and verifies integrity', () => {
      const ledger = new MerkleDecisionLedger(testLedgerPath);

      // Genesis Block
      const b0 = ledger.appendDecision('DAVE-UX-0001', { intent: 'Create header nav', approved: true });
      assert.equal(b0.index, 0);
      assert.equal(b0.prev_hash, GENESIS_PREV_HASH);
      assert.equal(b0.block_hash.length, 64);

      // Block 1
      const b1 = ledger.appendDecision('DAVE-UX-0002', { intent: 'Add metric cards', count: 3 });
      assert.equal(b1.index, 1);
      assert.equal(b1.prev_hash, b0.block_hash);

      // Block 2
      const b2 = ledger.appendDecision('DAVE-UX-0003', { intent: 'Deploy action buttons' });
      assert.equal(b2.index, 2);
      assert.equal(b2.prev_hash, b1.block_hash);

      // Verify Integrity
      const verifyRes = ledger.verifyIntegrity();
      assert.equal(verifyRes.valid, true);
      assert.equal(verifyRes.block_count, 3);
      assert.equal(verifyRes.latest_block_hash, b2.block_hash);
      assert.equal(verifyRes.merkle_root.length, 64);

      // Merkle inclusion proof
      const proofB1 = ledger.getInclusionProof(1);
      assert.equal(verifyMerkleProof(b1.block_hash, proofB1.proof, verifyRes.merkle_root), true);
    });

    it('detects payload tampering and fails closed with LedgerCorruptionError', () => {
      const tamperedLedgerPath = path.join(tmpDir, 'tampered-ledger.jsonl');
      const ledger = new MerkleDecisionLedger(tamperedLedgerPath);
      ledger.appendDecision('DAVE-UX-0010', { action: 'initial' });
      ledger.appendDecision('DAVE-UX-0011', { action: 'secondary' });

      // Read file lines and alter line 0 payload
      const lines = fs.readFileSync(tamperedLedgerPath, 'utf8').trim().split('\n');
      const block0 = JSON.parse(lines[0]);
      block0.payload.action = 'maliciously_altered';
      lines[0] = JSON.stringify(block0);
      fs.writeFileSync(tamperedLedgerPath, lines.join('\n') + '\n', 'utf8');

      // Verify should throw LedgerCorruptionError
      assert.throws(() => {
        ledger.verifyIntegrity();
      }, (err) => {
        assert.ok(err instanceof LedgerCorruptionError);
        assert.ok(err.message.includes('Tampered block payload'));
        return true;
      });
    });

    it('detects broken hash chain and fails closed', () => {
      const brokenChainPath = path.join(tmpDir, 'broken-chain-ledger.jsonl');
      const ledger = new MerkleDecisionLedger(brokenChainPath);
      ledger.appendDecision('DAVE-UX-0020', { action: 'step1' });
      ledger.appendDecision('DAVE-UX-0021', { action: 'step2' });

      // Mutate prev_hash of block 1
      const lines = fs.readFileSync(brokenChainPath, 'utf8').trim().split('\n');
      const block1 = JSON.parse(lines[1]);
      block1.prev_hash = sha256('bogus_hash');
      block1.block_hash = calculateBlockHash(block1); // recompute so block_hash itself matches
      lines[1] = JSON.stringify(block1);
      fs.writeFileSync(brokenChainPath, lines.join('\n') + '\n', 'utf8');

      assert.throws(() => {
        ledger.verifyIntegrity();
      }, (err) => {
        assert.ok(err instanceof LedgerCorruptionError);
        assert.ok(err.message.includes('Broken hash chain'));
        return true;
      });
    });
  });
});
