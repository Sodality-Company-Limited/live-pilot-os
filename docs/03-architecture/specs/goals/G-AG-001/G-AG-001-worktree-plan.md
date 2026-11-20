# G-AG-001: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-001 (Enforce single-persona and touch-map contracts)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-001-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
