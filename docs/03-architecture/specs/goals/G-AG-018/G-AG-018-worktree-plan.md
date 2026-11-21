# G-AG-018: Subagent Git Worktree & Concurrency Plan

- Goal: G-AG-018 (Capture and redact process execution failure evidence)

## Worktree Isolation
- Subagents execute in isolated worktrees: `.worktrees/G-AG-018-{role}`
- Disjoint Touch Map Theorem: $\text{TouchMap}(A) \cap \text{TouchMap}(B) = \emptyset$
- Fast-forward integration only: `git merge --ff-only`
