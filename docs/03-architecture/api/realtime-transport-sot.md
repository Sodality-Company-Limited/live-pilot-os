# Realtime Client Transport SOT

> **Status:** Pilot transport contract frozen for session surfaces.

> **Current state:** SSE is frozen for the Host and Live Ops session streams.

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

## Frozen pilot policy

| Item | Decision |
|---|---|
| Transport | SSE for `GET /v1/live-sessions/{session_id}/events`; no WebSocket in the pilot |
| Replay | 15 minutes or 1,000 events per session, whichever comes first; expired cursor returns `409 REPLAY_WINDOW_EXPIRED` |
| Heartbeat | comment heartbeat every 15 seconds; disconnect after 45 seconds without successful write |
| Subscribers | 2,000 concurrent subscribers per session; tenant-wide admission limit is deployment policy |
| Filtering | server derives tenant/session/role; client may request only allow-listed event types |
| Gateway | 60-second idle timeout with heartbeat exemption; 10-second upstream connect timeout |
| Backpressure | bounded per-client buffer; slow clients receive `stale/disconnected` and must reconnect |
| Sensitive data | no raw viewer IDs, credentials, COGS, model prompts, or provider payloads |
| Ordering | monotonic `sequence` per session stream; clients deduplicate by `event_id` and sequence |
| Mode | every demo event carries `mode=SIMULATED` |

Remaining production decision: validate these limits with load evidence before
launch certification; changing them requires a versioned contract revision.
