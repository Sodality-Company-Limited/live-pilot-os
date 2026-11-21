# LivePilot OS — UI/API Binding SOT

> **Status:** Required bridge between UI specifications and API contracts.

Each user action maps explicitly:

```text
screen → component → action → API operation/NATS/realtime event
  → request/authorization → response/error → UI state → audit/telemetry
```

Binding records must identify operation ID, route, method, DTO/schema version,
required capability, idempotency policy, optimistic/concurrency behavior, success
state, pending/unknown behavior, error-code mappings, localization keys, and test IDs.

UI must never infer business truth from labels, colors, optimistic state, or localized
display values. Server response, version, policy verdict, and observed state are authoritative.
