# G-JEVC-005 Threat Model & Security Specification

## Threat Analysis (STRIDE)

| Threat | Category | Mitigation |
|---|---|---|
| **Replay Attack / Duplicate Cue Ingestion** | Repudiation / Denial of Service | `IdempotencyStore` records unique `(tenant_id, idempotency_key)` with SHA-256 semantic fingerprint and 24-hour TTL. Duplicate requests return cached responses without re-executing inference. |
| **Fingerprint Collision / Tampering** | Tampering | Payload mismatches on identical keys throw `IDEMPOTENCY_PAYLOAD_MISMATCH` (LP04003) fail-closed. |
| **Cross-Tenant Data Leakage** | Information Disclosure | All database queries execute inside PostgreSQL Row-Level Security (RLS) tenant transactions enforcing `SET LOCAL app.tenant_id = $tenantId`. Primary keys are compound `(tenant_id, suggestion_id)`. |
| **Unbounded Token Expenditure** | Denial of Service | `InferenceAdapter` enforces microsecond timeout ceilings, strict token bounds, and fail-closed abortion. Token costs are recorded in `jev_provider_receipts`. |
| **Ungrounded Prompt Injection** | Elevation of Privilege | AI model output must strictly parse as valid JSON conforming to `jev-suggestion-proposed.schema.json`. Evidence references must be verified SHA-256 digests. |
| **Outbox Desynchronization** | Tampering / Consistency | Outbox events are written in the exact same database transaction as the suggestion aggregate. Event publication failures are retried safely via outbox worker polling. |
