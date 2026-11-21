# G-JEVC-005 Architecture Specification

## Selected boundary
Implements the first complete end-to-end vertical slice for `jev-copilot-service`. This slice connects:
1. Inbound driving ports: Real-time signal cue ingestion over NATS topic `livepilot.v1.signal.cue`.
2. Application Command Handler (`SuggestionCommandHandler`):
   - Tenant & session context scoping.
   - Distributed command deduplication via `IdempotencyStore`.
   - LLM model invocation via provider-neutral `InferenceAdapter`.
   - Aggregate construction with calibrated confidence gating and evidence grounding validation.
   - Atomic database persistence (`SuggestionRepository`) saving `jev_suggestions`, `jev_provider_receipts`, and `jev_outbox` in a single PostgreSQL transaction.
3. Driven ports:
   - Outbox event publication via `NatsPublisher` onto JetStream topic `livepilot.v1.copilot.suggestion.proposed` with partitioning/ordering key `tenant_id:live_session_id`.
   - Withdrawal command handling and state transitions to `withdrawn`.

## Architecture & Data Flow
```text
  Incoming NATS Cue (livepilot.v1.signal.cue)
                 │
                 ▼
          NatsConsumer
                 │
                 ▼
     SuggestionCommandHandler
          ├── 1. Acquire Idempotency Lock (IdempotencyStore)
          ├── 2. Invoke InferenceAdapter (LLM Provider: Gemini/Claude/OpenAI)
          ├── 3. Validate Evidence & Confidence (min 7000 bps)
          ├── 4. Construct SuggestionAggregate
          ├── 5. Atomic Persist (Suggestion + ProviderReceipt + Outbox)
          └── 6. Publish Event via NatsPublisher (livepilot.v1.copilot.suggestion.proposed)
```

## Rejected alternatives
- Skipping transactional outbox and publishing directly from handler: Rejected because broker unreachability would cause database/broker state inconsistency.
- Dual-write without transaction: Rejected; aggregate and outbox event must commit atomically.
- Direct ad-hoc NATS pub/sub without ordering keys: Rejected; event delivery must guarantee per-session in-order processing (`tenant_id:live_session_id`).

## Verification
- Vertical slice integration test: `node code/services/jev-copilot-service/test/vertical-slice.test.mjs`
- Persistence unit tests: `node code/services/jev-copilot-service/test/persistence.test.mjs`
- Provider unit tests: `node code/services/jev-copilot-service/test/provider.test.mjs`
- Four SOT checks: error-code registry, api-sot-traceability, architecture sot, tdd-traceability.
