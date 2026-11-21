# LivePilot OS — Realtime UI Behavior SOT

> **Status:** Canonical client rendering contract for SSE/WebSocket updates.
> **Transport:** [realtime-transport-sot.md](../api/realtime-transport-sot.md)

Realtime events require session/tenant authorization, event ID, schema version,
sequence, correlation, occurred time, and mode. Clients deduplicate by event ID,
ignore stale sequence/version updates, reconnect with `Last-Event-ID`, and show a
visible stale/disconnected state when replay is unavailable.

Each event maps to a component/state transition, announcement policy, telemetry event,
and test case. Backpressure must degrade to summarized updates without hiding critical
pause, rejection, failure, unknown, or approval state.
