/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🏛️ SODA OS ARCHITECTURAL ARENA ENGINE
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Multi-solution architectural candidate bake-off & Pareto matrix evaluator
 * Invariants: Zero Mocks (Article I), Exact Integer Math & Basis Points (Article VI)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import crypto from 'node:crypto';

export const ARENA_STATES = Object.freeze({
  CANDIDATES_INGESTED: 'CandidatesIngested',
  WEIGHTS_NORMALIZED: 'WeightsNormalized',
  CANDIDATES_SCORED: 'CandidatesScored',
  PARETO_FILTERED: 'ParetoFiltered',
  WINNER_SELECTED: 'WinnerSelected'
});

export const VALID_ARENA_TRANSITIONS = Object.freeze({
  [ARENA_STATES.CANDIDATES_INGESTED]: [ARENA_STATES.WEIGHTS_NORMALIZED],
  [ARENA_STATES.WEIGHTS_NORMALIZED]: [ARENA_STATES.CANDIDATES_SCORED],
  [ARENA_STATES.CANDIDATES_SCORED]: [ARENA_STATES.PARETO_FILTERED],
  [ARENA_STATES.PARETO_FILTERED]: [ARENA_STATES.WINNER_SELECTED],
  [ARENA_STATES.WINNER_SELECTED]: []
});

export function transitionArenaState(fromState, toState) {
  const allowed = VALID_ARENA_TRANSITIONS[fromState] || [];
  if (!allowed.includes(toState)) {
    throw new Error(`InvalidArenaStateTransition: Cannot transition from ${fromState} to ${toState}`);
  }
  return toState;
}

/**
 * Normalizes dimension weights using Martin Fowler remainder-preserving allocation
 * to guarantee exact integer conservation of 10,000 basis points.
 */
export function normalizeWeightsBasisPoints(weights) {
  const dims = Object.keys(weights);
  if (dims.length === 0) {
    throw new Error('ZeroTotalWeightError: Weight dimensions cannot be empty');
  }

  let totalWeight = 0n;
  const bigWeights = {};
  for (const dim of dims) {
    const w = BigInt(weights[dim]);
    if (w < 0n) {
      throw new Error(`InvalidWeightError: Weight for ${dim} cannot be negative`);
    }
    bigWeights[dim] = w;
    totalWeight += w;
  }

  if (totalWeight === 0n) {
    throw new Error('ZeroTotalWeightError: Total weight sum cannot be zero');
  }

  const TARGET_TOTAL = 10000n;
  const normalized = {};
  let allocated = 0n;
  const remainders = [];

  for (const dim of dims) {
    const rawProd = bigWeights[dim] * TARGET_TOTAL;
    const baseShare = rawProd / totalWeight;
    const rem = rawProd % totalWeight;
    normalized[dim] = baseShare;
    allocated += baseShare;
    remainders.push({ dim, rem });
  }

  // Remainder-preserving distribution (Martin Fowler's allocation)
  remainders.sort((a, b) => (b.rem > a.rem ? 1 : b.rem < a.rem ? -1 : 0));
  let deficit = TARGET_TOTAL - allocated;
  let idx = 0;
  while (deficit > 0n && idx < remainders.length) {
    normalized[remainders[idx].dim] += 1n;
    deficit -= 1n;
    idx++;
  }

  return normalized;
}

/**
 * Evaluates candidate matrix deterministically with exact BigInt basis points.
 */
export function evaluateCandidateMatrix({ candidates, weights }) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('EmptyCandidateListError: Candidate list must contain at least 1 candidate');
  }

  const normalizedWeights = normalizeWeightsBasisPoints(weights);
  const dims = Object.keys(normalizedWeights);

  const scoredCandidates = candidates.map(c => {
    if (!c.id) {
      throw new Error('InvalidCandidateError: Candidate must have an id');
    }
    let totalScoreBp = 0n;
    const validatedScores = {};

    for (const dim of dims) {
      const s = c.scores?.[dim];
      if (typeof s !== 'number' && typeof s !== 'bigint') {
        throw new Error(`InvalidScoreError: Missing or invalid score for candidate ${c.id} on dimension ${dim}`);
      }
      const scoreVal = BigInt(s);
      if (scoreVal < 0n) {
        throw new Error(`InvalidScoreError: Score for candidate ${c.id} on dimension ${dim} cannot be negative`);
      }
      validatedScores[dim] = scoreVal;
      // scoreVal is in [0, 10000] basis points; normalizedWeights is in [0, 10000]
      // weighted score contribution = (scoreVal * normalizedWeights[dim]) / 10000
      totalScoreBp += (scoreVal * normalizedWeights[dim]) / 10000n;
    }

    return {
      id: c.id,
      name: c.name || c.id,
      scores: validatedScores,
      totalScoreBp
    };
  });

  // Sort deterministically: highest total score first, then lexical ID
  const ranked = [...scoredCandidates].sort((a, b) => {
    if (b.totalScoreBp > a.totalScoreBp) return 1;
    if (b.totalScoreBp < a.totalScoreBp) return -1;
    return a.id.localeCompare(b.id);
  });

  const paretoFrontier = filterParetoFrontier(scoredCandidates);

  const digestPayload = JSON.stringify({
    ranked: ranked.map(r => ({ id: r.id, totalScoreBp: r.totalScoreBp.toString() })),
    normalizedWeights: Object.fromEntries(Object.entries(normalizedWeights).map(([k, v]) => [k, v.toString()]))
  });
  const digest = `sha256:${crypto.createHash('sha256').update(digestPayload).digest('hex')}`;

  return {
    candidates: scoredCandidates,
    normalizedWeights,
    totalBasisPoints: 10000n,
    ranked,
    paretoFrontier,
    winner: ranked[0],
    digest
  };
}

/**
 * Filters candidates to identify the non-dominated Pareto frontier.
 */
export function filterParetoFrontier(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const frontier = [];

  for (let i = 0; i < candidates.length; i++) {
    const c1 = candidates[i];
    let isDominated = false;

    for (let j = 0; j < candidates.length; j++) {
      if (i === j) continue;
      const c2 = candidates[j];
      const dims = Object.keys(c1.scores);

      let strictlyBetterOnAtLeastOne = false;
      let weaklyWorseOnAny = false;

      for (const d of dims) {
        const s1 = BigInt(c1.scores[d]);
        const s2 = BigInt(c2.scores[d]);
        if (s2 > s1) {
          strictlyBetterOnAtLeastOne = true;
        } else if (s2 < s1) {
          weaklyWorseOnAny = true;
        }
      }

      // c2 dominates c1 if c2 is at least as good in all dimensions and strictly better in at least one
      if (strictlyBetterOnAtLeastOne && !weaklyWorseOnAny) {
        isDominated = true;
        break;
      }
    }

    if (!isDominated) {
      frontier.push(c1);
    }
  }

  return frontier;
}

/**
 * Generates an auditable cryptographic proof receipt for an architectural decision.
 */
export function generateDecisionReceipt({ evaluation, goalId, rationale }) {
  if (!evaluation || !evaluation.winner) {
    throw new Error('InvalidEvaluationError: Cannot generate receipt for incomplete evaluation');
  }

  const receiptData = {
    goalId: goalId || 'UNKNOWN_GOAL',
    timestamp: new Date().toISOString(),
    winnerId: evaluation.winner.id,
    winningScoreBp: evaluation.winner.totalScoreBp.toString(),
    rankedCandidates: evaluation.ranked.map(c => ({ id: c.id, scoreBp: c.totalScoreBp.toString() })),
    paretoFrontierIds: evaluation.paretoFrontier.map(c => c.id),
    rationale: rationale || 'Evaluated via soda-architectural-arena Pareto matrix'
  };

  const receiptHash = `sha256:${crypto.createHash('sha256').update(JSON.stringify(receiptData)).digest('hex')}`;

  return {
    ...receiptData,
    receiptHash
  };
}
