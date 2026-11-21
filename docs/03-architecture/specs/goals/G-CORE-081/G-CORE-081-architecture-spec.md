# G-CORE-081: Architecture Specification

- Outcome: Enforce F05 test-mode and credential isolation.
- Requirement authority: REQ-LP-017.
- Feature boundary: F05 remains session-scoped and contract-first.
- Ownership: Core BFF orchestrates; domain services own their state; adapters isolate providers.
- Safety: authorization, idempotency, timeout/unknown, reconciliation, audit, redaction, and mode labels are mandatory.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs
