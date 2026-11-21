# Worker Briefing: G-TELM-003

## Objective
Author and verify idempotent up and down PostgreSQL migrations for `telemetry-service` establishing:
- `telemetry_signals` (partitioned/indexed by tenant_id, session_id, signal_id, state, occurred_at)
- `telemetry_lineage` (signal_id, provider_event_id, correlation_id, causation_id)
- `telemetry_inbox` (deduplication & idempotent consumer records)
- `telemetry_outbox` (transactional outbox for event publishing)
- Row-Level Security (RLS) tenant isolation policies
- Repeatable verification runner verifying up/down/up idempotency without mock fallbacks.
