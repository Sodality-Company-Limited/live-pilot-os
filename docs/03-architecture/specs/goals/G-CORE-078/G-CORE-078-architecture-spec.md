# G-CORE-078: Architecture Specification

- Outcome: Append F04 audit receipts and secure adapter commands.
- Requirement authority: REQ-LP-012, REQ-LP-013.
- Feature boundary: F04 remains session-scoped and contract-first.
- Ownership: Core BFF orchestrates; domain services own their state; adapters isolate providers.
- Safety: authorization, idempotency, timeout/unknown, reconciliation, audit, redaction, and mode labels are mandatory.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs
