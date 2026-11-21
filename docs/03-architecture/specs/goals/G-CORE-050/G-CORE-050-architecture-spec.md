# G-CORE-050: Architecture Specification

- Outcome: Reconcile the approved F01 Core BFF HTTP contract.
- Requirement authority: REQ-LP-001 through REQ-LP-006 and F01 flow evidence.
- Boundary: F01 remains session-scoped; Core BFF orchestrates and services own domain state.
- Ports: approved HTTP/NATS contracts only; no cross-service database access.
- Safety: authorization, idempotency, timeout/unknown, audit lineage, and explicit mode/freshness are mandatory.
- Source evidence: the goal touch map and linked F01 SOT authorities.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs
