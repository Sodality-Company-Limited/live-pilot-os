# G-PROMO-028 Threat Model

Threats covered:

- forged or cross-tenant auth/session context;
- replay, duplicate, or conflicting idempotency requests;
- stale schema, resource version, approval, inventory, or execution evidence;
- provider credential/raw payload leakage;
- pause bypass, retry amplification, DLQ replay without authorization;
- partial transaction or outbox publication;
- unknown external outcome treated as success.

Mitigations are server-side scope validation, schema hashes, optimistic locking, inbox/outbox atomicity, bounded retries, authorized replay, fail-closed pause controls, redaction, and reconciliation.

