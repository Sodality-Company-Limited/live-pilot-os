# Worker Briefing: G-TELM-005

## Objective
Implement the complete vertical slice for Telemetry signal ingestion:
- Inbound handler accepting NATS JetStream `livepilot.v1.telemetry.signal.ingest` messages
- Signal schema validator integration (from G-TELM-002)
- State machine lifecycle transition (from G-TELM-004)
- Idempotent persistence with deduplication check on `(tenant_id, session_id, signal_id)`
- Transactional outbox write for `livepilot.v1.telemetry.signal.detected`
- Ack-after-commit invariant: ONLY acknowledge JetStream message after database commit succeeds.
