/**
 * Post-Compaction Session Bootstrap & Delta Restoration
 * Reconstitutes active session context from compact state metadata.
 */

export function restoreSessionState(checkpoint) {
  if (!checkpoint || !checkpoint.goal_id) {
    return {
      restored: false,
      error: 'Invalid checkpoint: missing goal_id'
    };
  }

  const activeGoal = checkpoint.goal_id;
  const currentStep = checkpoint.current_step ?? 1;
  const changedFiles = Array.isArray(checkpoint.changed_files) ? checkpoint.changed_files : [];
  const pendingGate = checkpoint.pending_gate || 'verify';

  const bootstrapContext = {
    protocol: 'POST_COMPACTION_BOOTSTRAP',
    active_goal: activeGoal,
    current_step: currentStep,
    changed_files: changedFiles,
    pending_gate: pendingGate,
    restoration_timestamp: new Date().toISOString()
  };

  return {
    restored: true,
    bootstrapContext,
    estimatedTokens: 150
  };
}
