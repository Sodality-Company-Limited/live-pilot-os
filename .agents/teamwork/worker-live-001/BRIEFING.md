# BRIEFING: worker-live-001

## Objective
Execute G-LIVE-001 Step 1 and 2:
1. Ensure `docs/03-architecture/api/services/session-service.md` specifies all lifecycle states (`created`, `active`, `paused`, `ended`), allowed transitions, headers (`Nats-Msg-Id`, `X-Correlation-Id`, `X-Idempotency-Key`, `X-Tenant-Id`, `X-Session-Id`, `X-Schema-Version`, `X-Producer`, `X-Traceparent`, `X-Mode`), commands, and events.
2. Verify or update `docs/03-architecture/api/schemas/nats/session-lifecycle.schema.json` to strictly match the contract.
3. Verify NATS subjects in `docs/03-architecture/api/nats-subject-catalog-sot.md`.
4. Update `docs/07-backlog/goals/G-LIVE-001.md` status to `ready` -> `in_progress` -> `done` once verified.
5. Run verification gates:
   `node scripts/contract-check/error-code-registry.mjs`
   `node scripts/api/check-api-sot-traceability.mjs`
   `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-LIVE-001.md`

## Acceptance Criteria
- [ ] Contract file exists and is frozen: `docs/03-architecture/api/services/session-service.md`
- [ ] Schema file exists and validates: `docs/03-architecture/api/schemas/nats/session-lifecycle.schema.json`
- [ ] Catalog SOT includes live-session subjects: `docs/03-architecture/api/nats-subject-catalog-sot.md`
- [ ] Verification gates pass 100% green.
