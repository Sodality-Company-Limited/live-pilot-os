// Tamper-Evident Merkle Audit Logger for jev-copilot-service
// Generates cryptographically chained audit receipts with SHA-256 Merkle root computation.
// Strictly conforms to audit-receipt.schema.json and ensures non-repudiation across
// provider invocations, model refusals, suggestion deliveries, operator overrides, and withdrawals.

import { createHash } from 'node:crypto';
import { redactSensitiveData } from '../security/pii-redactor.mjs';

export const GENESIS_PREV_HASH = '0'.repeat(64);

export const AUDIT_RESULTS = Object.freeze({
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  FAILED: 'failed',
  UNKNOWN: 'unknown',
  RECONCILED: 'reconciled'
});

export const AUDIT_ACTIONS = Object.freeze({
  SUGGESTION_PROPOSED: 'copilot.suggestion.proposed',
  SUGGESTION_DELIVERED: 'copilot.suggestion.delivered',
  SUGGESTION_USED: 'copilot.suggestion.used',
  SUGGESTION_EDITED: 'copilot.suggestion.edited',
  SUGGESTION_DISMISSED: 'copilot.suggestion.dismissed',
  SUGGESTION_WITHDRAWN: 'copilot.suggestion.withdrawn',
  PROVIDER_INVOCATION: 'copilot.provider.invocation',
  PROVIDER_REFUSED: 'copilot.provider.refused',
  EMERGENCY_PAUSE: 'copilot.emergency.pause'
});

/**
 * Computes SHA-256 hex digest.
 * @param {string|Buffer} data
 * @returns {string}
 */
export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Deterministic JSON stringify with sorted keys.
 * @param {any} obj
 * @returns {string}
 */
export function canonicalJsonStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Merkle Tree Root Calculator for an array of leaf hashes.
 * @param {string[]} leafHashes
 * @returns {string}
 */
export function computeMerkleRoot(leafHashes) {
  if (!leafHashes || leafHashes.length === 0) {
    return '0'.repeat(64);
  }
  if (leafHashes.length === 1) {
    return leafHashes[0];
  }

  let currentLevel = [...leafHashes];
  while (currentLevel.length > 1) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
      const combined = sha256(left + right);
      nextLevel.push(combined);
    }
    currentLevel = nextLevel;
  }
  return currentLevel[0];
}

export class MerkleAuditCorruptionError extends Error {
  /**
   * @param {string} message
   * @param {object} [context]
   */
  constructor(message, context = {}) {
    super(`MerkleAuditCorruptionError: ${message}`);
    this.name = 'MerkleAuditCorruptionError';
    this.context = context;
  }
}

export class MerkleAuditLogger {
  /**
   * @param {object} [options]
   * @param {string} [options.tenantId]
   * @param {string} [options.policyRevision='v1.0.0']
   * @param {Function} [options.sink] - Optional async sink/publisher callback
   */
  constructor(options = {}) {
    this.tenantId = options.tenantId || 'global';
    this.policyRevision = options.policyRevision || 'v1.0.0';
    this.sink = options.sink || null;

    /** @type {Array<object>} */
    this.entries = [];
    this.lastHash = GENESIS_PREV_HASH;
  }

  /**
   * Append an audit event into the immutable Merkle hash chain.
   *
   * @param {object} params
   * @param {string} params.aggregateId - e.g. suggestion_id or session_id
   * @param {string} params.action - e.g. copilot.suggestion.delivered
   * @param {string} [params.actorRef] - actor user id or system service ref
   * @param {'accepted'|'rejected'|'failed'|'unknown'|'reconciled'} [params.result='accepted']
   * @param {string} [params.correlationId]
   * @param {string} [params.causationId]
   * @param {string} [params.traceparent]
   * @param {string[]} [params.evidenceIds]
   * @param {object} [params.metadata]
   * @returns {Promise<object>} Audit record with cryptographic receipt
   */
  async append({
    aggregateId,
    action,
    actorRef = null,
    result = AUDIT_RESULTS.ACCEPTED,
    correlationId = null,
    causationId = null,
    traceparent = '00-00000000000000000000000000000000-0000000000000000-01',
    evidenceIds = [],
    metadata = {}
  }) {
    if (!aggregateId) {
      throw new Error('aggregateId is required for audit receipt');
    }
    if (!action) {
      throw new Error('action is required for audit receipt');
    }

    const sanitizedMetadata = redactSensitiveData(metadata);
    const occurredAt = new Date().toISOString();
    const index = this.entries.length;

    // Payload digest
    const payloadCanonical = canonicalJsonStringify(sanitizedMetadata);
    const payloadSha256 = sha256(payloadCanonical);

    // Build Receipt conforming strictly to audit-receipt.schema.json
    const receiptSeed = `${this.tenantId}:${aggregateId}:${index}:${occurredAt}`;
    const receiptId = `rcpt_${sha256(receiptSeed).slice(0, 24)}`;

    const receipt = {
      receipt_id: receiptId,
      aggregate_id: aggregateId,
      actor_ref: actorRef,
      result: result,
      policy_revision: this.policyRevision,
      ...(evidenceIds && evidenceIds.length > 0 ? { evidence_ids: evidenceIds } : {})
    };

    const prevHash = this.lastHash;

    // Block content for block hashing
    const blockContent = {
      index,
      receipt_id: receiptId,
      tenant_id: this.tenantId,
      aggregate_id: aggregateId,
      action,
      result,
      occurred_at: occurredAt,
      correlation_id: correlationId,
      causation_id: causationId,
      traceparent,
      payload_sha256: payloadSha256,
      prev_hash: prevHash
    };

    const blockHash = sha256(canonicalJsonStringify(blockContent));
    this.lastHash = blockHash;

    const fullRecord = {
      index,
      block_hash: blockHash,
      prev_hash: prevHash,
      receipt,
      tenant_id: this.tenantId,
      action,
      occurred_at: occurredAt,
      correlation_id: correlationId,
      causation_id: causationId,
      traceparent,
      payload_sha256: payloadSha256,
      redacted_metadata: sanitizedMetadata
    };

    this.entries.push(fullRecord);

    if (this.sink && typeof this.sink === 'function') {
      await this.sink(fullRecord);
    }

    return fullRecord;
  }

  /**
   * Computes the Merkle Root across all entries in the ledger.
   * @returns {string}
   */
  getMerkleRoot() {
    const leafHashes = this.entries.map((e) => e.block_hash);
    return computeMerkleRoot(leafHashes);
  }

  /**
   * Generate an audit inclusion proof for a specific receipt index.
   * @param {number} targetIndex
   * @returns {object}
   */
  generateInclusionProof(targetIndex) {
    if (targetIndex < 0 || targetIndex >= this.entries.length) {
      throw new Error(`Index ${targetIndex} out of bounds (0..${this.entries.length - 1})`);
    }

    const leafHashes = this.entries.map((e) => e.block_hash);
    const targetHash = leafHashes[targetIndex];
    const proof = [];

    let currentLevel = [...leafHashes];
    let idx = targetIndex;

    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const parent = sha256(left + right);
        nextLevel.push(parent);

        if (i === idx || i + 1 === idx) {
          if (idx % 2 === 0) {
            proof.push({ position: 'right', hash: right });
          } else {
            proof.push({ position: 'left', hash: left });
          }
        }
      }
      idx = Math.floor(idx / 2);
      currentLevel = nextLevel;
    }

    return {
      target_index: targetIndex,
      target_hash: targetHash,
      merkle_root: this.getMerkleRoot(),
      proof
    };
  }

  /**
   * Verify an inclusion proof against a root.
   *
   * @param {object} proofObj
   * @returns {boolean}
   */
  static verifyInclusionProof({ target_hash, merkle_root, proof }) {
    let currentHash = target_hash;
    for (const step of proof) {
      if (step.position === 'left') {
        currentHash = sha256(step.hash + currentHash);
      } else {
        currentHash = sha256(currentHash + step.hash);
      }
    }
    return currentHash === merkle_root;
  }

  /**
   * Verify the entire cryptographic hash chain from genesis to head.
   * Fails closed if any block hash, prev_hash link, or payload hash is invalid.
   *
   * @throws {MerkleAuditCorruptionError}
   * @returns {{ valid: boolean, count: number, merkle_root: string }}
   */
  verifyChainIntegrity() {
    let expectedPrevHash = GENESIS_PREV_HASH;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];

      // 1. Verify index sequence
      if (entry.index !== i) {
        throw new MerkleAuditCorruptionError(`Index mismatch at entry ${i}: expected ${i}, got ${entry.index}`, {
          entry
        });
      }

      // 2. Verify previous hash chaining
      if (entry.prev_hash !== expectedPrevHash) {
        throw new MerkleAuditCorruptionError(
          `Broken prev_hash chain at index ${i}: expected ${expectedPrevHash}, got ${entry.prev_hash}`,
          { entry }
        );
      }

      // 3. Verify payload SHA-256
      const payloadCanonical = canonicalJsonStringify(entry.redacted_metadata);
      const computedPayloadSha = sha256(payloadCanonical);
      if (computedPayloadSha !== entry.payload_sha256) {
        throw new MerkleAuditCorruptionError(
          `Payload hash corruption at index ${i}: computed ${computedPayloadSha}, recorded ${entry.payload_sha256}`,
          { entry }
        );
      }

      // 4. Verify block hash
      const blockContent = {
        index: entry.index,
        receipt_id: entry.receipt.receipt_id,
        tenant_id: entry.tenant_id,
        aggregate_id: entry.receipt.aggregate_id,
        action: entry.action,
        result: entry.receipt.result,
        occurred_at: entry.occurred_at,
        correlation_id: entry.correlation_id,
        causation_id: entry.causation_id,
        traceparent: entry.traceparent,
        payload_sha256: entry.payload_sha256,
        prev_hash: entry.prev_hash
      };
      const computedBlockHash = sha256(canonicalJsonStringify(blockContent));
      if (computedBlockHash !== entry.block_hash) {
        throw new MerkleAuditCorruptionError(
          `Block hash mismatch at index ${i}: computed ${computedBlockHash}, recorded ${entry.block_hash}`,
          { entry }
        );
      }

      expectedPrevHash = entry.block_hash;
    }

    return {
      valid: true,
      count: this.entries.length,
      merkle_root: this.getMerkleRoot()
    };
  }

  /**
   * Export all records in ledger.
   * @returns {Array<object>}
   */
  getRecords() {
    return [...this.entries];
  }
}
