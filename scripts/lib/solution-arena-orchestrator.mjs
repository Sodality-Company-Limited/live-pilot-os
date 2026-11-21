/**
 * Solution Arena Orchestrator
 * Evaluates competing candidate implementations in an empirical benchmark duel across tests, latency, and code diff size.
 */

export function runSolutionArena(duel) {
  if (!duel || !Array.isArray(duel.candidates) || duel.candidates.length < 2) {
    return {
      valid: false,
      error: 'Solution Arena requires at least 2 competing candidates'
    };
  }

  let bestCandidate = null;
  let highestScore = -1;

  const scoredCandidates = duel.candidates.map(c => {
    // Scoring formula: (testsPassed ? 50 : 0) + max(0, 30 - latencyMs / 10) + max(0, 20 - diffLines / 5)
    let score = 0;
    if (c.testsPassed) score += 50;
    score += Math.max(0, 30 - Math.floor((c.latencyMs || 100) / 10));
    score += Math.max(0, 20 - Math.floor((c.diffLines || 50) / 5));

    if (score > highestScore) {
      highestScore = score;
      bestCandidate = c.id;
    }

    return {
      id: c.id,
      name: c.name,
      testsPassed: Boolean(c.testsPassed),
      latencyMs: c.latencyMs || 0,
      diffLines: c.diffLines || 0,
      score
    };
  });

  return {
    valid: true,
    protocol: 'SOLUTION_ARENA_DUEL',
    winner: bestCandidate,
    highestScore,
    candidates: scoredCandidates
  };
}
