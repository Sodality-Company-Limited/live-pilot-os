# G-PROMO-022 Invariants and Formal Specification

- Promotion remains the sole authoritative writer for its aggregate.
- State/resource versions are monotonic and optimistic-lock conflicts fail closed.
- Repeated commands with the same idempotency key and fingerprint return the recorded outcome; conflicting fingerprints are rejected.
- Missing, stale, denied, timeout, or unknown external evidence cannot authorize issuance.
- Every consequential mutation preserves tenant/session, correlation, causation, schema revision, and audit lineage.
- Secrets and raw provider payloads never enter public responses, events, logs, fixtures, or audit receipts.

Verification must include positive, negative, duplicate, replay, concurrency, and redaction evidence for **execution safety integration**.

