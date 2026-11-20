# G-AG-015: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-015 (Enforce provider input ceiling pre-spawn gate)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-015-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
