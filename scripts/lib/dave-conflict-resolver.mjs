#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ DAVE MULTI-EXPERT CONFLICT RESOLUTION & SYNTHESIS ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multi-Expert Orchestration, Deterministic Hierarchy & Fail-Closed HITL
 * Goal Reference: G-DAVE-003
 *
 * Implements:
 * 1. Cross-Domain Proposal Ingestion & Pairwise Overlap Detection
 * 2. Conflict Matrix Synthesizer with Strict Priority Hierarchy:
 *    Security (1) > Accessibility (2) > Core Domain (3) > Optimization (4)
 * 3. Deadlock Escalator with Fail-Closed Human Review Routing &
 *    Execution Permission Gating (blocked_until_approved)
 * 4. Technical Rejection Rationale Preservation in Decision Alternatives
 * ════════════════════════════════════════════════════════════════════════════════
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Deterministic Domain Priority Tiers
 * Lower number indicates higher precedence:
 * Tier 1: Security & Governance (Non-negotiable security boundaries)
 * Tier 2: Accessibility & Verification (Legal & universal inclusion standards)
 * Tier 3: Core Domain Specialists (Product, Architecture, API, UX, Database)
 * Tier 4: Optimization, Media & Polish (Performance, Cost, Motion, Audio, Assets)
 */
export const DOMAIN_PRIORITY_TIERS = Object.freeze({
  // Tier 1: Security & Sovereign Governance
  security: 1,
  governance: 1,
  incident: 1,

  // Tier 2: Universal Inclusion & Quality Verification
  accessibility: 2,
  verification: 2,

  // Tier 3: Core Functional Domains
  database: 3,
  data_schema: 3,
  backend_api: 3,
  integration: 3,
  game_architecture: 3,
  product: 3,
  frontend: 3,
  frontend_implementation: 3,
  ux_ui: 3,
  ux_ui_design: 3,
  game_design: 3,
  confidence: 3,
  model_confidence: 3,

  // Tier 4: Optimization, Polish & Runtime Media
  asset: 4,
  visual_asset: 4,
  motion: 4,
  animation_motion: 4,
  audio: 4,
  sound_audio: 4,
  cost: 4,
  performance: 4,
  infrastructure: 4,
  deployment: 4,
  rlcd: 4
});

/**
 * Granular Domain Priority Weight Table (for deterministic intra-tier tie resolution if needed)
 */
export const DOMAIN_PRIORITY_SCORES = Object.freeze({
  security: 100,
  governance: 95,
  incident: 90,
  accessibility: 85,
  verification: 80,
  database: 75,
  data_schema: 75,
  backend_api: 70,
  integration: 70,
  game_architecture: 65,
  product: 60,
  frontend: 55,
  frontend_implementation: 55,
  ux_ui: 50,
  ux_ui_design: 50,
  game_design: 45,
  confidence: 40,
  model_confidence: 40,
  asset: 35,
  visual_asset: 35,
  motion: 30,
  animation_motion: 30,
  audio: 25,
  sound_audio: 25,
  cost: 20,
  performance: 20,
  infrastructure: 15,
  deployment: 10,
  rlcd: 5
});

/**
 * Canonical Conflict Severity Levels
 */
export const CONFLICT_SEVERITY_LEVELS = Object.freeze([
  'critical',
  'high',
  'medium',
  'low'
]);

/**
 * Canonical Property Collision Mappings & Semantics
 */
const SEMANTIC_PROPERTY_PAIRS = [
  { p1: 'contrast_ratio', p2: 'min_contrast_ratio', category: 'accessibility_vs_ux', severity: 'critical' },
  { p1: 'touch_target_size', p2: 'min_touch_target_size', category: 'accessibility_vs_ux', severity: 'high' },
  { p1: 'animation_duration_ms', p2: 'max_animation_duration_ms', category: 'accessibility_vs_motion', severity: 'high' },
  { p1: 'session_encryption', p2: 'allow_plaintext', category: 'security_vs_cost', severity: 'critical' },
  { p1: 'tls_enabled', p2: 'http_fallback', category: 'security_vs_cost', severity: 'critical' },
  { p1: 'jwt_expiry_seconds', p2: 'token_ttl_seconds', category: 'security_vs_ux', severity: 'high' }
];

/**
 * Standardize and normalize proposal object
 */
export function normalizeProposal(proposal, index = 0) {
  if (!proposal || typeof proposal !== 'object') {
    throw new Error(`Invalid proposal at index ${index}: must be a non-null object`);
  }

  const expertId = proposal.expert_id || proposal.expert || `expert-${proposal.domain || 'anon'}-${index}`;
  const domain = String(proposal.domain || proposal.decision_type || 'general').toLowerCase();
  const property = proposal.property || (proposal.decision && Object.keys(proposal.decision)[0]) || 'general_property';
  const proposedValue = proposal.proposed_value !== undefined
    ? proposal.proposed_value
    : (proposal.decision && proposal.decision[property] !== undefined ? proposal.decision[property] : proposal.decision?.summary || proposal.value);
  const evidence = Array.isArray(proposal.evidence) ? proposal.evidence : (proposal.evidence ? [proposal.evidence] : []);
  const references = Array.isArray(proposal.references) ? proposal.references : [];
  const confidence = typeof proposal.confidence === 'number' ? Math.max(0.0, Math.min(1.0, proposal.confidence)) : 0.90;
  const risk = ['low', 'medium', 'high'].includes((proposal.risk || '').toLowerCase()) ? proposal.risk.toLowerCase() : 'medium';
  const rationale = proposal.rationale || proposal.decision?.summary || `Proposal for ${property} by ${domain}`;
  const priorityTier = DOMAIN_PRIORITY_TIERS[domain] ?? 4;
  const priorityScore = DOMAIN_PRIORITY_SCORES[domain] ?? 50;

  return {
    expert_id: expertId,
    domain,
    property,
    proposed_value: proposedValue,
    evidence,
    references,
    confidence,
    risk,
    rationale,
    priority_tier: priorityTier,
    priority_score: priorityScore,
    raw_decision: proposal.decision || null
  };
}

/**
 * DaveConflictDetector
 * Ingests cross-domain proposals and detects pairwise property collisions
 */
export class DaveConflictDetector {
  constructor() {
    this.proposals = [];
  }

  /**
   * Ingest an array of domain proposals
   * @param {Array<object>} proposals 
   * @returns {Array<object>} Normalized proposals
   */
  ingest(proposals = []) {
    if (!Array.isArray(proposals)) {
      throw new Error('Proposals must be provided as an array');
    }
    this.proposals = proposals.map((p, i) => normalizeProposal(p, i));
    return this.proposals;
  }

  /**
   * Detect all pairwise property collisions
   * @param {Array<object>} proposals 
   * @returns {Array<object>} Detected conflicts
   */
  detect(proposals = null) {
    const list = proposals ? proposals.map((p, i) => normalizeProposal(p, i)) : this.proposals;
    const conflicts = [];
    const n = list.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const p1 = list[i];
        const p2 = list[j];
        const collision = this._checkPairCollision(p1, p2, i, j);
        if (collision) {
          conflicts.push(collision);
        }
      }
    }

    return conflicts;
  }

  /**
   * Evaluate collision between two proposals
   */
  _checkPairCollision(p1, p2, idx1, idx2) {
    const isSameDomain = p1.domain === p2.domain;
    const isExactPropertyMatch = p1.property === p2.property;

    // Check semantic property pairing
    const semanticPair = SEMANTIC_PROPERTY_PAIRS.find(
      sp => (sp.p1 === p1.property && sp.p2 === p2.property) || (sp.p1 === p2.property && sp.p2 === p1.property)
    );

    if (!isExactPropertyMatch && !semanticPair) {
      return null;
    }

    // Exact Property Match Evaluation
    if (isExactPropertyMatch) {
      if (isSameDomain) {
        if (JSON.stringify(p1.proposed_value) !== JSON.stringify(p2.proposed_value)) {
          return {
            conflict_id: `CNF-INTRA-${p1.domain.toUpperCase()}-${String(idx1 + 1).padStart(2, '0')}${String(idx2 + 1).padStart(2, '0')}`,
            property: p1.property,
            category: 'intra_domain_contradiction',
            domains: [p1.domain],
            severity: 'high',
            proposals: [p1, p2],
            summary: `Contradictory proposals within domain '${p1.domain}' for property '${p1.property}': ${JSON.stringify(p1.proposed_value)} vs ${JSON.stringify(p2.proposed_value)}`
          };
        }
        return null;
      }

      // Different domains targeting exact same property
      if (JSON.stringify(p1.proposed_value) !== JSON.stringify(p2.proposed_value)) {
        let severity = 'medium';
        let category = `${p1.domain}_vs_${p2.domain}`;

        // Severity heuristics based on domain combinations
        if (p1.domain === 'security' || p2.domain === 'security') {
          severity = 'critical';
          category = 'security_enforcement';
        } else if (p1.domain === 'accessibility' || p2.domain === 'accessibility') {
          severity = (p1.property === 'contrast_ratio' || p1.property.includes('contrast')) ? 'critical' : 'high';
          category = 'accessibility_override';
        } else if (p1.priority_tier <= 2 || p2.priority_tier <= 2) {
          severity = 'high';
        }

        return {
          conflict_id: `CNF-${p1.property.toUpperCase().replace(/[^A-Z0-9]/g, '_')}-${String(idx1 + 1).padStart(2, '0')}${String(idx2 + 1).padStart(2, '0')}`,
          property: p1.property,
          category,
          domains: [p1.domain, p2.domain],
          severity,
          proposals: [p1, p2],
          summary: `Cross-domain collision on '${p1.property}' between '${p1.domain}' (${JSON.stringify(p1.proposed_value)}) and '${p2.domain}' (${JSON.stringify(p2.proposed_value)})`
        };
      }
    }

    // Semantic Property Pair Collision
    if (semanticPair) {
      let isColliding = false;
      let summary = '';

      if (semanticPair.category === 'accessibility_vs_ux' && semanticPair.p1 === 'contrast_ratio') {
        const uxVal = p1.property === 'contrast_ratio' ? p1.proposed_value : p2.proposed_value;
        const a11yVal = p1.property === 'min_contrast_ratio' ? p1.proposed_value : p2.proposed_value;
        if (typeof uxVal === 'number' && typeof a11yVal === 'number' && uxVal < a11yVal) {
          isColliding = true;
          summary = `UX proposed contrast ratio (${uxVal}:1) violates accessibility minimum requirement (${a11yVal}:1)`;
        }
      } else if (semanticPair.category === 'accessibility_vs_ux' && semanticPair.p1 === 'touch_target_size') {
        const uxVal = p1.property === 'touch_target_size' ? p1.proposed_value : p2.proposed_value;
        const a11yVal = p1.property === 'min_touch_target_size' ? p1.proposed_value : p2.proposed_value;
        if (typeof uxVal === 'number' && typeof a11yVal === 'number' && uxVal < a11yVal) {
          isColliding = true;
          summary = `UX proposed touch target size (${uxVal}px) violates accessibility minimum requirement (${a11yVal}px)`;
        }
      } else if (semanticPair.category === 'accessibility_vs_motion') {
        const motionVal = p1.property === 'animation_duration_ms' ? p1.proposed_value : p2.proposed_value;
        const a11yCeiling = p1.property === 'max_animation_duration_ms' ? p1.proposed_value : p2.proposed_value;
        if (typeof motionVal === 'number' && typeof a11yCeiling === 'number' && motionVal > a11yCeiling) {
          isColliding = true;
          summary = `Motion duration (${motionVal}ms) exceeds accessibility vestibuloccular threshold ceiling (${a11yCeiling}ms)`;
        }
      } else if (semanticPair.category === 'security_vs_cost') {
        isColliding = true;
        summary = `Security constraint '${semanticPair.p1}' violates cost/performance optimization '${semanticPair.p2}'`;
      }

      if (isColliding) {
        return {
          conflict_id: `CNF-SEM-${semanticPair.p1.toUpperCase().replace(/[^A-Z0-9]/g, '_')}-${String(idx1 + 1).padStart(2, '0')}${String(idx2 + 1).padStart(2, '0')}`,
          property: semanticPair.p1,
          category: semanticPair.category,
          domains: [p1.domain, p2.domain],
          severity: semanticPair.severity,
          proposals: [p1, p2],
          summary
        };
      }
    }

    return null;
  }
}

/**
 * DaveConflictSynthesizer
 * Synthesizes conflict matrices using deterministic hierarchy and alternative recording
 */
export class DaveConflictSynthesizer {
  constructor(options = {}) {
    this.hierarchy = options.hierarchy || DOMAIN_PRIORITY_TIERS;
    this.scores = options.scores || DOMAIN_PRIORITY_SCORES;
  }

  /**
   * Synthesize a structured conflict matrix from proposals and detected collisions
   * @param {Array<object>} proposals 
   * @param {Array<object>} detectedConflicts 
   * @param {object} options 
   * @returns {object} Structured conflict matrix
   */
  synthesize(proposals = [], detectedConflicts = [], options = {}) {
    const goalId = options.goalId || 'G-DAVE-003';
    const matrixId = `CMX-${crypto.createHash('sha256').update(JSON.stringify(proposals)).digest('hex').slice(0, 12).toUpperCase()}`;

    const resolvedConflicts = [];
    const deadlocks = [];
    const winningProposals = new Map();
    const rejectedAlternatives = [];

    // Evaluate each conflict against the deterministic hierarchy
    for (const conflict of detectedConflicts) {
      const [p1, p2] = conflict.proposals;
      const t1 = this.hierarchy[p1.domain] ?? 4;
      const t2 = this.hierarchy[p2.domain] ?? 4;

      if (t1 !== t2) {
        // Deterministic Hierarchy Victory (Lower tier number wins)
        const winner = t1 < t2 ? p1 : p2;
        const loser = t1 < t2 ? p2 : p1;
        const winnerTier = Math.min(t1, t2);
        const loserTier = Math.max(t1, t2);

        const winnerTitle = winner.domain.charAt(0).toUpperCase() + winner.domain.slice(1);
        const rejectionReason = `Overridden by ${winnerTitle} hierarchy tier (Tier ${winnerTier} vs Tier ${loserTier}): ${winner.domain.toUpperCase()} constraints strictly supersede ${loser.domain.toUpperCase()} proposal for '${conflict.property}'. Technical rationale: ${winner.rationale || 'Architectural compliance'}`;

        const rejectedProposal = {
          expert_id: loser.expert_id,
          domain: loser.domain,
          property: loser.property,
          proposed_value: loser.proposed_value,
          rejection_reason: rejectionReason,
          evidence: loser.evidence,
          confidence: loser.confidence,
          risk: loser.risk
        };

        rejectedAlternatives.push(rejectedProposal);

        resolvedConflicts.push({
          conflict_id: conflict.conflict_id,
          property: conflict.property,
          category: conflict.category,
          domains: conflict.domains,
          severity: conflict.severity,
          status: 'resolved',
          winning_proposal: winner,
          rejected_proposals: [rejectedProposal],
          applied_rule: `hierarchy_${winner.domain}_over_${loser.domain}`,
          resolution_rationale: `Resolved automatically: ${winner.domain} holds Tier ${winnerTier} precedence over ${loser.domain} (Tier ${loserTier}).`
        });
      } else {
        // Equal Tier Collision
        // Check if there is decisive evidence disparity or if intra-tier score differs significantly
        const s1 = this.scores[p1.domain] ?? 50;
        const s2 = this.scores[p2.domain] ?? 50;

        let winner = null;
        let loser = null;
        if (p1.domain !== p2.domain && Math.abs(s1 - s2) >= 15 && Math.abs(p1.confidence - p2.confidence) >= 0.10) {
          if (s1 > s2 && p1.confidence >= p2.confidence) {
            winner = p1;
            loser = p2;
          } else if (s2 > s1 && p2.confidence >= p1.confidence) {
            winner = p2;
            loser = p1;
          }
        }

        if (winner && loser) {
          const winnerScore = this.scores[winner.domain] ?? 50;
          const loserScore = this.scores[loser.domain] ?? 50;
          const rejectionReason = `Subordinated to ${winner.domain} based on domain score (${winnerScore} vs ${loserScore}) and verified confidence (${winner.confidence.toFixed(2)} vs ${loser.confidence.toFixed(2)}).`;

          const rejectedProposal = {
            expert_id: loser.expert_id,
            domain: loser.domain,
            property: loser.property,
            proposed_value: loser.proposed_value,
            rejection_reason: rejectionReason,
            evidence: loser.evidence,
            confidence: loser.confidence,
            risk: loser.risk
          };

          rejectedAlternatives.push(rejectedProposal);
          resolvedConflicts.push({
            conflict_id: conflict.conflict_id,
            property: conflict.property,
            category: conflict.category,
            domains: conflict.domains,
            severity: conflict.severity,
            status: 'resolved',
            winning_proposal: winner,
            rejected_proposals: [rejectedProposal],
            applied_rule: `domain_score_${winner.domain}_over_${loser.domain}`,
            resolution_rationale: rejectionReason
          });
        } else {
          // Unresolvable Deadlock: Escalate to Human Review
          const deadlockItem = {
            conflict_id: conflict.conflict_id,
            property: conflict.property,
            category: conflict.category,
            domains: conflict.domains,
            severity: conflict.severity,
            status: 'deadlocked',
            proposals: [p1, p2],
            deadlock_reason: `Equal priority tier between '${p1.domain}' and '${p2.domain}' without dominant authoritative evidence or tie-breaker.`
          };
          resolvedConflicts.push(deadlockItem);
          deadlocks.push(deadlockItem);
        }
      }
    }

    // Identify all properties involved in any conflict and any deadlock
    const conflictingProps = new Set();
    for (const c of detectedConflicts) {
      conflictingProps.add(c.property);
      if (c.proposals) {
        for (const p of c.proposals) {
          conflictingProps.add(p.property);
        }
      }
    }

    const deadlockedProps = new Set();
    for (const dl of deadlocks) {
      deadlockedProps.add(dl.property);
      if (dl.proposals) {
        for (const p of dl.proposals) {
          deadlockedProps.add(p.property);
        }
      }
    }

    // Multi-way property arbitration for conflicting properties with zero deadlocks:
    // Identify candidate proposals for that property that were NEVER defeated in any pairwise conflict
    const uniqueConflictProperties = [...new Set(detectedConflicts.map(c => c.property))];

    for (const prop of uniqueConflictProperties) {
      // Never emit an accepted decision for a property in deadlockedProps
      if (deadlockedProps.has(prop)) {
        continue;
      }

      // Candidate proposals for that property from detected conflicts
      const candidateProposals = [];
      for (const c of detectedConflicts) {
        if (c.property === prop) {
          for (const p of c.proposals) {
            if (!candidateProposals.some(cand => cand.expert_id === p.expert_id)) {
              candidateProposals.push(p);
            }
          }
        }
      }

      // Filter candidates that were NEVER defeated in any pairwise conflict (i.e. not in rejectedAlternatives)
      const undefeatedCandidates = candidateProposals.filter(cand =>
        !rejectedAlternatives.some(r => r.expert_id === cand.expert_id)
      );

      if (undefeatedCandidates.length === 1) {
        const undefeatedWinner = undefeatedCandidates[0];
        winningProposals.set(prop, undefeatedWinner);
      }
    }

    // Build synthesized decisions list
    // 1. Proposals that were not in conflict
    const synthesizedDecisions = [];

    for (const p of proposals) {
      if (!conflictingProps.has(p.property)) {
        synthesizedDecisions.push({
          decision_id: `DEC-${p.domain.toUpperCase()}-${p.property.toUpperCase()}`,
          domain: p.domain,
          property: p.property,
          value: p.proposed_value,
          confidence: p.confidence,
          risk: p.risk,
          evidence: p.evidence,
          references: p.references,
          alternatives_rejected: [],
          status: 'accepted'
        });
      }
    }

    // 2. Add winning proposals with their recorded rejected alternatives
    for (const [prop, winner] of winningProposals.entries()) {
      if (deadlockedProps.has(prop)) {
        continue;
      }

      const relRejected = rejectedAlternatives
        .filter(r => r.property === prop || r.property === winner.property)
        .map(r => `Rejected ${r.domain} value '${JSON.stringify(r.proposed_value)}': ${r.rejection_reason}`);

      synthesizedDecisions.push({
        decision_id: `DEC-${winner.domain.toUpperCase()}-${prop.toUpperCase()}`,
        domain: winner.domain,
        property: prop,
        value: winner.proposed_value,
        confidence: winner.confidence,
        risk: winner.risk,
        evidence: winner.evidence,
        references: winner.references,
        alternatives_rejected: [...new Set(relRejected)],
        status: 'accepted'
      });
    }

    // Determine Escalation State
    const hasDeadlocks = deadlocks.length > 0;
    const requiresHumanReview = hasDeadlocks;
    const route = hasDeadlocks ? 'human_review' : 'proceed';
    const executionPermission = hasDeadlocks ? 'blocked_until_approved' : 'permitted';

    const reviewPacket = hasDeadlocks ? formatConflictReviewPacket(deadlocks, goalId) : null;

    return {
      matrix_id: matrixId,
      goal_id: goalId,
      timestamp: new Date().toISOString(),
      conflicts: resolvedConflicts,
      synthesized_decisions: synthesizedDecisions,
      rejected_alternatives: rejectedAlternatives,
      deadlocks,
      escalation: {
        requires_human_review: requiresHumanReview,
        route,
        execution_permission: executionPermission,
        review_packet: reviewPacket
      }
    };
  }
}

/**
 * DaveDeadlockEscalator
 * Formats structured review packets and enforces fail-closed permission blocking
 */
export class DaveDeadlockEscalator {
  /**
   * Format human review packet for deadlocked conflicts
   * @param {Array<object>} deadlocks 
   * @param {string} goalId 
   * @returns {string} Formatted review packet
   */
  static formatReviewPacket(deadlocks = [], goalId = 'G-DAVE-003') {
    return formatConflictReviewPacket(deadlocks, goalId);
  }
}

/**
 * Format Human-in-the-Loop Conflict Review Packet
 */
export function formatConflictReviewPacket(deadlocks = [], goalId = 'G-DAVE-003') {
  const sections = deadlocks.map((dl, idx) => {
    const p1 = dl.proposals[0];
    const p2 = dl.proposals[1];

    return `--------------------------------------------------------------------------------
CONFLICT #${idx + 1}: [${dl.conflict_id}] Property: '${dl.property}'
Affected Domains: ${dl.domains.join(' vs ')}
Severity: ${(dl.severity || 'high').toUpperCase()}
Deadlock Rationale: ${dl.deadlock_reason}

PROPOSAL A:
  - Expert: ${p1.expert_id} (${p1.domain})
  - Proposed Value: ${JSON.stringify(p1.proposed_value)}
  - Calibrated Confidence: ${typeof p1.confidence === 'number' ? p1.confidence.toFixed(4) : 'N/A'}
  - Risk Level: ${(p1.risk || 'medium').toUpperCase()}
  - Technical Rationale: ${p1.rationale || 'N/A'}
  - Evidence: ${(p1.evidence || []).join(', ') || '(none declared)'}

PROPOSAL B:
  - Expert: ${p2.expert_id} (${p2.domain})
  - Proposed Value: ${JSON.stringify(p2.proposed_value)}
  - Calibrated Confidence: ${typeof p2.confidence === 'number' ? p2.confidence.toFixed(4) : 'N/A'}
  - Risk Level: ${(p2.risk || 'medium').toUpperCase()}
  - Technical Rationale: ${p2.rationale || 'N/A'}
  - Evidence: ${(p2.evidence || []).join(', ') || '(none declared)'}

HUMAN ADJUDICATION REQUIRED:
  [ ] 1. Approve Proposal A (${p1.domain}: ${JSON.stringify(p1.proposed_value)})
  [ ] 2. Approve Proposal B (${p2.domain}: ${JSON.stringify(p2.proposed_value)})
  [ ] 3. Synthesize custom compromise (specify below)
  [ ] 4. Reject both proposals and trigger replanning
--------------------------------------------------------------------------------`;
  }).join('\n\n');

  return `================================================================================
DAVE CONFLICT RESOLUTION REVIEW PACKET: ${goalId}
Generated At: ${new Date().toISOString()}
Deadlocked Collisions: ${deadlocks.length}
Routing: ROUTE_TO_HUMAN_REVIEW (Fail-Closed)
EXECUTION PERMISSION: BLOCKED UNTIL APPROVED
================================================================================

${sections}

================================================================================
CRITICAL CONSTITUTIONAL INVARIANT:
Autonomous execution is hard-locked. No mutation or deployment will occur
until human review signature is recorded in .agents/audit/decisions.jsonl.
================================================================================`;
}

/**
 * DaveConflictResolver (Facade Orchestrator)
 */
export class DaveConflictResolver {
  constructor(options = {}) {
    this.detector = new DaveConflictDetector();
    this.synthesizer = new DaveConflictSynthesizer(options);
  }

  resolve(proposals = [], options = {}) {
    const normalized = this.detector.ingest(proposals);
    const conflicts = this.detector.detect(normalized);
    const matrix = this.synthesizer.synthesize(normalized, conflicts, options);
    return {
      detector: this.detector,
      synthesizer: this.synthesizer,
      matrix
    };
  }
}

/**
 * Top-Level Export Functions
 */
export function detectDomainConflicts(proposals = []) {
  const detector = new DaveConflictDetector();
  const normalized = detector.ingest(proposals);
  return detector.detect(normalized);
}

export function synthesizeConflictMatrix(proposals = [], options = {}) {
  const detector = new DaveConflictDetector();
  const normalized = detector.ingest(proposals);
  const conflicts = detector.detect(normalized);
  const synthesizer = new DaveConflictSynthesizer(options);
  return synthesizer.synthesize(normalized, conflicts, options);
}

export function resolveConflicts(proposals = [], options = {}) {
  const resolver = new DaveConflictResolver(options);
  return resolver.resolve(proposals, options);
}

/**
 * Evaluates canonical conflicts or custom input and optionally writes to disk
 * @param {object} options 
 * @returns {Promise<object>} Conflict Matrix
 */
export async function evaluateConflicts(options = {}) {
  const goalId = options.goalId || 'G-DAVE-003';
  const outputPath = options.outputPath || path.join(process.cwd(), 'artifacts/proofs/G-DAVE-003-conflict-matrix.json');

  let proposals = options.proposals;

  if (!proposals) {
    if (options.inputPath && fs.existsSync(options.inputPath)) {
      proposals = JSON.parse(fs.readFileSync(options.inputPath, 'utf8'));
    } else {
      // Canonical multi-domain test battery
      proposals = [
        // Conflict 1: UX vs Accessibility (Contrast Ratio)
        {
          expert_id: 'exp-ux-01',
          domain: 'ux_ui',
          property: 'contrast_ratio',
          proposed_value: 3.2,
          evidence: ['docs/03-architecture/design-tokens.md'],
          confidence: 0.90,
          risk: 'medium',
          rationale: 'Subtle gray on light gray for minimalist visual aesthetic'
        },
        {
          expert_id: 'exp-a11y-01',
          domain: 'accessibility',
          property: 'contrast_ratio',
          proposed_value: 4.5,
          evidence: ['standards/wcag-2.2-aa.md'],
          confidence: 0.99,
          risk: 'high',
          rationale: 'WCAG 2.2 AA mandatory contrast 4.5:1 for standard body text'
        },

        // Conflict 2: UX vs Accessibility (Touch Target Size)
        {
          expert_id: 'exp-ux-02',
          domain: 'ux_ui',
          property: 'touch_target_size',
          proposed_value: 32,
          evidence: ['tokens/compact-table.css'],
          confidence: 0.88,
          risk: 'low',
          rationale: 'Dense data grid compact action icon buttons'
        },
        {
          expert_id: 'exp-a11y-02',
          domain: 'accessibility',
          property: 'touch_target_size',
          proposed_value: 44,
          evidence: ['standards/wcag-target-size.md'],
          confidence: 0.98,
          risk: 'medium',
          rationale: 'WCAG 2.5.5 touch target minimum 44x44px'
        },

        // Conflict 3: Cost/Performance vs Security (Session Token Encryption)
        {
          expert_id: 'exp-perf-01',
          domain: 'cost',
          property: 'session_encryption',
          proposed_value: false,
          evidence: ['benchmarks/redis-throughput.md'],
          confidence: 0.91,
          risk: 'medium',
          rationale: 'Disable session token encryption to cut Redis latency by 1.2ms'
        },
        {
          expert_id: 'exp-sec-01',
          domain: 'security',
          property: 'session_encryption',
          proposed_value: true,
          evidence: ['security/soc2-cc6.1.md'],
          confidence: 1.0,
          risk: 'high',
          rationale: 'Mandatory zero-trust AES-256 session token encryption at rest'
        },

        // Conflict 4: Deadlocked Backend vs Frontend Data Protocol
        {
          expert_id: 'exp-be-01',
          domain: 'backend_api',
          property: 'data_protocol',
          proposed_value: 'grpc_protobuf',
          evidence: ['specs/grpc-schema.proto'],
          confidence: 0.88,
          risk: 'medium',
          rationale: 'Binary Protobuf streams for low-latency cluster messaging'
        },
        {
          expert_id: 'exp-fe-01',
          domain: 'frontend',
          property: 'data_protocol',
          proposed_value: 'graphql_apollo',
          evidence: ['specs/client-queries.graphql'],
          confidence: 0.88,
          risk: 'medium',
          rationale: 'Declarative GraphQL query fetching for client view compositions'
        },

        // Non-Conflicting Complementary Proposals
        {
          expert_id: 'exp-db-01',
          domain: 'database',
          property: 'rls_geo_sharding',
          proposed_value: 'th_bkk_01',
          evidence: ['db/migrations/20261003_rls.sql'],
          confidence: 0.96,
          risk: 'low',
          rationale: 'Thai PDPA geo-fenced read/write replica'
        }
      ];
    }
  }

  const matrix = synthesizeConflictMatrix(proposals, { goalId });

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(matrix, null, 2), 'utf8');
  }

  return matrix;
}

/**
 * CLI Entrypoint
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'evaluate-conflicts';

  if (command === '--help' || command === '-h') {
    console.log(`DAVE Conflict Resolution CLI
Usage:
  node scripts/lib/dave-conflict-resolver.mjs evaluate-conflicts [input.json] [--output <path>]
  node scripts/lib/dave-conflict-resolver.mjs --help
`);
    process.exit(0);
  }

  if (command === 'evaluate-conflicts') {
    let inputPath = null;
    let outputPath = path.join(process.cwd(), 'artifacts/proofs/G-DAVE-003-conflict-matrix.json');

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--output' && args[i + 1]) {
        outputPath = args[i + 1];
        i++;
      } else if (!args[i].startsWith('-')) {
        inputPath = args[i];
      }
    }

    console.log('⚔️  Executing DAVE Multi-Expert Conflict Resolution & Synthesis Engine...');
    const matrix = await evaluateConflicts({ inputPath, outputPath, goalId: 'G-DAVE-003' });

    console.log(`\n✅ Conflict Matrix Synthesized: ${matrix.matrix_id}`);
    console.log(`   Goal: ${matrix.goal_id}`);
    console.log(`   Total Detected Conflicts: ${matrix.conflicts.length}`);
    console.log(`   Resolved via Hierarchy:   ${matrix.conflicts.filter(c => c.status === 'resolved').length}`);
    console.log(`   Deadlocked Collisions:    ${matrix.deadlocks.length}`);
    console.log(`   Rejected Alternatives:    ${matrix.rejected_alternatives.length}`);
    console.log(`   Routing Status:           ${matrix.escalation.route.toUpperCase()}`);
    console.log(`   Execution Permission:     ${matrix.escalation.execution_permission.toUpperCase()}`);
    console.log(`   Proof Matrix Written To:  ${outputPath}\n`);

    if (matrix.deadlocks.length > 0) {
      console.log('🚨 HUMAN REVIEW REQUIRED (Execution Permission Blocked Fail-Closed):');
      console.log(matrix.escalation.review_packet);
    }

    process.exit(0);
  }

  console.error(`Unknown command: ${command}. Use --help for usage.`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch(err => {
    console.error('❌ Fatal error in DAVE conflict resolver:', err);
    process.exit(1);
  });
}
