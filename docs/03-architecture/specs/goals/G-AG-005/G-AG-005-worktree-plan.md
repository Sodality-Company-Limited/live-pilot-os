# G-AG-005: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-005 (Reject full-goal context in step packets)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-005-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
