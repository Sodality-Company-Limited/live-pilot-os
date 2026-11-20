# G-CORE-042: Subagent Swarm & Git Worktree Orchestration Plan

- Goal: G-CORE-042 (Implement soda-live-stream-scrubber skill and streaming token buffer cleaner)

## Worktree Layout
- Single worktree mode (`single_worktree`): Execution on dedicated feature branch `feature/G-CORE-042`.
- Touch map isolation: `scripts/lib/live-stream-scrubber.mjs`, `.agents/skills/soda-live-stream-scrubber/`, and `tests/lib/live-stream-scrubber.test.mjs`.
