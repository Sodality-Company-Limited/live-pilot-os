/**
 * scripts/lib/decision-ledger.mjs
 *
 * Evidence and Uncertainty Metadata Ledger for Soda OS
 * Goal: G-ML-015
 *
 * Records decision evidence citations, token spans, uncertainty metrics,
 * and reasoning provenance into an append-only JSONL session audit log.
 * Rejects unverified evidence links using physical filesystem probing.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateDecision } from './confidence-calibration.mjs';
import { resolveCanonicalDomain } from './dave-expert-registry.mjs';

export class DecisionLedger {
  /**
   * @param {Object} [options]
   * @param {string} [options.auditPath] - Path to append-only JSONL audit log
   * @param {string} [options.basePath] - Workspace base directory for citation validation
   * @param {string} [options.defaultModelCheckpoint] - Default model checkpoint identifier
   */
  constructor(options = {}) {
    this.basePath = options.basePath ? path.resolve(options.basePath) : process.cwd();
    this.auditPath = options.auditPath
      ? path.resolve(options.auditPath)
      : path.resolve(this.basePath, '.agents/audit/decisions.jsonl');
    this.defaultModelCheckpoint = options.defaultModelCheckpoint || 'soda-agent-v1.0.0';
  }

  /**
   * Verifies that cited evidence files physically exist on disk within workspace boundaries.
   * @param {string[]} evidenceArray - Array of file paths / citations
   * @param {string} [basePath] - Workspace base directory (defaults to instance basePath)
   * @returns {{ verified: boolean, missing: string[], citations: string[], details: Array<{ citation: string, resolvedPath: string, exists: boolean, withinWorkspace: boolean }> }}
   */
  verifyEvidenceCitations(evidenceArray, basePath = this.basePath) {
    if (!Array.isArray(evidenceArray)) {
      throw new TypeError('evidence must be an array');
    }

    const resolvedBase = path.resolve(basePath);
    const missing = [];
    const details = [];

    // If zero citations provided, evidence cannot be verified
    if (evidenceArray.length === 0) {
      const result = {
        verified: false,
        missing: [],
        citations: [],
        details: [],
        valueOf() { return false; },
        [Symbol.toPrimitive]() { return false; }
      };
      return result;
    }

    for (const citation of evidenceArray) {
      if (typeof citation !== 'string') {
        throw new TypeError('All evidence citations must be strings');
      }

      // Resolve relative paths against workspace base
      const resolved = path.isAbsolute(citation)
        ? path.resolve(citation)
        : path.resolve(resolvedBase, citation);

      // Check whether resolved path is within workspace boundaries
      const rel = path.relative(resolvedBase, resolved);
      const withinWorkspace = !rel.startsWith('..') && !path.isAbsolute(rel);

      let exists = false;
      if (withinWorkspace) {
        exists = fs.existsSync(resolved);
      }

      details.push({
        citation,
        resolvedPath: resolved,
        exists,
        withinWorkspace
      });

      if (!exists || !withinWorkspace) {
        missing.push(citation);
      }
    }

    const verified = missing.length === 0;

    const result = {
      verified,
      missing,
      citations: [...evidenceArray],
      details,
      valueOf() { return this.verified; },
      [Symbol.toPrimitive]() { return this.verified; }
    };

    return result;
  }

  /**
   * Records a governed decision to the append-only audit ledger.
   * Validates input schema, checks evidence citations against disk,
   * calculates SHA256 content digest, and appends to the JSONL log.
   *
   * @param {Object} candidateDecision
   * @returns {Object} Persisted audit record
   */
  recordDecision(candidateDecision) {
    // 1. Validate decision contract using confidence-calibration module
    const normalized = validateDecision(candidateDecision);

    // 2. Perform physical evidence citation verification
    const citationResult = this.verifyEvidenceCitations(normalized.evidence, this.basePath);

    // 3. Construct structured audit record
    const id = candidateDecision.id || candidateDecision.decisionId || `dec_${crypto.randomUUID()}`;
    const timestamp = candidateDecision.timestamp || new Date().toISOString();
    const modelCheckpoint = candidateDecision.modelCheckpoint || this.defaultModelCheckpoint;

    // Determine evidenceVerified flag:
    // If candidate explicitly passed false, preserve false.
    // If citations are missing, override to false.
    let evidenceVerified = citationResult.verified;
    if (candidateDecision.evidenceVerified === false) {
      evidenceVerified = false;
    }

    // Support domain aliasing bridge for both legacy and canonical domains
    let resolvedDomain = undefined;
    const rawDomain = candidateDecision.domain || candidateDecision.decision_type;
    if (rawDomain && typeof rawDomain === 'string') {
      try {
        resolvedDomain = resolveCanonicalDomain(rawDomain);
      } catch {
        resolvedDomain = rawDomain;
      }
    }

    const payload = {
      id,
      timestamp,
      modelCheckpoint,
      prompt: candidateDecision.prompt !== undefined ? String(candidateDecision.prompt) : '',
      answer: normalized.answer,
      confidence: normalized.confidence,
      riskLevel: normalized.riskLevel,
      evidence: normalized.evidence,
      evidenceVerified,
      missingEvidence: citationResult.missing,
      tokenSpans: Array.isArray(candidateDecision.tokenSpans) ? candidateDecision.tokenSpans : [],
      uncertaintyMetrics: candidateDecision.uncertaintyMetrics && typeof candidateDecision.uncertaintyMetrics === 'object' && !Array.isArray(candidateDecision.uncertaintyMetrics)
        ? candidateDecision.uncertaintyMetrics
        : {},
      reasoningProvenance: candidateDecision.reasoningProvenance && typeof candidateDecision.reasoningProvenance === 'object' && !Array.isArray(candidateDecision.reasoningProvenance)
        ? candidateDecision.reasoningProvenance
        : {},
      ...(resolvedDomain ? { domain: resolvedDomain } : {}),
      ...(candidateDecision.decision_type ? { decision_type: candidateDecision.decision_type } : {})
    };

    // 4. Compute SHA256 content digest
    const digestSource = JSON.stringify(payload);
    const contentDigest = crypto.createHash('sha256').update(digestSource).digest('hex');
    const fullRecord = { ...payload, contentDigest };

    // 5. Atomic Append to JSONL log
    try {
      const parentDir = path.dirname(this.auditPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      const line = JSON.stringify(fullRecord) + '\n';
      fs.appendFileSync(this.auditPath, line, { encoding: 'utf8', flag: 'a' });
    } catch (err) {
      throw new Error(`Audit ledger write failed: ${err.message}`);
    }

    return fullRecord;
  }

  /**
   * Alias for recordDecision to support appendDecision naming.
   * @param {Object} candidateDecision
   * @returns {Object}
   */
  appendDecision(candidateDecision) {
    return this.recordDecision(candidateDecision);
  }

  /**
   * Reads and parses all decisions from the audit ledger file.
   * @returns {Object[]} Array of decision records
   */
  readDecisions() {
    if (!fs.existsSync(this.auditPath)) {
      return [];
    }

    const content = fs.readFileSync(this.auditPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const records = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        records.push(JSON.parse(lines[i]));
      } catch (err) {
        throw new Error(`Corrupt audit record at line ${i + 1}: ${err.message}`);
      }
    }

    return records;
  }
}

export { resolveCanonicalDomain };
export default DecisionLedger;
