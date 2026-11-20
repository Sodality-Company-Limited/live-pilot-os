# G-AG-007: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-007 (Execute bounded subprocess commands with line clamping)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-007-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
