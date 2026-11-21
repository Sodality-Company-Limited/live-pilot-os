# Worker Dispatch: G-JEVC-008 Certify JEV/Copilot service-level contracts

- **Goal ID:** `G-JEVC-008`
- **Role:** `implementer`
- **Persona:** `Lead QA & Contract Certification Architect`
- **Touch Map:**
  - `code/services/jev-copilot-service/test/service-contracts.test.mjs`
  - `docs/07-backlog/evidence/`
  - `docs/03-architecture/contracts/flows/coverage.yaml`
  - `docs/03-architecture/specs/goals/G-JEVC-008/`
- **Verification Command:**
  `node code/services/jev-copilot-service/test/service-contracts.test.mjs && node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node scripts/testing/check-tdd-traceability.mjs`
