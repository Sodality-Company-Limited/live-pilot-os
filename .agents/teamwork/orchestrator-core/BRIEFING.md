# Orchestrator Briefing: CORE & INTE Services

## Objective
Coordinate the sequential execution of G-CORE goals (`G-CORE-065` through `G-CORE-070`), dispatching single-persona ephemeral worker subagents governed by the Soda OS 4-file contract.

## Invariants & Guardrails
1. **Article I: Zero Mocks, Zero Stubs, Zero Fallbacks** - 100% fully realized production schemas, tests, and code.
2. **Ephemeral Worker Invariant:** Subagents are spawned per goal/step and terminated immediately upon handoff delivery.
3. **Fail-Closed Verification:** Run all validation suites before marking goals done.
4. **Atomic Closure:** On successful verification, run `node ./cli.js goal close <GOAL_ID>` to archive the goal cleanly.
