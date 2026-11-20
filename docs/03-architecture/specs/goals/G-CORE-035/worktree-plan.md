# G-CORE-035: Subagent Swarm & Git Worktree Orchestration Plan

- Goal: G-CORE-035 (Implement soda-autopilot-runner skill and autonomous fleet supervisor)

## Worktree Layout
- Single worktree mode (`single_worktree`): Execution on dedicated feature branch `feature/G-CORE-035`.
- Touch map isolation: `scripts/lib/autopilot-runner.mjs`, `.agents/skills/soda-autopilot-runner/`, and `tests/lib/autopilot-runner.test.mjs`.
