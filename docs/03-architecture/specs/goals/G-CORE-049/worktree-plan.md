# G-CORE-049: Subagent Swarm & Git Worktree Orchestration Plan

- Goal: G-CORE-049 (Implement soda-release-readiness-verifier skill and pre-PR certifier)

## Worktree Layout
- Single worktree mode (`single_worktree`): Dedicated branch `feature/G-CORE-049`.
- Touch map isolation: `scripts/lib/release-readiness-verifier.mjs`, `.agents/skills/soda-release-readiness-verifier/`, and `tests/lib/release-readiness-verifier.test.mjs`.
