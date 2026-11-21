# G-AG-013: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-013 (Normalize provider token counters with fallback estimation)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-013-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
