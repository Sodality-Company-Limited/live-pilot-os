# BRIEFING: orchestrator-live

## Objective
Orchestrate bounded subagents to execute the G-LIVE goals in sequence:
1. `G-LIVE-001`: Freeze live-session service contract and state machine (steps 1–7 of microservice lifecycle).
2. `G-LIVE-002`: Implement service-owned PostgreSQL persistence boundary (steps 5, 9).
3. `G-LIVE-003`: Implement lifecycle command/event vertical slice (steps 8, 10).
4. `G-LIVE-004`: Prove reliability and isolated service readiness (steps 11–14).
5. `G-LIVE-005`: Deploy verified live-session service to DigitalOcean (step 15).

## Current Active Target
`G-LIVE-001`
- Outcome: Freeze live-session service contract, FSM, schemas, catalog, error codes.
- Touch Map:
  - `docs/03-architecture/api/services/session-service.md`
  - `docs/03-architecture/api/schemas/nats/session-lifecycle.schema.json`
  - `docs/03-architecture/api/nats-subject-catalog-sot.md`
  - `docs/03-architecture/contracts/flows/coverage.yaml`

## Acceptance Criteria
- [ ] G-LIVE-001 branch `feature/G-LIVE-001` initialized.
- [ ] Worker subagent spawned with explicit single persona and 4-file contract.
- [ ] Contract, schemas, and FSM verified against error code registry and traceability.
- [ ] Worker subagent terminated immediately post-handoff.
