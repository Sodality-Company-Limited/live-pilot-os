# Orchestrator Briefing: Telemetry Service (TELM)

## Objective
Sequentially execute G-TELM goals, starting with `G-TELM-001`. Spawn ephemeral worker subagents to freeze the Telemetry Service Contract, validate schema definitions, and enforce 100% SOT traceability.

## Execution Invariants
1. Zero Mocks, Zero Stubs, Zero Fallbacks (Article I).
2. Ephemeral Worker Invariant: Spawn worker with single task contract and kill upon handoff delivery.
3. Fail-Closed Verification: Run contract check, schema validation, and SOT traceability before advancing status.
4. Atomic Closure: Update frontmatter, mark acceptance criteria `- [x]`, and archive goal on done.
