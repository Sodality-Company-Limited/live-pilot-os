# G-JEVC-003 — Finite State Machine (FSM) Runtime Specification

Goal ID: `G-JEVC-003`  
Scope: Persistence Transitions, Outbox Dispatch Lifecycle, and Idempotency FSM  
Status: `APPROVED`

---

## 1. Outbox Record State Machine

```text
 ┌─────────────┐
 │   PENDING   │ ──(Successfully published to NATS JetStream)──► [ PUBLISHED ] (Terminal)
 └──────┬──────┘
        │
   (NATS Publish Failed & retry_count < 5)
        │
        ▼
 ┌─────────────┐
 │   PENDING   │ ──(retry_count >= 5)───────────────────────────► [ FAILED ] (DLQ Routed)
 └─────────────┘
```

### 1.1. Outbox Status Definitions
- `pending`: Written in atomic transaction with suggestion aggregate; awaiting JetStream publication.
- `published`: Published to NATS and acknowledged by broker; stamped with `published_at`.
- `failed`: Retries exhausted ($N \ge 5$); routed to dead-letter queue (`livepilot.v1.copilot.suggestion.dlq`).

---

## 2. Idempotency Key State Machine

```text
 ┌─────────────┐
 │   PENDING   │ ──(Operation completed successfully)───────────► [ COMPLETED ] (Terminal)
 └──────┬──────┘
        │
   (Operation encountered fatal error)
        │
        ▼
 [ FAILED / EXPIRED ]
```

### 2.1. Idempotency Guard Conditions
- `acquire()`: If key not present $\rightarrow$ inserts `pending` state and returns `acquired: true`.
- Duplicate with matching fingerprint $\rightarrow$ returns `acquired: false` and existing record.
- Duplicate with conflicting fingerprint $\rightarrow$ throws `IDEMPOTENCY_PAYLOAD_MISMATCH` (LP04003).
