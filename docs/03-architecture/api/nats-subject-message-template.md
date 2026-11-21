# NATS Subject and Message Contract Template

> **Status:** Template; copy this file for every approved NATS subject/message contract.
> **Authority:** [technical-specifications-sot.md](../technical-specifications-sot.md) §4.2 and §6.
> **Registry:** [contracts/flows/coverage.yaml](../contracts/flows/coverage.yaml)

This template is the minimum contract for service-to-service commands, queries,
events, and durable jobs. A subject is not implementation detail: it is a versioned
boundary with an owner, compatibility policy, delivery guarantee, and executable test.

## 1. Contract identity

| Field | Value |
|---|---|
| Contract ID | `CONTRACT-ID` |
| Status | `PROPOSED` / `FROZEN` / `DEPRECATED` |
| Subject | `livepilot.v1.<domain>.<resource>.<verb>` |
| Message kind | `command` / `query` / `reply` / `event` / `job` / `control` |
| Schema version | `1.0.0` |
| Schema hash | `SHA256` |
| Owner | `team/service` |
| Producer | `service/component` |
| Consumers | `service/component[]` |
| Ordering key | `session_id` / `aggregate_id` / `none` |
| Source of truth | `aggregate or projection` |
| Registry entry | `coverage.yaml` contract ID |

## 2. Subject convention

```text
livepilot.v{major}.{domain}.{resource}.{verb}
livepilot.v{major}.{domain}.{resource}.{verb}.reply
livepilot.v{major}.{domain}.{resource}.event.{event_name}
livepilot.v{major}.{domain}.{resource}.dlq
```

Rules:

- Use lowercase dot-separated tokens; never put tenant IDs, user IDs, or payload
  values in subjects.
- Major subject versions are incompatible boundaries. Additive payload fields are
  allowed only when consumers tolerate unknown fields.
- Commands/queries use request/reply. Facts use JetStream events. A command is
  never emitted as an event; publish a separate fact after the transaction commits.
- DLQ subjects preserve the original subject in metadata and require an explicit
  replay owner and authorization.

## 3. Required transport headers

| Header | Required | Meaning |
|---|---:|---|
| `Nats-Msg-Id` | yes | Stable message ID for broker deduplication |
| `X-Correlation-Id` | yes | End-to-end trace/correlation ID |
| `X-Causation-Id` | yes for derived messages | Direct parent command/event ID |
| `X-Idempotency-Key` | commands/jobs | Same key + fingerprint is replay-safe |
| `X-Tenant-Id` | yes | Server-derived tenant scope; never trusted from UI |
| `X-Session-Id` | session-bound work | Live session scope |
| `X-Schema-Version` | yes | Payload schema version |
| `X-Producer` | yes | Producing service identity |
| `X-Traceparent` | yes | W3C trace context |
| `X-Mode` | simulated paths | `SIMULATED`, `SANDBOX`, or `CONFIRMED` |

Consumers must validate headers before business logic and redact them from unsafe
logs. Missing authorization, scope, correlation, or schema headers fail closed.

## 4. Envelope schema

Use this envelope for every message. `data` is the contract-specific payload.

```json
{
  "message_id": "msg_01J...",
  "message_kind": "command",
  "subject": "livepilot.v1.inventory.reservation.request",
  "schema_version": "1.0.0",
  "occurred_at": "2026-11-20T10:00:00Z",
  "producer": "inventory-service",
  "tenant_id": "tenant_123",
  "session_id": "session_123",
  "aggregate_type": "inventory_reservation",
  "aggregate_id": "reservation_123",
  "correlation_id": "corr_123",
  "causation_id": "cmd_123",
  "idempotency_key": "reserve:session_123:sku_123:1",
  "priority": "normal",
  "deadline_at": "2026-11-20T10:00:05Z",
  "mode": "SIMULATED",
  "data": {}
}
```

## 5. Request/reply contract

### Request payload

```json
{
  "operation": "reserve",
  "resource_version": 42,
  "data": {}
}
```

### Success reply

```json
{
  "message_id": "reply_01J...",
  "in_reply_to": "msg_01J...",
  "status": "accepted",
  "schema_version": "1.0.0",
  "correlation_id": "corr_123",
  "data": {}
}
```

### Error reply

```json
{
  "message_id": "reply_01J...",
  "in_reply_to": "msg_01J...",
  "status": "rejected",
  "error": {
    "code": "INVENTORY_VERSION_CONFLICT",
    "message": "Stable safe summary",
    "retryable": false,
    "details": {}
  },
  "correlation_id": "corr_123"
}
```

Every reply must be deterministic for the same message ID and idempotency
fingerprint. A timeout is not a rejection; the caller must reconcile before retrying.

## 6. Event contract

Events are immutable facts published after the owning transaction commits.

```json
{
  "message_id": "evt_01J...",
  "message_kind": "event",
  "event_type": "inventory.reservation.accepted",
  "event_version": "1.0.0",
  "occurred_at": "2026-11-20T10:00:01Z",
  "producer": "inventory-service",
  "aggregate_type": "inventory_reservation",
  "aggregate_id": "reservation_123",
  "correlation_id": "corr_123",
  "causation_id": "msg_01J...",
  "data": {}
}
```

Consumers acknowledge only after durable state transition or side effect. They must
deduplicate, tolerate additive fields, reject incompatible versions, and expose
replay and DLQ behavior.

## 7. Durable job contract

Jobs add scheduling fields and must support lease fencing, cooperative cancellation,
preemption checkpoints, and explicit unknown results.

```json
{
  "message_kind": "job",
  "job_id": "job_01J...",
  "job_type": "platform.reconcile",
  "priority": "urgent",
  "not_before": "2026-11-20T10:00:00Z",
  "deadline_at": "2026-11-20T10:00:30Z",
  "attempt": 1,
  "lease_owner": "worker-7",
  "lease_expires_at": "2026-11-20T10:00:05Z",
  "checkpoint": null,
  "data": {}
}
```

## 8. Delivery and failure policy

| Policy | Required value |
|---|---|
| Delivery | At-least-once; exactly-once is not assumed |
| Consumer | Durable pull consumer with bounded concurrency |
| Ack | After durable state/effect; use explicit negative ack for retry |
| Retry | Classified exponential backoff with jitter and max attempts |
| Lease | Renewable and fenced; stale workers cannot commit |
| DLQ | Preserve original message, reason, attempts, and replay owner |
| Replay | New replay ID, original causation, operator authorization |
| Backpressure | Admission limits, queue age/lag alarms, load shedding |
| Shutdown | Stop intake, finish safe points, renew/expire leases, flush audit |

## 9. Compatibility and verification

- Register this contract in `coverage.yaml` with owner, hash, producers, consumers,
  and a reproducible verification command.
- Validate JSON Schema or equivalent payload types, headers, subject, and examples.
- Run producer/consumer compatibility tests for old and new schema versions.
- Test duplicate delivery, out-of-order events, timeout, stale lease, cancellation,
  preemption, pause, poison message, broker outage, DLQ replay, and recovery.
- Attach a proof receipt containing schema hash, test command, exit code, and revision.

## 10. Open decisions

- Replace placeholders with the approved domain, resource, verb, and owner.
- Decide the schema registry and compatibility checker.
- Define retention, max delivery attempts, DLQ retention, and replay authorization.
- Define per-subject latency, queue-age, and delivery SLOs.
