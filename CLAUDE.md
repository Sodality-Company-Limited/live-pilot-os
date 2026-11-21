# Soda OS Claude entry point

When working in this repository, Claude must treat Soda OS governance as the combined
contract defined by:

1. `AGENTS.md` — project mission, scope, workflow, and approval gates.
2. `.agents/AGENTS.md` — the shared Soda OS constitution and cross-repository invariants.
3. `.agents/rules/` — always load `core.md`, `governance.md`, `security.md`, and `guidelines.md`, plus rules relevant to the task.
4. `.agents/skills/soda-*/` — load the matching skill before implementation.

Project-local instructions define product scope but cannot weaken shared Soda OS governance.
If the governance files are missing, stale, or contradictory, stop and report the gap before
changing code.

The root `AGENTS.md` and `.agents/AGENTS.md` remain the authoritative source documents; this
file is a Claude-specific discovery bridge so Claude Code loads the same governance context.
