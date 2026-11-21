#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ DAVE SYSTEM 1 REVIEW LEARNER & HITL CORRECTION INGESTION ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Epic: DAVE (Goal G-DAVE-006)
 * Paradigm: Zero-Opacity Human Review Packet Formatting & Structured Feedback Parsing
 * 
 * Invariants:
 *  1. Zero hidden chain-of-thought opacity in formatted review packets
 *  2. 9-class canonical correction taxonomy classification
 *  3. Cryptographic input_context_hash preservation for every ingested correction
 *  4. Append-only JSONL audit ledger persistence (artifacts/rlcd/human_corrections.jsonl)
 *  5. Strict fail-closed parsing on ambiguous or contradictory review packets
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const CORRECTION_TAXONOMY_CLASSES = Object.freeze([
  'objective_failure',
  'subjective_preference',
  'missing_context',
  'wrong_reference',
  'wrong_risk_class',
  'wrong_confidence',
  'wrong_routing',
  'wrong_expert',
  'unsafe_action'
]);

export const HUMAN_REVIEW_ACTIONS = Object.freeze([
  'approve',
  'approve_with_edits',
  'reject'
]);

/**
 * Classification keyword patterns for mapping textual feedback rationales.
 */
const CLASSIFICATION_RULES = [
  {
    class: 'wrong_risk_class',
    patterns: [/wrong.*risk/i, /risk.*class/i, /risk.*tier/i, /blast.*radius/i, /drop.*table/i, /elevated.*risk/i, /marked.*as.*low/i]
  },
  {
    class: 'wrong_reference',
    patterns: [/wrong.*ref/i, /ref-\d+/i, /outdated.*ref/i, /deprecated.*ref/i, /incorrect.*citation/i, /hallucinated.*ref/i, /wireframe/i]
  },
  {
    class: 'wrong_confidence',
    patterns: [/confidence/i, /overconfident/i, /underconfident/i, /calibration/i, /uncalibrated/i, /score.*0\.\d+/i]
  },
  {
    class: 'wrong_routing',
    patterns: [/wrong.*rout/i, /rout.*to.*proceed/i, /rout.*to.*defer/i, /rout.*to.*human/i, /should.*route/i, /policy.*router/i]
  },
  {
    class: 'wrong_expert',
    patterns: [/wrong.*expert/i, /expert/i, /specialist/i, /moe.*router/i, /dispatched.*security/i, /dispatched.*backend/i]
  },
  {
    class: 'unsafe_action',
    patterns: [/unsafe/i, /sandbox/i, /injection/i, /vulnerability/i, /bypass.*permission/i, /pii.*redaction/i, /security.*(breach|leak|violation)/i, /leak/i]
  },
  {
    class: 'missing_context',
    patterns: [/missing.*context/i, /missed.*requirement/i, /omitted/i, /forgot/i, /unstated/i, /internationalization/i, /tenancy/i]
  },
  {
    class: 'subjective_preference',
    patterns: [/prefer/i, /preference/i, /taste/i, /aesthetic/i, /styling/i, /color/i, /nicer/i, /cleaner/i, /style/i, /darker/i, /purple/i]
  },
  {
    class: 'objective_failure',
    patterns: [/syntax/i, /compilation/i, /crash/i, /error/i, /exception/i, /broken/i, /bug/i, /invalid/i, /failure/i, /contract.*breach/i]
  }
];

export class DaveReviewLearner {
  constructor(options = {}) {
    this.defaultLedgerPath = options.ledgerPath || 'artifacts/rlcd/human_corrections.jsonl';
  }

  /**
   * Formats a zero-opacity review packet presenting the complete decision context,
   * citations, alternatives, verification plan, and interactive markdown checkboxes.
   * 
   * @param {object} decision - Candidate decision object
   * @param {Array<object>} references - Grounding reference objects
   * @param {object} options - Optional rendering controls
   * @returns {string} Formatted review packet markdown
   */
  renderReviewPacket(decision, references = [], options = {}) {
    if (!decision || typeof decision !== 'object') {
      throw new Error('Candidate decision must be a non-null object');
    }

    const decisionId = decision.decision_id || 'DAVE-UNASSIGNED';
    const goalId = decision.goal_id || 'UNKNOWN';
    const summary = decision.decision?.summary || JSON.stringify(decision.decision || {}, null, 2);
    const confidence = typeof decision.confidence === 'number' ? decision.confidence.toFixed(4) : 'N/A';
    const risk = (decision.risk || 'unknown').toUpperCase();
    const domain = decision.decision_type || 'unknown';

    const refLines = references.length > 0
      ? references.map(r => `   - [${r.reference_id}] (${r.type || 'unknown'}) ${r.uri || 'no-uri'}\n     SHA256: ${(r.content_hash || '').replace('sha256:', '')}`).join('\n')
      : (decision.references || []).map(r => `   - [${r}] (reference record)`).join('\n') || '   - (None declared)';

    const assumptions = (decision.assumptions || []).map(a => `   - ${a}`).join('\n') || '   - (None declared)';
    const alternatives = (decision.alternatives_rejected || []).map(a => `   - ${a}`).join('\n') || '   - (None declared)';
    const verifications = (decision.verification || []).map(v => `   - ${v}`).join('\n') || '   - (Standard test harness pass)';

    const conflicts = (decision.conflicts || []).map(c => `   - [!] Conflict (${(c.domains || []).join(' vs ')}): ${c.summary}`).join('\n');
    const conflictSection = conflicts ? `\n\n4. DETECTED DOMAIN CONFLICTS:\n${conflicts}` : '';

    const taxonomyList = CORRECTION_TAXONOMY_CLASSES.map(cls => `   - [ ] ${cls}`).join('\n');

    const packet = `================================================================================
DAVE REVIEW PACKET: ${decisionId} (Goal: ${goalId})
================================================================================
1. DECISION SUMMARY:
   ${summary}

2. DOMAIN & ACTION:
   Domain: ${domain}
   Risk Level: ${risk} | Calibrated Confidence: ${confidence}
   Routing Status: DEFERRED TO HUMAN REVIEW (Requires Human Sign-off)

3. FIRST-CLASS REFERENCES:
${refLines}${conflictSection}

4. HUMAN ACTION:
   - [ ] approve
   - [ ] approve_with_edits
   - [ ] reject

5. CORRECTION CLASSIFICATION:
${taxonomyList}

6. REVIEWER EDITS:
\`\`\`yaml
# Specify field overrides if action is approve_with_edits (e.g. risk: high)
\`\`\`

7. REVIEWER RATIONALE:
# Provide human reasoning for edit or rejection rationale here

8. REVIEWED BY:
${process.env.USER || 'tech-lead'}

9. EXPLICIT ASSUMPTIONS:
${assumptions}

10. ALTERNATIVES REJECTED:
${alternatives}

11. VERIFICATION PLAN:
${verifications}
================================================================================`;

    if (options.outputPath) {
      const outDir = path.dirname(options.outputPath);
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      fs.writeFileSync(options.outputPath, packet, 'utf8');
    }

    return packet;
  }

  /**
   * Parses a completed review packet markdown extracting human action,
   * edits, correction class, rationale, and reviewer identity.
   * 
   * @param {string} markdownContent - Completed markdown review packet
   * @returns {object} Structured parse result
   */
  parseReviewPacket(markdownContent) {
    const errors = [];

    if (!markdownContent || typeof markdownContent !== 'string') {
      return { valid: false, errors: ['Review packet content is empty or not a string'] };
    }

    // Extract decision_id and goal_id from header
    const headerMatch = markdownContent.match(/DAVE REVIEW PACKET:\s*([A-Za-z0-9_-]+)(?:\s*\(Goal:\s*([A-Za-z0-9_-]+)\))?/i);
    const decisionId = headerMatch ? headerMatch[1] : null;
    const goalId = headerMatch && headerMatch[2] ? headerMatch[2] : null;

    if (!decisionId) {
      errors.push('Unable to find decision_id in review packet header');
    }

    // Section-aware line by line scanning for checkboxes
    const lines = markdownContent.split(/\r?\n/);
    const checkedActions = [];
    const checkedClasses = [];
    let currentSection = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // Detect section header
      const secMatch = line.match(/^(\d+)\.\s+([A-Z0-9_\s]+):/i);
      if (secMatch) {
        currentSection = secMatch[2].trim().toUpperCase();
        continue;
      }

      if (/^-\s*\[x\]/i.test(line)) {
        if (currentSection === 'HUMAN ACTION' || /HUMAN ACTION/i.test(currentSection || '')) {
          if (/approve(?:_|\s+)with(?:_|\s+)edits/i.test(line)) {
            checkedActions.push('approve_with_edits');
          } else if (/approve/i.test(line)) {
            checkedActions.push('approve');
          } else if (/reject/i.test(line)) {
            checkedActions.push('reject');
          }
        } else if (currentSection === 'CORRECTION CLASSIFICATION' || /CORRECTION/i.test(currentSection || '')) {
          for (const cls of CORRECTION_TAXONOMY_CLASSES) {
            if (new RegExp(`\\b${cls}\\b`, 'i').test(line)) {
              checkedClasses.push(cls);
            }
          }
        } else {
          // If section wasn't captured, check content
          if (/approve(?:_|\s+)with(?:_|\s+)edits/i.test(line)) {
            checkedActions.push('approve_with_edits');
          } else if (/approve/i.test(line)) {
            checkedActions.push('approve');
          } else if (/reject/i.test(line)) {
            checkedActions.push('reject');
          } else {
            for (const cls of CORRECTION_TAXONOMY_CLASSES) {
              if (new RegExp(`\\b${cls}\\b`, 'i').test(line)) {
                checkedClasses.push(cls);
              }
            }
          }
        }
      }
    }

    let action = null;
    if (checkedActions.length === 0) {
      errors.push('No action checkbox marked in Section 4 (Human Action)');
    } else if (checkedActions.length > 1) {
      errors.push(`Contradictory action checkboxes marked: ${checkedActions.join(', ')}`);
    } else {
      action = checkedActions[0];
    }

    let correctionClass = null;
    if (checkedClasses.length === 1) {
      correctionClass = checkedClasses[0];
    } else if (checkedClasses.length > 1) {
      errors.push(`Multiple correction classes checked: ${checkedClasses.join(', ')}`);
    }

    // Extract reviewer edits
    let reviewerEdits = '';
    const editsBlockMatch = markdownContent.match(/6\.\s*REVIEWER EDITS:\s*[\r\n]+```(?:yaml|json)?\s*([\s\S]*?)```/i);
    if (editsBlockMatch) {
      reviewerEdits = editsBlockMatch[1].trim();
    } else {
      const editsSectionMatch = markdownContent.match(/6\.\s*REVIEWER EDITS:\s*[\r\n]+([\s\S]*?)(?=\n\d+\.|\n={10,}|$)/i);
      if (editsSectionMatch) {
        reviewerEdits = editsSectionMatch[1].replace(/#.*$/gm, '').trim();
      }
    }

    // Extract reviewer rationale
    let reviewerRationale = '';
    const rationaleMatch = markdownContent.match(/7\.\s*REVIEWER RATIONALE:\s*[\r\n]+([\s\S]*?)(?=\n\d+\.|\n={10,}|$)/i);
    if (rationaleMatch) {
      reviewerRationale = rationaleMatch[1].replace(/#.*$/gm, '').trim();
    }

    // Extract reviewer identity
    let reviewedBy = 'tech-lead';
    const reviewerMatch = markdownContent.match(/8\.\s*REVIEWED BY:\s*[\r\n]+([^\n\r=]+)/i);
    if (reviewerMatch) {
      reviewedBy = reviewerMatch[1].trim();
    }

    // If no explicit correction class checked, try classifying from rationale
    if (!correctionClass && (action === 'reject' || action === 'approve_with_edits') && reviewerRationale) {
      correctionClass = this.classifyCorrection(reviewerRationale);
    }

    // Validation invariants
    if (action === 'reject' && !reviewerRationale) {
      errors.push('Rejection requires non-empty rationale explaining cause for replan');
    }

    if (action === 'approve_with_edits' && !reviewerEdits && !reviewerRationale) {
      errors.push('Approve with edits requires reviewer_edits or rationale detailing modifications');
    }

    return {
      valid: errors.length === 0,
      errors,
      decision_id: decisionId,
      goal_id: goalId,
      action,
      correction_class: correctionClass,
      reviewer_edits: reviewerEdits,
      reviewer_rationale: reviewerRationale,
      reviewed_by: reviewedBy
    };
  }

  /**
   * Classifies free-form human feedback text into one of the 9 canonical taxonomy classes.
   * 
   * @param {string} text - Reviewer rationale text
   * @returns {string|null} Canonical class or null if unclassifiable
   */
  classifyCorrection(text) {
    if (!text || typeof text !== 'string') return null;

    for (const rule of CLASSIFICATION_RULES) {
      for (const pattern of rule.patterns) {
        if (pattern.test(text)) {
          return rule.class;
        }
      }
    }

    return null;
  }

  /**
   * Transforms a validated review record into a standardized training sample
   * and appends it to artifacts/rlcd/human_corrections.jsonl.
   * 
   * @param {object} parsedRecord - Parsed review outcome record
   * @param {object} options - Ingestion options
   * @returns {object} Ingestion confirmation with correction_id and context hash
   */
  ingestCorrection(parsedRecord, options = {}) {
    if (!parsedRecord || typeof parsedRecord !== 'object') {
      throw new Error('Parsed review record must be a non-null object');
    }

    const ledgerPath = path.resolve(process.cwd(), options.ledgerPath || this.defaultLedgerPath);
    const ledgerDir = path.dirname(ledgerPath);
    if (!fs.existsSync(ledgerDir)) {
      fs.mkdirSync(ledgerDir, { recursive: true });
    }

    const decision = parsedRecord.decision || {
      decision_id: parsedRecord.decision_id,
      goal_id: parsedRecord.goal_id
    };

    // Calculate deterministic input context hash
    const inputContextHash = `sha256:${crypto.createHash('sha256').update(JSON.stringify(decision)).digest('hex')}`;
    const correctionId = `CORR-${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    const correctionRecord = {
      correction_id: correctionId,
      decision_id: parsedRecord.decision_id,
      goal_id: parsedRecord.goal_id || 'UNKNOWN',
      action: parsedRecord.action,
      correction_class: parsedRecord.correction_class || null,
      input_context_hash: inputContextHash,
      original_decision: decision,
      reviewer_edits: parsedRecord.reviewer_edits || null,
      reviewer_rationale: parsedRecord.reviewer_rationale || null,
      reviewed_by: parsedRecord.reviewed_by || 'tech-lead',
      timestamp
    };

    // Append atomic JSONL record
    fs.appendFileSync(ledgerPath, JSON.stringify(correctionRecord) + '\n', 'utf8');

    return {
      success: true,
      correction_id: correctionId,
      input_context_hash: inputContextHash,
      ledgerPath,
      record: correctionRecord
    };
  }
}

// Standalone functions
export function renderReviewPacket(decision, references = [], options = {}) {
  const learner = new DaveReviewLearner(options);
  return learner.renderReviewPacket(decision, references, options);
}

export function parseReviewPacket(markdownContent) {
  const learner = new DaveReviewLearner();
  return learner.parseReviewPacket(markdownContent);
}

export function classifyCorrection(text) {
  const learner = new DaveReviewLearner();
  return learner.classifyCorrection(text);
}

export function ingestCorrection(parsedRecord, options = {}) {
  const learner = new DaveReviewLearner(options);
  return learner.ingestCorrection(parsedRecord, options);
}

// CLI Execution
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const subcommand = process.argv[2];
  const subArgs = process.argv.slice(3);

  const learner = new DaveReviewLearner();

  if (!subcommand || subcommand === 'help' || subcommand === '--help') {
    console.log(`DAVE Review Learner CLI
Usage:
  node scripts/lib/dave-review-learner.mjs render-packet <goal-id> [--output <path>]
  node scripts/lib/dave-review-learner.mjs parse-packet <packet-path>
  node scripts/lib/dave-review-learner.mjs ingest <packet-path> [--ledger <path>]
`);
    process.exit(0);
  }

  if (subcommand === 'render-packet') {
    const goalId = subArgs[0] || 'G-DAVE-006';
    let outputPath = 'artifacts/review/DAVE-REVIEW-PACKET.md';
    const outIdx = subArgs.indexOf('--output');
    if (outIdx !== -1 && subArgs[outIdx + 1]) {
      outputPath = subArgs[outIdx + 1];
    }

    // Try to load decision from docs/05-decisions/
    let decision = null;
    const candidates = [
      `docs/05-decisions/DAVE-UX-${goalId}.json`,
      `docs/05-decisions/DAVE-FE-${goalId}.json`,
      `docs/05-decisions/DAVE-GAME-${goalId}.json`,
      `docs/05-decisions/DAVE-API-${goalId}.json`,
      `docs/05-decisions/DAVE-PLAT-${goalId}.json`
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          decision = JSON.parse(fs.readFileSync(cand, 'utf8'));
          break;
        } catch {}
      }
    }

    if (!decision) {
      decision = {
        decision_id: `DAVE-PLAT-${goalId.replace(/[^A-Za-z0-9]/g, '')}`,
        decision_type: 'governance',
        goal_id: goalId,
        decision: {
          summary: `Human review escalation packet for goal ${goalId}`,
          action: 'human_review',
          routing_status: 'blocked_until_approved'
        },
        confidence: 0.82,
        risk: 'medium',
        evidence: ['docs/03-architecture/agent-runtime-governance.md'],
        references: ['REF-0001'],
        assumptions: ['Human reviewer is authorized tech-lead'],
        alternatives_rejected: ['Unverified autonomous execution rejected fail-closed'],
        verification: ['learning-loop-harness.mjs']
      };
    }

    let references = [];
    if (fs.existsSync('docs/02-product/references.json')) {
      try {
        references = JSON.parse(fs.readFileSync('docs/02-product/references.json', 'utf8'));
      } catch {}
    }

    const packet = learner.renderReviewPacket(decision, references, { outputPath });
    console.log(`✅ Review packet rendered to ${outputPath}:`);
    console.log(packet);
    process.exit(0);
  }

  if (subcommand === 'parse-packet') {
    const packetPath = subArgs[0] || 'artifacts/review/DAVE-REVIEW-PACKET.md';
    if (!fs.existsSync(packetPath)) {
      console.error(`❌ Review packet not found: ${packetPath}`);
      process.exit(1);
    }
    const content = fs.readFileSync(packetPath, 'utf8');
    const parsed = learner.parseReviewPacket(content);
    console.log(JSON.stringify(parsed, null, 2));
    process.exit(parsed.valid ? 0 : 1);
  }

  if (subcommand === 'ingest') {
    const packetPath = subArgs[0] || 'artifacts/review/DAVE-REVIEW-PACKET.md';
    let ledgerPath = 'artifacts/rlcd/human_corrections.jsonl';
    const ledIdx = subArgs.indexOf('--ledger');
    if (ledIdx !== -1 && subArgs[ledIdx + 1]) {
      ledgerPath = subArgs[ledIdx + 1];
    }

    if (!fs.existsSync(packetPath)) {
      console.error(`❌ Review packet not found: ${packetPath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(packetPath, 'utf8');
    const parsed = learner.parseReviewPacket(content);
    if (!parsed.valid) {
      console.error('❌ Cannot ingest invalid review packet:', parsed.errors);
      process.exit(1);
    }

    const res = learner.ingestCorrection(parsed, { ledgerPath });
    console.log(`✅ Ingested correction ${res.correction_id} to ${res.ledgerPath}`);
    process.exit(0);
  }

  console.error(`Unknown subcommand: ${subcommand}`);
  process.exit(1);
}
