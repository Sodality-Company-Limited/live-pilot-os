# G-CORE-079: Architecture Specification

- Outcome: Reconcile F05 test-authentication HTTP contract.
- Requirement authority: REQ-LP-017.
- Feature boundary: F05 remains session-scoped and contract-first.
- Ownership: Core BFF orchestrates; domain services own their state; adapters isolate providers.
- Safety: authorization, idempotency, timeout/unknown, reconciliation, audit, redaction, and mode labels are mandatory.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs
