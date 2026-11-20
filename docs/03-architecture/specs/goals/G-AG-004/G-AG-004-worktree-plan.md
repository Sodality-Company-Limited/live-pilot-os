# G-AG-004: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-004 (Compile step-scoped partial context packets)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-004-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
