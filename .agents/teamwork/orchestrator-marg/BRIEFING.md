# Orchestrator Briefing: MARG Epic Execution

## Objective
Execute the full delivery lifecycle of `margin-policy-service` (Epic `MARG`, Goals `G-MARG-001` through `G-MARG-007`) following the strict 15-step Bug-Free Microservice Standard Operating Procedure.

## Target Goals & Outcomes
1. **G-MARG-001 (API Contract & FSM):** Author and freeze `docs/03-architecture/api/services/margin-policy-service.md` specifying ownership, aggregates, commands, events, FSM lifecycle, and zero-float invariants.
2. **G-MARG-002 (Persistence & Migration):** Author and verify PostgreSQL migrations for policies, verdicts, outbox, inbox, and idempotency records.
3. **G-MARG-003 (Schemas & Contract Tests):** Register NATS schemas, AsyncAPI channels, error codes, and contract tests.
4. **G-MARG-004 (Vertical Slice):** Implement exact integer margin calculator, NATS handlers, outbox pattern, and execute F03.3-FLOW-001/002/003.
5. **G-MARG-005 (Reliability & Alternatives):** Implement safer discount alternative recommendations, stale economics re-evaluation, and DLQ/replay.
6. **G-MARG-006 (Verification & Proofs):** Execute service-level tests, property invariants, and architectural conformance gates.
7. **G-MARG-007 (DigitalOcean Readiness):** Author Dockerfile, Compose definitions, health probes, and staging deployment runbook.

## Invariant Rules
- Zero mocks, zero stubs, zero fallbacks (Article I).
- Zero-float integer money math: BIGINT minor units and basis points only (Article V & VI).
- Ephemeral worker subagents spawned with 4-file contract and terminated upon handoff delivery.
