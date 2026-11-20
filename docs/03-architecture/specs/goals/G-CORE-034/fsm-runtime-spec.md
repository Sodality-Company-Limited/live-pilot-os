# G-CORE-034: Finite State Machine (FSM) Runtime Specification

- Goal: G-CORE-034 (Implement soda-worktree-prune skill and fleet garbage collection driver)

## FSM State Matrix
```text
[WorktreesScanned] ---> (inspect_git_status) ---> [StatusEvaluated]
[StatusEvaluated] ---> (is_dirty_or_locked) ---> [ActiveProtected]
[StatusEvaluated] ---> (is_clean_and_merged) ---> [CandidateReadyForPruning]
[CandidateReadyForPruning] ---> (git_worktree_remove) ---> [WorktreePruned]
```

## Rollback & Compensation Policies
- Worktree removal uses standard Git worktree pruning commands; active dirty worktrees abort execution before any destructive call.
