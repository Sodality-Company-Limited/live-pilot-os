#!/usr/bin/env node

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS MULTI-PERSONA CONFLICT RESOLUTION & PRIORITY HIERARCHY ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M1 / G-UX-004)
 * Purpose: Pairwise collision detection across 12 agent personas, deterministic
 *          4-tier precedence hierarchy resolution, intra-tier tie-breaking, and
 *          fail-closed Human-in-the-Loop review packet generation on deadlocks.
 * ════════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'node:crypto';
import { PERSONA_TIERS } from './ux-persona-registry.mjs';

/**
 * 4-Tier Persona Precedence Mapping
 * Tier 1: Ethics & Deception Watchdog (Highest, non-negotiable)
 * Tier 2: Universal Inclusion & Safety (WCAG 2.2 AAA, i18n RTL, Ergonomics)
 * Tier 3: Core Foundations & System (IA, Design Tokens, Typography, Layout, State)
 * Tier 4: Sensory Polish & Tone (Color specialist, Motion/Haptics, Microcopy)
 */
export const UX_PERSONA_TIERS = Object.freeze({
  dark_pattern_ethics_watchdog: PERSONA_TIERS.TIER_1_ETHICS,

  accessibility_auditor: PERSONA_TIERS.TIER_2_INCLUSION,
  i18n_multilocale_stylist: PERSONA_TIERS.TIER_2_INCLUSION,
  ergonomics_cognitive_critic: PERSONA_TIERS.TIER_2_INCLUSION,

  enterprise_info_architect: PERSONA_TIERS.TIER_3_FOUNDATIONS,
  design_systems_lead: PERSONA_TIERS.TIER_3_FOUNDATIONS,
  typography_scale_architect: PERSONA_TIERS.TIER_3_FOUNDATIONS,
  visual_balance_density: PERSONA_TIERS.TIER_3_FOUNDATIONS,
  interaction_choreographer: PERSONA_TIERS.TIER_3_FOUNDATIONS,

  color_contrast_specialist: PERSONA_TIERS.TIER_4_POLISH,
  motion_haptics_engineer: PERSONA_TIERS.TIER_4_POLISH,
  microcopy_tone_specialist: PERSONA_TIERS.TIER_4_POLISH
});

/**
 * Granular Priority Scores for Intra-Tier Tie-Breaking
 */
export const UX_PERSONA_PRIORITY_SCORES = Object.freeze({
  dark_pattern_ethics_watchdog: 1000,

  accessibility_auditor: 900,
  i18n_multilocale_stylist: 850,
  ergonomics_cognitive_critic: 800,

  design_systems_lead: 700,
  enterprise_info_architect: 650,
  interaction_choreographer: 600,
  typography_scale_architect: 550,
  visual_balance_density: 500,

  color_contrast_specialist: 400,
  motion_haptics_engineer: 350,
  microcopy_tone_specialist: 300
});

/**
 * Conflict Severity Levels
 */
export const CONFLICT_SEVERITY_LEVELS = Object.freeze([
  'critical',
  'high',
  'medium',
  'low'
]);

/**
 * Canonical Semantic Property Overlaps across UX Domains
 */
export const UX_SEMANTIC_PROPERTY_PAIRS = Object.freeze([
  { p1: 'contrast_ratio', p2: 'min_contrast_ratio', category: 'accessibility_vs_style', severity: 'critical' },
  { p1: 'text_contrast', p2: 'brand_color', category: 'accessibility_vs_color', severity: 'critical' },
  { p1: 'touch_target_size', p2: 'element_size', category: 'accessibility_vs_density', severity: 'high' },
  { p1: 'touch_target_size', p2: 'min_touch_target_size', category: 'accessibility_vs_density', severity: 'high' },
  { p1: 'animation_duration_ms', p2: 'max_duration_ms', category: 'motion_vs_performance', severity: 'medium' },
  { p1: 'prefers_reduced_motion', p2: 'animation_duration_ms', category: 'accessibility_vs_motion', severity: 'critical' },
  { p1: 'navigation_depth', p2: 'max_depth', category: 'ia_vs_navigation', severity: 'high' },
  { p1: 'requires_confirmation', p2: 'instant_action', category: 'safety_vs_friction', severity: 'critical' },
  { p1: 'raw_color_hex', p2: 'semantic_token', category: 'token_vs_literal', severity: 'high' },
  { p1: 'line_height', p2: 'line_height_ratio', category: 'typography_vs_density', severity: 'medium' },
  { p1: 'characters_per_line', p2: 'container_width', category: 'readability_vs_layout', severity: 'medium' },
  { p1: 'rtl_logical_property', p2: 'physical_directional_css', category: 'i18n_vs_layout', severity: 'high' }
]);

/**
 * Normalizes a UX proposal into a standard schema
 *
 * @param {object} proposal
 * @param {number} [index=0]
 * @returns {object} Normalized proposal
 */
export function normalizeUxProposal(proposal, index = 0) {
  if (!proposal || typeof proposal !== 'object') {
    throw new Error(`Invalid proposal at index ${index}: must be a non-null object`);
  }

  const persona = proposal.persona || proposal.expert_id || proposal.author || `persona_anon_${index}`;
  const property = proposal.property || proposal.target_property || 'general_property';
  const proposedValue = proposal.proposed_value !== undefined ? proposal.proposed_value : proposal.value;
  const canonicalTier = UX_PERSONA_TIERS[persona];
  const canonicalPriority = UX_PERSONA_PRIORITY_SCORES[persona];
  const tier = canonicalTier !== undefined ? canonicalTier : (proposal.tier ?? PERSONA_TIERS.TIER_4_POLISH);
  const priorityScore = canonicalPriority !== undefined ? canonicalPriority : (proposal.priority_score ?? 100);
  const constraintType = ['MIN', 'MAX', 'EXACT', 'PREFERENCE'].includes(proposal.constraint_type) ? proposal.constraint_type : 'EXACT';

  const confidence = typeof proposal.confidence === 'number' ? Math.max(0.0, Math.min(1.0, proposal.confidence)) : 0.90;
  const rationale = proposal.rationale || `Proposal for ${property} by ${persona}`;
  const evidence = Array.isArray(proposal.evidence) ? proposal.evidence : (proposal.evidence ? [proposal.evidence] : []);
  const forceEscalate = Boolean(proposal.force_escalate || proposal.conflict_policy === 'force_human_review');

  return {
    proposal_id: proposal.proposal_id || `prop_${persona}_${index}_${crypto.randomBytes(3).toString('hex')}`,
    persona,
    tier,
    priority_score: priorityScore,
    property,
    proposed_value: proposedValue,
    constraint_type: constraintType,
    confidence,
    rationale,
    evidence,
    force_escalate: forceEscalate,
    metadata: proposal.metadata || {}
  };
}

/**
 * Evaluates whether two proposals constitute a mutual property collision
 *
 * @param {object} p1 - Normalized proposal 1
 * @param {object} p2 - Normalized proposal 2
 * @returns {{ isCollision: boolean, category: string, severity: string, reason: string }}
 */
export function evaluatePairwiseCollision(p1, p2) {
  if (p1.persona === p2.persona) {
    return { isCollision: false, category: 'identical_persona', severity: 'none', reason: 'Same persona' };
  }

  // Exact property clash
  if (p1.property === p2.property) {
    const val1 = JSON.stringify(p1.proposed_value);
    const val2 = JSON.stringify(p2.proposed_value);

    if (val1 !== val2) {
      const severity = (p1.tier === 1 || p2.tier === 1) ? 'critical' :
                       (p1.tier === 2 || p2.tier === 2) ? 'high' :
                       (p1.tier === 3 || p2.tier === 3) ? 'medium' : 'low';
      return {
        isCollision: true,
        category: 'exact_property_overwrite',
        severity,
        reason: `Conflicting values for identical property '${p1.property}': ${val1} vs ${val2}`
      };
    }
  }

  // Semantic overlap clash
  for (const pair of UX_SEMANTIC_PROPERTY_PAIRS) {
    const directMatch = (p1.property === pair.p1 && p2.property === pair.p2) ||
                        (p1.property === pair.p2 && p2.property === pair.p1);
    if (directMatch) {
      return {
        isCollision: true,
        category: pair.category,
        severity: pair.severity,
        reason: `Semantic collision on dimension '${pair.category}' between '${p1.property}' and '${p2.property}'`
      };
    }
  }

  // Custom metadata / attribute overlap
  if (p1.metadata?.collides_with && p1.metadata.collides_with === p2.property) {
    return {
      isCollision: true,
      category: 'explicit_metadata_collision',
      severity: 'high',
      reason: `Explicit collision declared between '${p1.property}' and '${p2.property}'`
    };
  }

  return { isCollision: false, category: 'disjoint', severity: 'none', reason: 'No collision detected' };
}

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * UxConflictDetector
 * Ingests proposals and discovers all pairwise property & semantic collisions
 * ════════════════════════════════════════════════════════════════════════════════
 */
export class UxConflictDetector {
  constructor() {
    this.proposals = [];
  }

  ingest(proposals = []) {
    if (!Array.isArray(proposals)) {
      throw new Error('Proposals must be provided as an array');
    }
    this.proposals = proposals.map((p, i) => normalizeUxProposal(p, i));
    return this.proposals;
  }

  detect(proposals = null) {
    const list = proposals ? proposals.map((p, i) => normalizeUxProposal(p, i)) : this.proposals;
    const collisions = [];
    const n = list.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const p1 = list[i];
        const p2 = list[j];
        const evalResult = evaluatePairwiseCollision(p1, p2);

        if (evalResult.isCollision) {
          collisions.push({
            collision_id: `col_${p1.persona}_${p2.persona}_${crypto.randomBytes(3).toString('hex')}`,
            property_a: p1.property,
            property_b: p2.property,
            category: evalResult.category,
            severity: evalResult.severity,
            reason: evalResult.reason,
            proposal_a: p1,
            proposal_b: p2,
            is_cross_tier: p1.tier !== p2.tier
          });
        }
      }
    }

    return collisions;
  }
}

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * UxConflictSynthesizer
 * Applies deterministic 4-tier precedence hierarchy and intra-tier tie-breakers
 * ════════════════════════════════════════════════════════════════════════════════
 */
export class UxConflictSynthesizer {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Resolves a pairwise collision deterministically
   *
   * @param {object} collision
   * @returns {{ resolved: boolean, winner: object|null, loser: object|null, deadlock: boolean, rationale: string }}
   */
  resolvePair(collision) {
    const p1 = collision.proposal_a;
    const p2 = collision.proposal_b;

    // 1. Cross-Tier Deterministic Resolution (Strict Monotonic Precedence)
    if (p1.tier !== p2.tier) {
      const higherTier = p1.tier < p2.tier ? p1 : p2;
      const lowerTier = p1.tier < p2.tier ? p2 : p1;

      // Higher-tier proposal requesting force_escalate mandates deadlock escalation
      if (higherTier.force_escalate) {
        return {
          resolved: false,
          winner: null,
          loser: null,
          deadlock: true,
          rationale: `Deadlock escalated: Explicit human review required for higher-tier ${higherTier.persona}`
        };
      }

      // Unambiguous higher-tier winner overrides lower-tier (lower-tier force_escalate cannot block)
      return {
        resolved: true,
        winner: higherTier,
        loser: lowerTier,
        deadlock: false,
        rationale: `Tier ${higherTier.tier} (${higherTier.persona}) overrides Tier ${lowerTier.tier} (${lowerTier.persona}) by constitutional hierarchy`
      };
    }

    // Explicit force escalate flag for intra-tier collisions
    if (p1.force_escalate || p2.force_escalate) {
      return {
        resolved: false,
        winner: null,
        loser: null,
        deadlock: true,
        rationale: `Deadlock escalated: Explicit human review required for ${p1.force_escalate ? p1.persona : p2.persona}`
      };
    }

    // 2. Intra-Tier Numeric Constraint Resolution
    if (typeof p1.proposed_value === 'number' && typeof p2.proposed_value === 'number') {
      if (p1.constraint_type === 'MIN' && p2.constraint_type === 'MIN') {
        // Stricter (larger) minimum wins
        const winner = p1.proposed_value >= p2.proposed_value ? p1 : p2;
        const loser = p1.proposed_value >= p2.proposed_value ? p2 : p1;
        return {
          resolved: true,
          winner,
          loser,
          deadlock: false,
          rationale: `Intra-Tier ${p1.tier} numeric resolution: Stricter MIN bound ${winner.proposed_value} overrides ${loser.proposed_value}`
        };
      }
      if (p1.constraint_type === 'MAX' && p2.constraint_type === 'MAX') {
        // Stricter (smaller) maximum wins
        const winner = p1.proposed_value <= p2.proposed_value ? p1 : p2;
        const loser = p1.proposed_value <= p2.proposed_value ? p2 : p1;
        return {
          resolved: true,
          winner,
          loser,
          deadlock: false,
          rationale: `Intra-Tier ${p1.tier} numeric resolution: Stricter MAX bound ${winner.proposed_value} overrides ${loser.proposed_value}`
        };
      }
    }

    // 3. Intra-Tier Priority Score Tie-Breaking
    if (p1.priority_score !== p2.priority_score) {
      const winner = p1.priority_score > p2.priority_score ? p1 : p2;
      const loser = p1.priority_score > p2.priority_score ? p2 : p1;
      return {
        resolved: true,
        winner,
        loser,
        deadlock: false,
        rationale: `Intra-Tier ${p1.tier} score resolution: ${winner.persona} (${winner.priority_score}) overrides ${loser.persona} (${loser.priority_score})`
      };
    }

    // 4. Equal Tier & Equal Priority with Contradictory Values -> Deadlock
    return {
      resolved: false,
      winner: null,
      loser: null,
      deadlock: true,
      rationale: `Equal-tier deadlock in Tier ${p1.tier}: ${p1.persona} and ${p2.persona} have identical priority scores (${p1.priority_score}) with mutually contradictory proposals`
    };
  }

  /**
   * Synthesizes all proposals against all detected collisions
   *
   * @param {Array<object>} proposals
   * @param {Array<object>} collisions
   * @returns {{ resolvedProposals: Array<object>, overriddenProposals: Array<object>, deadlocks: Array<object> }}
   */
  synthesize(proposals, collisions) {
    const eliminated = new Map(); // proposal_id -> reason
    const deadlocks = [];

    for (const col of collisions) {
      const pairResult = this.resolvePair(col);
      if (pairResult.deadlock) {
        deadlocks.push({
          collision: col,
          rationale: pairResult.rationale,
          tier: col.proposal_a.tier,
          personas: [col.proposal_a.persona, col.proposal_b.persona]
        });
      } else if (pairResult.resolved && pairResult.loser) {
        eliminated.set(pairResult.loser.proposal_id, {
          proposal: pairResult.loser,
          overridden_by: pairResult.winner,
          rationale: pairResult.rationale
        });
      }
    }

    // Filter out deadlocks where any participant proposal was eliminated by a higher-tier winner
    const activeDeadlocks = deadlocks.filter(d => 
      !eliminated.has(d.collision.proposal_a.proposal_id) && 
      !eliminated.has(d.collision.proposal_b.proposal_id)
    );

    const resolvedProposals = proposals.filter(p => !eliminated.has(p.proposal_id));
    const overriddenProposals = Array.from(eliminated.values());

    return {
      resolvedProposals,
      overriddenProposals,
      deadlocks: activeDeadlocks
    };
  }
}

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * UxDeadlockEscalator
 * Formats immutable Human-in-the-Loop review packets for unresolved deadlocks
 * ════════════════════════════════════════════════════════════════════════════════
 */
export class UxDeadlockEscalator {
  /**
   * Generates a formal Review Packet
   *
   * @param {object} deadlockInfo
   * @param {object} [context={}]
   * @returns {object} Formatted review packet
   */
  static formatReviewPacket(deadlockInfo, context = {}) {
    const decisionId = context.decision_id || `DEC-UX-${Date.now()}`;
    const packetId = `REV-UX-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const col = deadlockInfo.collision || {};
    const propA = col.proposal_a || {};
    const propB = col.proposal_b || {};

    const options = [
      {
        option_id: 'OPT_A',
        label: `Adopt Proposal A from ${propA.persona || 'Persona A'}`,
        proposed_value: propA.proposed_value,
        implications: propA.rationale || 'Adopts primary value'
      },
      {
        option_id: 'OPT_B',
        label: `Adopt Proposal B from ${propB.persona || 'Persona B'}`,
        proposed_value: propB.proposed_value,
        implications: propB.rationale || 'Adopts secondary value'
      },
      {
        option_id: 'OPT_SYNTHESIS',
        label: 'Human Architectural Override / Compromise',
        implications: 'Manual human-specified value overriding automated personas',
        requires_input: true
      }
    ];

    const recommendedAction = {
      action: 'FAIL_SAFE_CONSERVATIVE_HOLD',
      description: `Hold changes on ${propA.property || 'property'} until human architect selects preferred trade-off.`
    };

    const packetPayload = {
      packet_id: packetId,
      decision_id: decisionId,
      timestamp,
      status: 'DEADLOCK_ESCALATED',
      tier: deadlockInfo.tier || propA.tier || 3,
      conflict_dimension: col.category || 'unknown_dimension',
      deadlocked_personas: deadlockInfo.personas || [propA.persona, propB.persona],
      conflicting_proposals: [propA, propB],
      recommended_action: recommendedAction,
      options,
      requires_human_signoff: true
    };

    // Bind cryptographic content digest
    const digest = crypto.createHash('sha256')
      .update(JSON.stringify(packetPayload))
      .digest('hex');

    return {
      ...packetPayload,
      packet_sha256: digest
    };
  }
}

/**
 * ════════════════════════════════════════════════════════════════════════════════
 * UxConflictResolver
 * Complete facade coordinating detection, synthesis, and deadlock escalation
 * ════════════════════════════════════════════════════════════════════════════════
 */
export class UxConflictResolver {
  constructor(options = {}) {
    this.detector = new UxConflictDetector();
    this.synthesizer = new UxConflictSynthesizer(options);
    this.options = options;
  }

  /**
   * Resolves a suite of persona proposals
   *
   * @param {Array<object>} proposals
   * @param {object} [context={}]
   * @returns {{ status: string, resolved_proposals: Array<object>, overridden_proposals: Array<object>, deadlocks: Array<object>, review_packet: object|null, consensus_score: number, blocked_until_approved: boolean }}
   */
  resolve(proposals = [], context = {}) {
    if (!Array.isArray(proposals) || proposals.length === 0) {
      return {
        status: 'NO_CONFLICT',
        resolved_proposals: [],
        overridden_proposals: [],
        deadlocks: [],
        review_packet: null,
        consensus_score: 1.0,
        blocked_until_approved: false
      };
    }

    const normalized = this.detector.ingest(proposals);
    const collisions = this.detector.detect(normalized);

    if (collisions.length === 0) {
      return {
        status: 'NO_CONFLICT',
        resolved_proposals: normalized,
        overridden_proposals: [],
        deadlocks: [],
        review_packet: null,
        consensus_score: 1.0,
        blocked_until_approved: false
      };
    }

    const synthesis = this.synthesizer.synthesize(normalized, collisions);

    // Calculate consensus score: ratio of surviving proposals to total
    const consensusScore = Number((synthesis.resolvedProposals.length / normalized.length).toFixed(4));

    if (synthesis.deadlocks.length > 0) {
      const primaryDeadlock = synthesis.deadlocks[0];
      const reviewPacket = UxDeadlockEscalator.formatReviewPacket(primaryDeadlock, context);

      return {
        status: 'DEADLOCK_ESCALATED',
        resolved_proposals: synthesis.resolvedProposals,
        overridden_proposals: synthesis.overriddenProposals,
        deadlocks: synthesis.deadlocks,
        review_packet: reviewPacket,
        consensus_score: consensusScore,
        blocked_until_approved: true
      };
    }

    return {
      status: 'RESOLVED',
      resolved_proposals: synthesis.resolvedProposals,
      overridden_proposals: synthesis.overriddenProposals,
      deadlocks: [],
      review_packet: null,
      consensus_score: consensusScore,
      blocked_until_approved: false
    };
  }
}

/**
 * Functional helpers
 */
export function detectUxConflicts(proposals) {
  const detector = new UxConflictDetector();
  return detector.detect(proposals);
}

export function resolveUxConflicts(proposals, context = {}) {
  const resolver = new UxConflictResolver();
  return resolver.resolve(proposals, context);
}

export function formatUxReviewPacket(deadlockInfo, context = {}) {
  return UxDeadlockEscalator.formatReviewPacket(deadlockInfo, context);
}
