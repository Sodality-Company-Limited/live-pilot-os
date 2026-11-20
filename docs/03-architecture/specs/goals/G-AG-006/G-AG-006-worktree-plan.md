# G-AG-006: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-006 (Record compact session telemetry and failure fingerprints)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-006-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
