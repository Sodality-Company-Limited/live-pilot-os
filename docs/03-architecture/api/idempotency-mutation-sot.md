# Idempotency and Mutation Semantics SOT

> **Status:** Required for every consequential API, NATS command, and durable job.

The idempotency record is keyed by tenant, actor, operation, and `Idempotency-Key`.
It stores a request fingerprint, first result, state, expiry, and correlation lineage.

| Input | Result |
|---|---|
| Same key + same fingerprint | Replay original result without duplicate effect |
| Same key + different fingerprint | `409 CONFLICT_IDEMPOTENCY_KEY` |
| New key | Execute once under transaction/lease guard |
| Previous result unknown | Reconcile before retrying consequential work |
| Expired key | Reject or create new operation according to retention policy |

Mutation responses distinguish `accepted`, `pending`, `succeeded`, `rejected`,
`failed`, and `unknown`. `202` never means successful external execution.

Required tests cover duplicate concurrent requests, crash after commit, timeout before
reply, replay after reconnect, stale resource version, and cross-tenant key reuse.
