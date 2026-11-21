# G-AG-016: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-016 (Enforce provider prompt deduplication gate)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-016-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
