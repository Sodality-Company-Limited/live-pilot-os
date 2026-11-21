# Worker Dispatch: G-JEVC-003 Create JEV/Copilot PostgreSQL persistence boundary

- **Goal ID:** `G-JEVC-003`
- **Role:** `implementer`
- **Persona:** `PostgreSQL & Transactional Outbox Persistence Engineer`
- **Touch Map:**
  - `code/services/jev-copilot-service/migrations`
  - `code/services/jev-copilot-service/src/persistence`
  - `code/services/jev-copilot-service/test`
  - `docs/03-architecture/specs/goals/G-JEVC-003/`
- **Verification Command:**
  `node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node scripts/testing/check-tdd-traceability.mjs`
