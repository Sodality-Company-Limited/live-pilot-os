/**
 * Historical Design Archeology Miner
 * Mines git commit history, archived goals, and ADRs to synthesize rationale before refactors.
 */

export function mineDesignArcheology(context) {
  if (!context || typeof context !== 'object') {
    return {
      valid: false,
      error: 'Invalid archeology context'
    };
  }

  const { targetPath, gitLogSnippets, archivedGoals } = context;

  const findings = [];

  if (Array.isArray(gitLogSnippets)) {
    for (const entry of gitLogSnippets) {
      if (entry.commit && entry.message) {
        findings.push({
          source: 'git-commit',
          id: entry.commit,
          rationale: entry.message
        });
      }
    }
  }

  if (Array.isArray(archivedGoals)) {
    for (const goal of archivedGoals) {
      if (goal.id && goal.intent) {
        findings.push({
          source: 'archived-goal',
          id: goal.id,
          rationale: goal.intent
        });
      }
    }
  }

  return {
    valid: true,
    targetPath: targetPath || 'unspecified',
    discoveredRationaleCount: findings.length,
    findings,
    synthesis: findings.length > 0
      ? `Found ${findings.length} historical architectural rationale sources for ${targetPath}. Refactoring must respect identified invariants.`
      : `No prior rationale found for ${targetPath}. Proceed with first-principles domain modeling.`
  };
}
