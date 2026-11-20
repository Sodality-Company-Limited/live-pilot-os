# G-AG-010: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-010 (Load runtime budget parameters from YAML configuration)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-010-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
