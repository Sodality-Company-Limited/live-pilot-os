/**
 * Lever Automation Guard
 * Enforces the "Build the Lever" invariant:
 * Prohibits agents from performing > 3 repetitive manual file modifications without authoring an automated tool/script.
 */

export function evaluateLeverRequirement(mutationPlan) {
  if (!mutationPlan || !Array.isArray(mutationPlan.fileEdits)) {
    return {
      requiresLever: false,
      reason: 'Invalid mutation plan'
    };
  }

  const edits = mutationPlan.fileEdits;
  const repetitiveCount = edits.length;

  if (repetitiveCount > 3) {
    const hasCommittedLever = Boolean(mutationPlan.scriptPath && typeof mutationPlan.scriptPath === 'string');
    return {
      requiresLever: true,
      repetitiveEditsCount: repetitiveCount,
      compliant: hasCommittedLever,
      reason: hasCommittedLever
        ? `Build-the-Lever invariant satisfied via script "${mutationPlan.scriptPath}"`
        : `Build-the-Lever invariant violated: ${repetitiveCount} repetitive edits planned. Must author and execute a script or codemod instead of manual edits.`
    };
  }

  return {
    requiresLever: false,
    repetitiveEditsCount: repetitiveCount,
    compliant: true,
    reason: `Small edit scope (${repetitiveCount} files) permitted manually.`
  };
}
