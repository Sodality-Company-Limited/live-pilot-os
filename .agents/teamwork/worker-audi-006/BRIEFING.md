# Worker Briefing: G-AUDI-006 Query Projection & DLQ Recovery

## Objective
Implement action log query projections, DLQ publishing, and operator replay:
1. `code/services/audit-service/src/application/action-log-query.service.ts`:
   - Handles `livepilot.v1.audit.action_log.query` / `GET /v1/live-sessions/{session_id}/actions`
   - Returns paginated, sanitized chronological timeline facts scoped strictly by `tenant_id` and `session_id`
   - Verifies zero leakage of raw tokens, credentials, or internal secrets in query results
2. `code/services/audit-service/src/infrastructure/audit-dlq.publisher.ts`:
   - Publishes malformed or retry-exhausted commands to `livepilot.v1.audit.receipt.dlq`
   - Preserves original payload, attempt counts, error code (`LP13005`), and diagnostic metadata
   - Implements operator-authorized replay worker creating a new replay trace
3. `code/services/audit-service/test/e2e/audit-query-dlq.spec.ts`:
   - Tests action log query filtering by session, pagination, and redaction verification
   - Tests routing malformed messages to DLQ after retry exhaustion
   - Tests operator replay authorization and execution
4. Update `package.json` with `"scripts": { ..., "test:e2e": "node --test test/e2e/*.spec.ts" }`
5. Author `docs/03-architecture/specs/goals/G-AUDI-006/design.md` satisfying Invariant 13.
6. Update `docs/07-backlog/goals/G-AUDI-006.md` to `status: done`, steps and criteria `[x]`, phase `SHIP`.
