# G-CORE-058: Invariants and Formal Specification

- INV-001: every result carries tenant/workspace/session, correlation, causation, schema version, and producer lineage.
- INV-002: duplicate or replayed input is idempotent; conflicting fingerprints are rejected.
- INV-003: stale, unavailable, low-confidence, pending, or unknown state never becomes verified success.
- INV-004: no raw PII, credentials, or unverified provider output crosses a public boundary.
- Proof class: executable contract, property, security, and replay tests; no unsupported theorem claim.
