# G-AG-002: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-002 (Enforce independent input and output token ceiling gates)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-002-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
