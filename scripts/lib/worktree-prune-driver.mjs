/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🧹 SODA OS FLEET WORKTREE PRUNE DRIVER
 * ════════════════════════════════════════════════════════════════════════════════
 * Framework: Soda OS
 * Purpose: Safe inspection, unmounting, and pruning of ephemeral subagent git worktrees
 * Invariants: Zero Mocks (Article I), Safety (INV-034-001), Idempotency (INV-034-002)
 * ════════════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const WORKTREE_PRUNE_STATES = Object.freeze({
  WORKTREES_SCANNED: 'WorktreesScanned',
  STATUS_EVALUATED: 'StatusEvaluated',
  ACTIVE_PROTECTED: 'ActiveProtected',
  CANDIDATE_READY: 'CandidateReadyForPruning',
  WORKTREE_PRUNED: 'WorktreePruned'
});

export const VALID_WORKTREE_PRUNE_TRANSITIONS = Object.freeze({
  [WORKTREE_PRUNE_STATES.WORKTREES_SCANNED]: [WORKTREE_PRUNE_STATES.STATUS_EVALUATED],
  [WORKTREE_PRUNE_STATES.STATUS_EVALUATED]: [
    WORKTREE_PRUNE_STATES.ACTIVE_PROTECTED,
    WORKTREE_PRUNE_STATES.CANDIDATE_READY
  ],
  [WORKTREE_PRUNE_STATES.ACTIVE_PROTECTED]: [],
  [WORKTREE_PRUNE_STATES.CANDIDATE_READY]: [WORKTREE_PRUNE_STATES.WORKTREE_PRUNED],
  [WORKTREE_PRUNE_STATES.WORKTREE_PRUNED]: []
});

export function transitionWorktreePruneState(fromState, toState) {
  const allowed = VALID_WORKTREE_PRUNE_TRANSITIONS[fromState] || [];
  if (!allowed.includes(toState)) {
    throw new Error(`InvalidWorktreePruneStateTransition: Cannot transition from ${fromState} to ${toState}`);
  }
  return toState;
}

const AUTHORIZED_PREFIXES = ['.worktrees/', '../worktrees/'];

/**
 * Validates that a worktree path resides under an authorized ephemeral worktree directory.
 */
export function isAuthorizedWorktreePath(worktreePath) {
  const norm = worktreePath.replace(/\\/g, '/');
  return AUTHORIZED_PREFIXES.some(prefix => norm.startsWith(prefix) || norm.includes(`/${prefix}`));
}

/**
 * Evaluates a list of worktree descriptors to categorize them as prunable or protected.
 * Strict Fail-Closed Safety (INV-034-001):
 * - Dirty worktrees (uncommitted edits) are ALWAYS protected.
 * - Active locked worktrees are ALWAYS protected.
 * - Unmerged worktrees are ALWAYS protected.
 */
export function evaluateWorktreePrunability(worktrees) {
  const prunable = [];
  const protectedList = [];

  for (const wt of worktrees) {
    if (!isAuthorizedWorktreePath(wt.path)) {
      throw new Error(`UnauthorizedWorktreePathError: Refusing to evaluate path outside .worktrees/: ${wt.path}`);
    }

    if (wt.isDirty || wt.hasActiveLock || !wt.isMerged) {
      protectedList.push({
        path: wt.path,
        reason: wt.isDirty ? 'uncommitted_changes' : wt.hasActiveLock ? 'active_process_lock' : 'unmerged_branch'
      });
    } else {
      prunable.push({
        path: wt.path,
        reason: 'clean_merged_ephemeral'
      });
    }
  }

  return {
    prunable,
    protected: protectedList
  };
}

/**
 * Executes worktree pruning with configurable execution adapter for testability and safety.
 * Idempotent (INV-034-002): Pruning zero prunables returns 0 count cleanly without error.
 */
export function executeWorktreePrune({ worktrees, remover }) {
  const evaluation = evaluateWorktreePrunability(worktrees);
  const removeFn = remover || ((targetPath) => {
    execSync(`git worktree remove --force "${targetPath}"`, { stdio: 'pipe' });
  });

  const pruned = [];
  for (const candidate of evaluation.prunable) {
    removeFn(candidate.path);
    pruned.push(candidate.path);
  }

  return {
    scannedCount: worktrees.length,
    prunedCount: pruned.length,
    protectedCount: evaluation.protected.length,
    prunedPaths: pruned,
    protectedWorktrees: evaluation.protected
  };
}
