# Realtime Client Transport SOT

> **Status:** Production-readiness target; transport choice must be approved per surface.

SSE is the default for server-to-client live session updates. WebSocket is permitted
only where bidirectional low-latency interaction is required and must use the same
authorization, envelope, and replay semantics.

## Envelope

```json
{
  "event_id": "evt_123",
  "event_type": "live_session.suggestion.created",
  "schema_version": "1.0.0",
  "session_id": "session_123",
  "correlation_id": "corr_123",
  "sequence": 42,
  "occurred_at": "2026-11-20T10:00:00Z",
  "mode": "SIMULATED",
  "data": {}
}
```

Requirements: authenticated subscription, tenant/session scope, monotonic sequence
per stream, heartbeat, reconnect with `Last-Event-ID`, bounded replay, duplicate-safe
clients, explicit stale/disconnected state, backpressure, and no sensitive payloads
without authorization. UI must announce consequential status changes accessibly.

Open decisions: SSE/WebSocket per screen, replay retention, maximum subscribers,
heartbeat interval, event filtering, and gateway timeout policy.
