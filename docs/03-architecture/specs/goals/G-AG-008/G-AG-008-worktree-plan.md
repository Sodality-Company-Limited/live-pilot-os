# G-AG-008: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-008 (Prepare provider-neutral bounded session contracts)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-008-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
