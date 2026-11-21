# Worker Briefing: G-JEVC-008

## Task Objective
Certify all service-level contracts for `jev-copilot-service` according to Step 13 (ทำ Service-Level Tests) & Step 14 (ทำ API/Architecture Gates):
1. In `code/services/jev-copilot-service/test/service-contracts.test.mjs`:
   - Run holistic test suite unifying all service layers:
     - FSM State Machine transitions.
     - PostgreSQL Persistence & Optimistic Locking.
     - Distributed Idempotency and payload conflict verification.
     - Outbox atomicity and JetStream message delivery.
     - Inference adapter fail-closed degraded status mapping and Money Value Object accounting.
     - PII & Secret Redaction (zero secrets leaked).
     - Adversarial prompt injection defenses.
     - Emergency Pause circuit breaker.
     - Cryptographic Merkle audit receipts.
2. In `docs/07-backlog/evidence/`:
   - Generate `G-JEVC-008-certification-evidence.json` capturing test results, code coverage, SHA-256 digests of all touched files, and verification receipts.
3. Update `docs/03-architecture/contracts/flows/coverage.yaml` adding the `jev-copilot-service` flow coverage.
4. Populate `docs/03-architecture/specs/goals/G-JEVC-008/` specs.

## Acceptance Criteria
- [ ] 100% test pass with Zero Mocks.
- [ ] Cryptographic certification evidence recorded.
- [ ] All 4 SOT checks pass green.
