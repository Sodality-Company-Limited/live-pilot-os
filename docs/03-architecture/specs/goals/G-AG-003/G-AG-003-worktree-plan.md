# G-AG-003: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-003 (Reject duplicate input prompts for the same goal)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-003-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
