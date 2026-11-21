# G-CORE-061: Architecture Specification

- Outcome: Integrate the JEV/OpenAI adapter for F01 analysis.
- Requirement authority: REQ-LP-001, REQ-LP-003, REQ-LP-004, REQ-LP-016 and linked F01 flow evidence.
- Boundary: F01 remains session-scoped; Core BFF orchestrates and services own domain state.
- Ports: approved HTTP/NATS contracts only; no cross-service database access.
- Safety: authorization, idempotency, timeout/unknown, audit lineage, and explicit mode/freshness are mandatory.
- Source evidence: the goal touch map and linked F01 SOT authorities.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs
