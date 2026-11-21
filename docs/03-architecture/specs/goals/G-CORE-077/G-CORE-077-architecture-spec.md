# G-CORE-077: Architecture Specification

- Outcome: Enforce F04 approval mode and Emergency Pause control.
- Requirement authority: REQ-LP-013, REQ-LP-014.
- Feature boundary: F04 remains session-scoped and contract-first.
- Ownership: Core BFF orchestrates; domain services own their state; adapters isolate providers.
- Safety: authorization, idempotency, timeout/unknown, reconciliation, audit, redaction, and mode labels are mandatory.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs
