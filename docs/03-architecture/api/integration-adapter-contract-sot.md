# Integration Adapter Contract SOT

> **Status:** Production integration target; Hackathon adapters remain visibly simulated.

Every adapter implements the canonical port without leaking provider semantics into
domain services.

| Contract | Required definition |
|---|---|
| Capability | Supported operation, version, region, limits |
| Auth | Credential owner, scopes, rotation, signature verification |
| Request/response | Canonical mapping and provider schema version |
| Rate limits | Quota, token bucket, retry-after, load shedding |
| Idempotency | Provider key, fingerprint, retention, replay behavior |
| Timeout | Connect, request, overall deadline |
| Failure | Retry classes, unknown-result conditions, DLQ |
| Webhook | Signature, replay protection, ordering, reconciliation |
| State | Requested, accepted, observed, reconciled mapping |
| Evidence | Audit receipt, provider response hash, redaction policy |

No simulated response may be marked confirmed. A provider integration remains blocked
until official documentation, authorization, certification, sandbox evidence, and
reconciliation tests are attached.
