# G-AG-011: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-011 (Prune expired and oversized telemetry files)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-011-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
