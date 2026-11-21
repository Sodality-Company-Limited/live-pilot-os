# G-CORE-073: Architecture Specification

- Outcome: Reconcile F03 Core BFF promotion contract integration.
- Requirement authority: REQ-LP-008, REQ-LP-009, REQ-LP-013.
- Feature boundary: F03 remains session-scoped and contract-first.
- Ownership: Core BFF orchestrates; domain services own their state; adapters isolate providers.
- Safety: authorization, idempotency, timeout/unknown, reconciliation, audit, redaction, and mode labels are mandatory.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs
