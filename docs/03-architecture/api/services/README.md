# Microservice Contract Set

Microservices do not share a public OpenAPI. Each service owns its state and
publishes/consumes versioned NATS contracts. Synchronous internal HTTP/gRPC is
allowed only where the operation requires a direct read or health boundary; it is
never exposed through the public gateway.

Every service contract requires: owner, authoritative tables/aggregate, commands,
events, schema path and hash, authorization context, idempotency, timeout/retry,
DLQ/replay owner, audit behavior, and compatibility tests.

## Service ownership matrix

| Service | Authoritative state | Commands | Events | Public exposure |
|---|---|---|---|---|
| `identity-session-service` | principals, sessions, revocations | auth context, revoke session | auth succeeded/failed/revoked | none |
| `session-service` | live-session lifecycle | lifecycle request | lifecycle changed | through Core BFF |
| `telemetry-service` | normalized signals and projections | signal ingest | signal accepted/duplicate/late | none |
| `intent-risk-service` | intent/risk facts | classify/moderate | intent/risk detected/deferred | none |
| `catalog-service` | approved products/SKUs | resolve entity | entity resolved/rejected | none |
| `jev-copilot-service` | suggestions and provider receipts | create/withdraw suggestion | suggestion created/withdrawn | none |
| `promotion-service` | promotion lifecycle | proposal/status | promotion proposed/updated | through Core BFF |
| `margin-policy-service` | policy verdict receipts | evaluate margin | verdict recorded | none |
| `inventory-service` | reservations and stock projection | reserve/release/commit | reservation updated | none |
| `approval-control-service` | approvals, pause, mode | record decision/pause/resume | decision/pause changed | through Core BFF only |
| `execution-adapter-safety-service` | action receipts and reconciliation | dispatch/reconcile | action updated | none; simulated adapter |
| `audit-service` | append-only evidence | append/export/rebuild | audit receipt appended | read through Core BFF |

## Contract and failure invariant

The owner commits aggregate state and outbox atomically. Events publish only after
commit. Consumers are at-least-once and duplicate-safe. A timeout produces
`pending` or `unknown`, never success. Non-retryable failures go to a DLQ with
original message, attempts, reason, and replay owner. Replay creates a new replay
ID and requires operator capability.

## Required per-service artifacts

Each service must add a contract file named `{service}.md` in this directory plus
schema files under `../schemas/nats/`. The subject catalog is the cross-service
index; this README is the ownership boundary, not a replacement for payload schemas.

## Verification

- Producer/consumer schema compatibility and additive-field tests.
- Auth-context, tenant isolation, idempotency, transaction/outbox, duplicate,
  timeout, DLQ, replay, pause, and recovery tests.
- Service contract hash and test receipt recorded in the coverage registry.
