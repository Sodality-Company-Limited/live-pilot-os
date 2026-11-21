# BRIEFING: worker-live-002

## Objective
Execute G-LIVE-002:
1. Review `code/services/session-service/migrations/001_session_state.up.sql` and `001_session_state.down.sql`.
   Ensure it includes all required persistence elements per Step 5 & G-LIVE-002:
   - `session.sessions` (tenant_id, session_id, state, expected_version, created_at, updated_at) with RLS.
   - `session.session_transitions` (state history audit with tenant_id, session_id, from_state, to_state, version, actor_id, occurred_at).
   - `session.inbox` and `session.outbox` tables (idempotency, payload, subject, published_at).
   - `session.idempotency_keys` table.
2. Update `code/services/session-service/src/database.ts` with complete typed interfaces for all tables and transactional boundary helper.
3. Deliver design spec to `docs/03-architecture/specs/goals/G-LIVE-002/design.md`.
4. Create test `code/services/session-service/test/sessionPersistenceInvariants.mjs` verifying all schema invariants, down migration, and tenant scoping.
5. Close goal `docs/07-backlog/goals/G-LIVE-002.md` via `node ./cli.js goal close G-LIVE-002`.

## Acceptance Criteria
- [ ] Schema includes aggregate, history, inbox, outbox, idempotency, and RLS.
- [ ] Down migration exists and reverses all created objects cleanly.
- [ ] Kysely database types in `src/database.ts` fully represent all tables.
- [ ] Automated invariant test passes 100% green.
- [ ] Goal card closed and archived cleanly.
