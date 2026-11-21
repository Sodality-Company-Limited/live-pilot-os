# Worker Briefing: G-JEVC-005

## Task Objective
Implement the complete first end-to-end vertical slice for `jev-copilot-service` according to Step 10 (Implement หนึ่ง Vertical Slice):
1. In `code/services/jev-copilot-service/src/domain/`:
   - `suggestion-aggregate.mjs`: Suggestion aggregate root modeling state transitions (`proposed → grounded → delivered → used | edited | dismissed | expired | withdrawn`), validation rules, and immutability invariants.
2. In `code/services/jev-copilot-service/src/handlers/`:
   - `suggestion-command-handler.mjs`: Handles `suggestion.create` command:
     - Validates authentication & tenant/session context.
     - Checks idempotency via `IdempotencyStore`.
     - Calls `InferenceAdapter` to generate suggestion from live signal/facts.
     - Persists Suggestion aggregate + ProviderReceipt + Outbox event atomically via `SuggestionRepository`.
     - Dispatches outbox event via NATS JetStream publisher.
3. In `code/services/jev-copilot-service/src/nats/`:
   - `nats-publisher.mjs`: JetStream publisher publishing to `livepilot.v1.copilot.suggestion.proposed` with ordering key `tenant_id:live_session_id`.
   - `nats-consumer.mjs`: Ingestion handler consuming live stream cues/signals.
4. In `code/services/jev-copilot-service/test/vertical-slice.test.mjs`:
   - End-to-end integration test executing the complete pipeline: incoming cue → auth/idempotency → inference adapter → atomic persistence + outbox → published NATS event → read suggestion status.
5. Populate specs in `docs/03-architecture/specs/goals/G-JEVC-005/`.

## Acceptance Criteria
- [ ] 100% Zero Mocks, Zero Stubs.
- [ ] End-to-end vertical slice passes green.
- [ ] Atomic persistence & outbox event emission verified.
- [ ] All 4 SOT checks pass green.
