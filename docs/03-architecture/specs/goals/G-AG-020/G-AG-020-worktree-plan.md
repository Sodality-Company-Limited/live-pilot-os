# G-AG-020: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-020 (Validate end-to-end coordinator-to-subagent dispatch lifecycle)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-020-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
