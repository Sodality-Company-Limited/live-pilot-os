/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS MERKLE-TREE DECISION LEDGER WITH TAMPER-EVIDENT CHAINING
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M6 / G-UX-026)
 * Architecture Blueprint: docs/03-architecture/audit-ledger.md
 * Purpose: Append-only JSONL persistence, SHA-256 block hash chaining (prev_hash),
 *          binary Merkle tree root computation, inclusion proofs, physical evidence
 *          disk probing, and fail-closed tamper detection.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const LEDGER_SCHEMA_VERSION = 1;
export const GENESIS_PREV_HASH = '0'.repeat(64);

/**
 * Error thrown when ledger integrity is breached or tampered with.
 */
export class LedgerCorruptionError extends Error {
  constructor(message, context = {}) {
    super(`LedgerCorruptionError: ${message}`);
    this.name = 'LedgerCorruptionError';
    this.context = context;
  }
}

/**
 * Computes SHA-256 hex digest of a string or buffer.
 */
export function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Canonical JSON stringifier (sorts keys deterministically).
 */
export function canonicalJsonStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalJsonStringify(obj[key])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Probes physical evidence files on disk and computes their SHA-256 byte hashes.
 */
export function probeEvidenceFiles(evidencePaths, baseDir = process.cwd()) {
  if (!Array.isArray(evidencePaths)) {
    return { probed: 0, evidence_manifest: [], missing: [], valid: true };
  }

  const manifest = [];
  const missing = [];

  for (const item of evidencePaths) {
    const relPath = typeof item === 'string' ? item : item.path;
    const fullPath = path.isAbsolute(relPath) ? relPath : path.resolve(baseDir, relPath);

    if (!fs.existsSync(fullPath)) {
      missing.push(relPath);
      continue;
    }

    try {
      const fileBytes = fs.readFileSync(fullPath);
      const digest = sha256(fileBytes);
      manifest.push({
        path: relPath,
        sha256: digest,
        bytes: fileBytes.length,
        verified_at: new Date().toISOString()
      });
    } catch (err) {
      missing.push(relPath);
    }
  }

  return {
    probed: manifest.length,
    evidence_manifest: manifest,
    missing,
    valid: missing.length === 0
  };
}

/**
 * Computes binary Merkle tree root over an array of leaf hash hex strings.
 */
export function computeMerkleRoot(leafHashes) {
  if (!Array.isArray(leafHashes) || leafHashes.length === 0) {
    return sha256('EMPTY_MERKLE_TREE');
  }

  let currentLevel = leafHashes.map((h) => (typeof h === 'string' ? h : sha256(canonicalJsonStringify(h))));

  while (currentLevel.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(sha256(currentLevel[i] + currentLevel[i + 1]));
      } else {
        // Carry forward odd leaf
        nextLevel.push(sha256(currentLevel[i] + currentLevel[i]));
      }
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0];
}

/**
 * Generates a Merkle inclusion proof for a leaf at index targetIdx.
 */
export function generateMerkleProof(leafHashes, targetIdx) {
  if (!Array.isArray(leafHashes) || targetIdx < 0 || targetIdx >= leafHashes.length) {
    throw new Error('Invalid index or leaf hashes array for Merkle proof generation');
  }

  const proof = [];
  let currentLevel = leafHashes.map((h) => (typeof h === 'string' ? h : sha256(canonicalJsonStringify(h))));
  let idx = targetIdx;

  while (currentLevel.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = (i + 1 < currentLevel.length) ? currentLevel[i + 1] : left;

      if (i === idx) {
        proof.push({ position: 'right', hash: right });
      } else if (i + 1 === idx) {
        proof.push({ position: 'left', hash: left });
      }

      nextLevel.push(sha256(left + right));
    }
    currentLevel = nextLevel;
    idx = Math.floor(idx / 2);
  }

  return {
    targetIndex: targetIdx,
    targetLeaf: leafHashes[targetIdx],
    proof,
    root: currentLevel[0]
  };
}

/**
 * Verifies a Merkle inclusion proof against a known root.
 */
export function verifyMerkleProof(targetLeaf, proof, expectedRoot) {
  let currentHash = typeof targetLeaf === 'string' ? targetLeaf : sha256(canonicalJsonStringify(targetLeaf));

  for (const step of proof) {
    if (step.position === 'right') {
      currentHash = sha256(currentHash + step.hash);
    } else {
      currentHash = sha256(step.hash + currentHash);
    }
  }

  return currentHash === expectedRoot;
}

/**
 * Calculates deterministic block hash for a ledger block.
 */
export function calculateBlockHash(block) {
  const payloadHash = sha256(canonicalJsonStringify(block.payload));
  const evidenceRoot = computeMerkleRoot((block.evidence_hashes || []).map((e) => e.sha256 || sha256(e.path)));

  const blockString = [
    block.index,
    block.timestamp,
    block.decision_id,
    payloadHash,
    block.prev_hash,
    block.nonce,
    evidenceRoot
  ].join(':');

  return sha256(blockString);
}

/**
 * Merkle Decision Ledger Class
 */
export class MerkleDecisionLedger {
  constructor(ledgerFilePath) {
    this.ledgerFilePath = ledgerFilePath;
    this.blocks = [];
    this.ensureLedgerDir();
    this.loadFromDisk();
  }

  ensureLedgerDir() {
    const dir = path.dirname(this.ledgerFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  loadFromDisk() {
    this.blocks = [];
    if (!fs.existsSync(this.ledgerFilePath)) {
      return;
    }

    const lines = fs.readFileSync(this.ledgerFilePath, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (let i = 0; i < lines.length; i++) {
      try {
        const block = JSON.parse(lines[i]);
        this.blocks.push(block);
      } catch (err) {
        throw new LedgerCorruptionError(`Corrupted JSON line at block index ${i}: ${err.message}`, {
          lineIndex: i,
          rawLine: lines[i]
        });
      }
    }
  }

  getLatestBlock() {
    return this.blocks.length > 0 ? this.blocks[this.blocks.length - 1] : null;
  }

  /**
   * Appends a new decision block to the ledger.
   */
  appendDecision(decisionId, payload, options = {}) {
    const latest = this.getLatestBlock();
    const index = latest ? latest.index + 1 : 0;
    const prevHash = latest ? latest.block_hash : GENESIS_PREV_HASH;
    const timestamp = options.timestamp || new Date().toISOString();
    const nonce = options.nonce || crypto.randomBytes(8).toString('hex');

    // Probe physical evidence if provided
    let evidenceHashes = [];
    if (Array.isArray(options.evidencePaths)) {
      const probeRes = probeEvidenceFiles(options.evidencePaths);
      evidenceHashes = probeRes.evidence_manifest.map((m) => ({
        path: m.path,
        sha256: m.sha256
      }));
    } else if (Array.isArray(options.evidence_hashes)) {
      evidenceHashes = options.evidence_hashes;
    }

    const blockCandidate = {
      index,
      timestamp,
      decision_id: decisionId,
      payload,
      prev_hash: prevHash,
      nonce,
      evidence_hashes: evidenceHashes
    };

    const blockHash = calculateBlockHash(blockCandidate);
    const completeBlock = {
      ...blockCandidate,
      block_hash: blockHash
    };

    // Append to file
    fs.appendFileSync(this.ledgerFilePath, JSON.stringify(completeBlock) + '\n', 'utf8');
    this.blocks.push(completeBlock);

    return completeBlock;
  }

  /**
   * Computes the Merkle Root across all block hashes in the ledger.
   */
  getMerkleRoot() {
    if (this.blocks.length === 0) {
      return sha256('EMPTY_LEDGER');
    }
    const blockHashes = this.blocks.map((b) => b.block_hash);
    return computeMerkleRoot(blockHashes);
  }

  /**
   * Generates a Merkle inclusion proof for a block by index.
   */
  getInclusionProof(blockIndex) {
    if (blockIndex < 0 || blockIndex >= this.blocks.length) {
      throw new Error(`Block index ${blockIndex} out of bounds (ledger size: ${this.blocks.length})`);
    }
    const blockHashes = this.blocks.map((b) => b.block_hash);
    return generateMerkleProof(blockHashes, blockIndex);
  }

  /**
   * Verifies the entire ledger for cryptographic integrity and tamper detection.
   */
  verifyIntegrity() {
    this.loadFromDisk();

    if (this.blocks.length === 0) {
      return {
        valid: true,
        block_count: 0,
        merkle_root: sha256('EMPTY_LEDGER'),
        message: 'Ledger is empty and clean.'
      };
    }

    for (let i = 0; i < this.blocks.length; i++) {
      const current = this.blocks[i];

      // 1. Sequence check
      if (current.index !== i) {
        throw new LedgerCorruptionError(`Broken sequence at block ${i}: expected index ${i}, got ${current.index}`, {
          expectedIndex: i,
          actualIndex: current.index
        });
      }

      // 2. Chaining check
      const expectedPrev = (i === 0) ? GENESIS_PREV_HASH : this.blocks[i - 1].block_hash;
      if (current.prev_hash !== expectedPrev) {
        throw new LedgerCorruptionError(`Broken hash chain at block ${i}: prev_hash does not match previous block_hash`, {
          blockIndex: i,
          expectedPrevHash: expectedPrev,
          actualPrevHash: current.prev_hash
        });
      }

      // 3. Block hash recomputation check
      const recomputedHash = calculateBlockHash(current);
      if (current.block_hash !== recomputedHash) {
        throw new LedgerCorruptionError(`Tampered block payload at index ${i}: recomputed hash ${recomputedHash} != stored ${current.block_hash}`, {
          blockIndex: i,
          expectedHash: recomputedHash,
          actualHash: current.block_hash
        });
      }
    }

    const merkleRoot = this.getMerkleRoot();

    return {
      valid: true,
      block_count: this.blocks.length,
      merkle_root: merkleRoot,
      latest_block_hash: this.getLatestBlock().block_hash
    };
  }
}
