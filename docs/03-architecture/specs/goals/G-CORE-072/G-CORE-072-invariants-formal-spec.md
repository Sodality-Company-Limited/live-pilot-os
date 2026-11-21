# G-CORE-072: Invariants and Formal Specification

- Every result carries session, correlation, causation, schema version, and producer lineage.
- Duplicate or replayed input is idempotent; conflicting fingerprints are rejected.
- Stale, unavailable, low-confidence, pending, or unknown state never becomes verified success.
- No raw PII, credentials, or unverified provider output crosses a public boundary.
- Proof class: executable contract, security, property, and replay tests.
