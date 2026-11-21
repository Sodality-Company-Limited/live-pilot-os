# BRIEFING: worker-live-003

## Objective
Execute G-LIVE-003:
1. Implement the vertical slice for session lifecycle command/event processing in `code/services/session-service/src/`:
   - Lifecycle FSM handler: handle `start`, `pause`, `resume`, `end` operations.
   - Transactional boundary: read current state, validate transition, validate `expected_version`, record transition in `session_transitions`, insert event in `outbox`, and update `sessions` atomically.
   - Idempotency handler: check `idempotency_keys` table; if duplicate command received, return previous response without re-executing.
   - Authentication context validator: enforce presence of required headers (`Nats-Msg-Id`, `X-Correlation-Id`, `X-Idempotency-Key`, `X-Tenant-Id`, `X-Session-Id`, `X-Schema-Version`, `X-Producer`, `X-Traceparent`, `X-Mode`).
2. Write unit and integration contract tests in `code/services/session-service/test/`:
   - State transition tests (valid paths, invalid transitions fail-closed).
   - Version conflict tests (optimistic locking failure with conflict response).
   - Idempotent deduplication test (same key returns cached response).
   - Outbox event payload schema validation.
3. Deliver design spec to `docs/03-architecture/specs/goals/G-LIVE-003/design.md`.
4. Advance `docs/07-backlog/goals/G-LIVE-003.md` to `ready` -> `in_progress` -> `done` and execute `node ./cli.js goal close G-LIVE-003`.
5. Deliver handoff to `.agents/teamwork/worker-live-003/handoff.md`.

## Acceptance Criteria
- [ ] Operational vertical slice code implemented with zero mocks.
- [ ] Contract, idempotency, version conflict, and outbox emission tests pass 100% green.
- [ ] Goal card closed and archived cleanly.
