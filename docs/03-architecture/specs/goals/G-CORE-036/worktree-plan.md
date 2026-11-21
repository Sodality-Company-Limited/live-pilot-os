# G-CORE-036: Subagent Swarm & Git Worktree Orchestration Plan

- Goal: G-CORE-036 (Implement soda-multiphase-planner skill and DAG plan compiler)

## Worktree Layout
- Single worktree mode (`single_worktree`): Execution on dedicated feature branch `feature/G-CORE-036`.
- Touch map isolation: `scripts/lib/multiphase-plan-compiler.mjs`, `.agents/skills/soda-multiphase-planner/`, and `tests/lib/multiphase-plan-compiler.test.mjs`.
