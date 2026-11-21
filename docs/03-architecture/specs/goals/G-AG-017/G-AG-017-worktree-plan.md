# G-AG-017: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-017 (Detect duplicate step-context packet hashes per goal)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-017-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
