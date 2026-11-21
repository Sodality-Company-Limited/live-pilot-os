# session-service lifecycle contract

## Contract identity

| Field | Value |
|---|---|
| Contract ID | `session.lifecycle.livepilot.v1` |
| Status | `FROZEN` |
| Subject | `livepilot.v1.session.lifecycle.request` |
| Message kind | `command` |
| Schema version | `1.0.0` |
| Owner | `session-service` |
| Producer | `core-bff` |
| Consumers | `session-service`, `audit-service` |
| Ordering key | `session_id` |
| Source of truth | PostgreSQL session state and transactional outbox |

## Responsibility and boundary

The session-service owns live-session lifecycle state and is the authoritative
writer for the session aggregate. It accepts private, authenticated NATS
request/reply commands and publishes lifecycle facts only after the state change
and outbox record commit. It does not expose a public route, read another
service's database, or perform commerce mutations.

Canonical states are `created`, `active`, `paused`, and `ended`. Accepted
transitions are `created → active`, `active → paused|ended`, and
`paused → active|ended`; `ended` is terminal. Every accepted transition
increments `expected_version` exactly once. Invalid, stale, unauthorized,
duplicate, or paused requests never report success.

## Request contract

The payload is defined by
[`session-lifecycle.schema.json`](../schemas/nats/session-lifecycle.schema.json).
Required transport headers are `Nats-Msg-Id`, `X-Correlation-Id`, `X-Idempotency-Key`,
`X-Tenant-Id`, `X-Session-Id`, `X-Schema-Version`, `X-Producer`, `X-Traceparent`,
and `X-Mode`. Header and payload session/tenant scope is server-validated.

| Operation | Required current state | Resulting state |
|---|---|---|
| `start` | `created` | `active` |
| `pause` | `active` | `paused` |
| `resume` | `paused` | `active` |
| `end` | `created`, `active`, or `paused` | `ended` |

The caller supplies the current `expected_version`; the service rejects stale
versions with a stable conflict response. The same idempotency key and semantic
fingerprint are replay-safe. A timeout or dependency uncertainty is `pending`/
`unknown` or a durable retry/DLQ outcome, never an inferred success.

## Reply and lifecycle fact

Replies are typed as `accepted`, `rejected`, `pending`, or `unknown` and include
the request message ID and correlation ID. Rejections identify a stable error
code and retryability; at minimum the service distinguishes unauthorized,
invalid-transition, version-conflict, duplicate-conflict, validation, and
dependency-unknown outcomes.

After an accepted transition, the service publishes the immutable
`session.lifecycle.changed` fact with the session ID, previous and resulting
states, new resource version, actor/policy lineage, correlation ID, and command
causation ID. Consumers acknowledge only after durable processing and tolerate
at-least-once redelivery. Poison messages use bounded retry and
`livepilot.v1.session.lifecycle.dlq`; replay requires operator authorization.

## Verification

- Validate payload and required headers before business logic.
- Verify transition, authorization, idempotency, version, timeout/unknown,
  duplicate, DLQ, audit-lineage, and producer/consumer compatibility behavior.
- Reproducible contract checks:
  `node scripts/architecture/check-sot.mjs` and
  `node scripts/api/check-api-sot-traceability.mjs`.

