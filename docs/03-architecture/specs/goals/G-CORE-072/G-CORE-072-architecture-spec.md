# G-CORE-072: Architecture Specification

- Outcome: Enforce F02 guidance freshness, redaction, and withdrawal.
- Requirement authority: REQ-LP-003, REQ-LP-004, REQ-LP-016.
- Feature boundary: F02 remains session-scoped and contract-first.
- Ownership: Core BFF orchestrates; domain services own their state; adapters isolate providers.
- Safety: authorization, idempotency, timeout/unknown, reconciliation, audit, redaction, and mode labels are mandatory.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs
