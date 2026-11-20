/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ SODA OS 12-PERSONA MULTI-AGENT TRAJECTORIES BUILDER (STAGE 4 CURRICULUM)
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Paradigm: Multimodal UX/UI Design Decision Layer (M3 / G-UX-012)
 * Purpose: Generates 2,500 deliberation traces across all 12 personas and 10 states
 *          with token budgets, persona proposal logs, collision detection, and
 *          4-tier precedence resolutions (Tier 1 Ethics > Tier 2 Inclusion > Tier 3
 *          Foundations > Tier 4 Polish).
 * ════════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRng } from './scene-graph-dataset-generator.mjs';
import { PERSONA_DEFINITIONS, PERSONA_TIERS } from './ux-persona-registry.mjs';
import { UX_LIFECYCLE_STATES } from './ux-decision-contract.mjs';

export const ALL_12_PERSONAS = Object.freeze(Object.keys(PERSONA_DEFINITIONS));

export const TERMINAL_OUTCOMES = Object.freeze({
  EMIT_DECISION: 'EMIT_DECISION',
  DEFER: 'DEFER',
  REJECT_AS_UNSAFE: 'REJECT_AS_UNSAFE'
});

const TASK_TEMPLATES = [
  'Refactor checkout summary panel to eliminate dark pattern drip pricing.',
  'Implement accessible high-contrast navigation bar with WCAG 2.2 AAA text contrast.',
  'Design responsive telemetry dashboard card grid for desktop and mobile viewports.',
  'Resolve typography line-height and spatial containment collision on card container.',
  'Audit modal dialog for circular focus trapping and Escape key dismissal.',
  'Standardize action buttons using Slate/Indigo tokens with zero raw hex literals.',
  'Evaluate multi-lingual RTL layout mirroring and string expansion boundaries.',
  'Design empty state illustration and retry affordance for telemetry connection loss.'
];

/**
 * Builds a single deliberation trajectory.
 */
export function buildPersonaTrajectory(index, rng = Math.random) {
  const pad = String(index + 1).padStart(6, '0');
  const trajId = `TRAJ-${pad}`;

  const taskIntent = TASK_TEMPLATES[index % TASK_TEMPLATES.length];
  const vpRoll = index % 3;
  const viewport = vpRoll === 0 ? 'desktop' : (vpRoll === 1 ? 'tablet' : 'mobile');

  // Outcome distribution: ~80% EMIT_DECISION, ~10% DEFER, ~10% REJECT_AS_UNSAFE
  const outcomeRoll = index % 10;
  let finalOutcome;
  let confidence;
  let hasVeto = false;
  let hasLowConfidence = false;

  if (outcomeRoll === 8) {
    finalOutcome = TERMINAL_OUTCOMES.DEFER;
    confidence = 0.55 + (rng() * 0.18); // c in [0.55, 0.73] < 0.75
    hasLowConfidence = true;
  } else if (outcomeRoll === 9) {
    finalOutcome = TERMINAL_OUTCOMES.REJECT_AS_UNSAFE;
    confidence = 0.92 + (rng() * 0.07); // High confidence in rejection
    hasVeto = true;
  } else {
    finalOutcome = TERMINAL_OUTCOMES.EMIT_DECISION;
    confidence = 0.78 + (rng() * 0.20); // c in [0.78, 0.98] >= 0.75
  }

  // Ensure all 12 personas rotate and participate
  // Each trajectory selects 6 to 12 personas, deterministically shifting window
  const personaCount = 6 + (index % 7); // 6 to 12
  const participating = [];
  for (let p = 0; p < personaCount; p++) {
    const pName = ALL_12_PERSONAS[(index + p) % ALL_12_PERSONAS.length];
    if (!participating.includes(pName)) {
      participating.push(pName);
    }
  }

  // Invariant: When hasVeto is true (REJECT_AS_UNSAFE), dark_pattern_ethics_watchdog
  // and the conflicting persona (visual_balance_density) MUST be active participants.
  if (hasVeto) {
    if (!participating.includes('dark_pattern_ethics_watchdog')) {
      participating.unshift('dark_pattern_ethics_watchdog');
    }
    if (!participating.includes('visual_balance_density')) {
      participating.push('visual_balance_density');
    }
  }

  // Token budget: strictly bounded by <= 3,000 tokens per contract G-UX-012 Section §12
  const maxTokenBudget = 3000;
  let tokensConsumed = 0;

  // Generate Proposals
  const proposals = [];
  for (const pId of participating) {
    const pDef = PERSONA_DEFINITIONS[pId];
    const remaining = Math.max(0, maxTokenBudget - tokensConsumed);
    const pTokens = Math.min(Math.floor(120 + rng() * 200), remaining);
    tokensConsumed += pTokens;

    let vote = 'approve';
    let proposalText = `Proposal from ${pDef.name}: validated alignment with ${pDef.role}.`;

    if (hasVeto && pDef.tier === PERSONA_TIERS.TIER_1_ETHICS) {
      vote = 'veto';
      proposalText = `[Tier 1 VETO] Dark pattern watchdog detected deceptive pattern violating ethics invariant.`;
    } else if (hasVeto && pDef.tier === PERSONA_TIERS.TIER_2_INCLUSION && rng() > 0.5) {
      vote = 'veto';
      proposalText = `[Tier 2 VETO] WCAG AAA contrast or keyboard trap violation detected.`;
    } else if (hasLowConfidence) {
      vote = 'defer';
      proposalText = `Insufficient visual clarity or ambiguous requirements; recommending DEFER with confidence ${confidence.toFixed(3)}.`;
    }

    proposals.push({
      persona_id: pId,
      tier: pDef.tier,
      vote,
      tokens_used: pTokens,
      rationale: proposalText
    });
  }

  // Collisions and Precedence
  const collisions = [];
  let resolutionRationale = null;

  if (hasVeto) {
    collisions.push({
      collision_id: `COL-${pad}-01`,
      persona_a: 'dark_pattern_ethics_watchdog',
      persona_b: 'visual_balance_density',
      dimension: 'ethics_vs_visual_styling',
      conflict_description: 'Visual balance proposal hid cancellation button under visual interference.'
    });
    resolutionRationale = 'Tier 1 Ethics (dark_pattern_ethics_watchdog) takes absolute precedence over Tier 3 Foundations (visual_balance_density). Proposal rejected fail-closed.';
  } else if (participating.length >= 8 && index % 2 === 0) {
    let pA, pB, dim, desc, resRationale;
    if (participating.includes('accessibility_auditor') && participating.includes('design_systems_lead')) {
      pA = 'accessibility_auditor';
      pB = 'design_systems_lead';
      dim = 'contrast_vs_subtle_border_token';
      desc = 'Subtle border token lacked 3:1 non-text contrast against card background.';
      resRationale = 'Tier 2 Inclusion (accessibility_auditor) supersedes Tier 3 Foundations (design_systems_lead). Border token elevated to border-strong.';
    } else {
      // Dynamically select two participating personas with differing priority tiers (tierA < tierB, tierA >= 2)
      pA = participating.find(p => PERSONA_DEFINITIONS[p].tier === PERSONA_TIERS.TIER_2_INCLUSION);
      pB = participating.find(p => PERSONA_DEFINITIONS[p].tier === PERSONA_TIERS.TIER_3_FOUNDATIONS);
      if (!pA || !pB) {
        pA = participating.find(p => PERSONA_DEFINITIONS[p].tier === PERSONA_TIERS.TIER_3_FOUNDATIONS);
        pB = participating.find(p => PERSONA_DEFINITIONS[p].tier === PERSONA_TIERS.TIER_4_POLISH);
      }
      if (!pA || !pB) {
        pA = participating.find(p => PERSONA_DEFINITIONS[p].tier === PERSONA_TIERS.TIER_2_INCLUSION);
        pB = participating.find(p => PERSONA_DEFINITIONS[p].tier === PERSONA_TIERS.TIER_4_POLISH);
      }
      const defA = PERSONA_DEFINITIONS[pA];
      const defB = PERSONA_DEFINITIONS[pB];
      dim = `tier_${defA.tier}_vs_tier_${defB.tier}`;
      desc = `${defA.name} requirements conflict with ${defB.name} constraints.`;
      resRationale = `Tier ${defA.tier} (${pA}) supersedes Tier ${defB.tier} (${pB}). Invariant enforced.`;
    }
    collisions.push({
      collision_id: `COL-${pad}-01`,
      persona_a: pA,
      persona_b: pB,
      dimension: dim,
      conflict_description: desc
    });
    resolutionRationale = resRationale;
  }

  // 10-State Lifecycle Transition Log
  const transitions = [
    { from: 'OBSERVE', to: 'PERCEIVE', duration_ms: 12 },
    { from: 'PERCEIVE', to: 'CRITIQUE_WCAG', duration_ms: 15 },
    { from: 'CRITIQUE_WCAG', to: 'CRITIQUE_HEURISTICS', duration_ms: 18 },
    { from: 'CRITIQUE_HEURISTICS', to: 'DEBATE', duration_ms: 25 }
  ];

  if (collisions.length > 0) {
    transitions.push({ from: 'DEBATE', to: 'RESOLVE_COLLISION', duration_ms: 22 });
    transitions.push({ from: 'RESOLVE_COLLISION', to: 'EVALUATE_CONFIDENCE', duration_ms: 14 });
  } else {
    transitions.push({ from: 'DEBATE', to: 'EVALUATE_CONFIDENCE', duration_ms: 16 });
  }

  transitions.push({
    from: 'EVALUATE_CONFIDENCE',
    to: finalOutcome,
    duration_ms: 10,
    metadata: { confidence: Number(confidence.toFixed(4)), has_veto: hasVeto }
  });

  const canonicalObj = {
    trajectory_id: trajId,
    task_intent: taskIntent,
    viewport,
    participating_personas: participating,
    participating_count: participating.length,
    tokens_consumed: tokensConsumed,
    max_token_budget: maxTokenBudget,
    proposals,
    collisions_detected_count: collisions.length,
    collisions,
    resolution_rationale: resolutionRationale,
    state_transitions: transitions,
    final_state: finalOutcome,
    calibrated_confidence: Number(confidence.toFixed(4)),
    timestamp: '2026-10-14T05:00:00.000Z'
  };

  const digest = crypto.createHash('sha256').update(JSON.stringify(canonicalObj)).digest('hex');
  canonicalObj.sha256_digest = digest;

  return canonicalObj;
}

/**
 * Generates the full 2,500 trajectory dataset.
 */
export function generatePersonaTrajectories(options = {}) {
  const totalTrajectories = options.total_trajectories !== undefined ? options.total_trajectories : 2500;
  const outputDir = options.output_dir || 'artifacts/curriculum/stage4_trajectories';
  const writeFiles = options.write_files !== undefined ? options.write_files : true;
  const seed = options.seed !== undefined ? options.seed : 20261014;

  const rng = createRng(seed);
  const trajectories = [];

  const personaParticipation = {};
  for (const p of ALL_12_PERSONAS) {
    personaParticipation[p] = 0;
  }

  const outcomeCounts = {
    EMIT_DECISION: 0,
    DEFER: 0,
    REJECT_AS_UNSAFE: 0
  };

  let totalCollisions = 0;
  let totalTokens = 0;

  for (let i = 0; i < totalTrajectories; i++) {
    const traj = buildPersonaTrajectory(i, rng);
    trajectories.push(traj);

    outcomeCounts[traj.final_state]++;
    totalCollisions += traj.collisions_detected_count;
    totalTokens += traj.tokens_consumed;

    for (const p of traj.participating_personas) {
      personaParticipation[p]++;
    }
  }

  const manifest = {
    dataset_name: 'Stage 4 12-Persona Multi-Agent Trajectories',
    total_trajectories: totalTrajectories,
    outcome_distribution: outcomeCounts,
    average_tokens_consumed: Math.round(totalTokens / totalTrajectories),
    total_collisions_resolved: totalCollisions,
    persona_participation_frequencies: personaParticipation,
    all_12_personas_participated: Object.values(personaParticipation).every(count => count > 0),
    lifecycle_states_evaluated_count: UX_LIFECYCLE_STATES.length,
    generated_at: new Date().toISOString()
  };

  if (writeFiles) {
    const targetDir = resolve(process.cwd(), outputDir);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    writeFileSync(
      resolve(targetDir, 'trajectories_2500.jsonl'),
      trajectories.map(t => JSON.stringify(t)).join('\n') + '\n',
      'utf8'
    );
    writeFileSync(
      resolve(targetDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2) + '\n',
      'utf8'
    );
  }

  return { manifest, trajectories };
}
