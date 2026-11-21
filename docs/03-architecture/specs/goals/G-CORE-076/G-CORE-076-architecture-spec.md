# G-CORE-076: Architecture Specification

- Outcome: Reconcile F04 action-log and evidence API contract.
- Requirement authority: REQ-LP-012, REQ-LP-013.
- Feature boundary: F04 remains session-scoped and contract-first.
- Ownership: Core BFF orchestrates; domain services own their state; adapters isolate providers.
- Safety: authorization, idempotency, timeout/unknown, reconciliation, audit, redaction, and mode labels are mandatory.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs
