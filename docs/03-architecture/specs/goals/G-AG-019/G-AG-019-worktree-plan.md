# G-AG-019: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-019 (Enforce exclusive single-owner lease for LLM Wiki retrieval)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-019-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
