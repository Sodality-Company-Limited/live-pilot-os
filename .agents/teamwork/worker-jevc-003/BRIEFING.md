# Worker Briefing: G-JEVC-003

## Task Objective
Implement production-grade PostgreSQL persistence boundary and migrations for `jev-copilot-service` according to Step 5 (ออกแบบ Persistence) and Step 9 (Adapter/Repository/Transaction Boundary):
1. Create SQL migration scripts in `code/services/jev-copilot-service/migrations/`:
   - `001_create_jev_suggestions.sql`: `jev_suggestions` (id, tenant_id, live_session_id, suggestion_type, status, confidence_bp, evidence_refs, expires_at, created_at, updated_at, version), `jev_provider_receipts` (id, suggestion_id, provider, model, prompt_revision, tokens_in, tokens_out, cost_minor, cost_currency, cost_scale, latency_ms, status), `jev_outbox` (id, event_type, topic, payload, occurred_at, published_at, retry_count), `jev_idempotency` (key, response_hash, created_at).
   - RLS policies, unique constraints, and indexes.
2. Implement TypeScript/JavaScript repository & outbox manager in `code/services/jev-copilot-service/src/persistence/`:
   - `SuggestionRepository`: atomic write with transactional outbox, optimistic concurrency check.
   - `IdempotencyStore`: atomic insert with conflict detection.
   - `OutboxPublisher`: polls or dispatches pending events atomically.
3. Add unit test under `code/services/jev-copilot-service/test/persistence.test.mjs`.
4. Populate `docs/03-architecture/specs/goals/G-JEVC-003/` specs.

## Acceptance Criteria
- [ ] 100% Zero Mocks, Zero Stubs.
- [ ] Atomic transactional outbox pattern implemented.
- [ ] All 4 SOT Traceability checks pass green.
