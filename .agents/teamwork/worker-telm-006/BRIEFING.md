# Worker Briefing: G-TELM-006

## Objective
Implement recovery, exponential backoff retry worker, DLQ routing, and reconciliation for telemetry signals:
- Exponential backoff retry handler (attempts 1 to 5 with jitter)
- When attempt > 5: transition signal to `dead_lettered` via `transitionSignal(..., DEAD_LETTER)` and publish to `livepilot.v1.telemetry.signal.dlq` with DLQ metadata envelope
- Periodic reconciliation scanner detecting stale uncommitted signals (e.g. pending > timeout)
- Real fault-injection unit tests verifying transient retries, terminal DLQ routing, and zero data loss.
