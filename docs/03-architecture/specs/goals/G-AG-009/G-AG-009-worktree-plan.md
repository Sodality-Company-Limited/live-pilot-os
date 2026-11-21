# G-AG-009: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-009 (Abort streaming provider sessions on budget limits)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-009-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
