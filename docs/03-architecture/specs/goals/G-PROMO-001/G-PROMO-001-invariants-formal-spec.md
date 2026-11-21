# G-PROMO-001: Invariants and Formal Specification

- INV-001 Ownership: only promotion-service writes Promotion aggregate state.
- INV-002 Version monotonicity: every accepted mutation uses expected resource_version and increments exactly once.
- INV-003 Idempotency: same key and fingerprint produce one durable outcome; mismatch is a conflict.
- INV-004 Safety: pending/unknown, stale policy, active pause, missing approval, or unobserved adapter state cannot become issued.
- INV-005 Traceability: every consequential transition carries session, actor/capability, correlation, causation, policy, and audit lineage.
- Proof class: executable invariant/property tests and contract fixtures; no unsupported formal theorem claim.
- Evidence: goal-scoped tests, schema hashes, migration receipt, and release evidence.

