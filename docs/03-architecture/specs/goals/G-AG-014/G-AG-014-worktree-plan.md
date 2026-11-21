# G-AG-014: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-014 (Report token budget warning and hard limit states)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-014-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
