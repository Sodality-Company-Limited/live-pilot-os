# G-AG-012: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-012 (Track mid-session token accumulation and limit halting)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-012-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
