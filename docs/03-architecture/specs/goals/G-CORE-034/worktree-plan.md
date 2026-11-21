# G-CORE-034: Subagent Swarm & Git Worktree Orchestration Plan

- Goal: G-CORE-034 (Implement soda-worktree-prune skill and fleet garbage collection driver)

## Worktree Layout
- Single worktree mode (`single_worktree`): Execution on dedicated feature branch `feature/G-CORE-034`.
- Touch map isolation: `scripts/lib/worktree-prune-driver.mjs`, `.agents/skills/soda-worktree-prune/`, and `tests/lib/worktree-prune-driver.test.mjs`.
