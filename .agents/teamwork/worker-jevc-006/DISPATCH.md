# Worker Dispatch: G-JEVC-006 Implement suggestion delivery and withdrawal lifecycle

- **Goal ID:** `G-JEVC-006`
- **Role:** `implementer`
- **Persona:** `Event-Driven FSM & Lifecycle Systems Engineer`
- **Touch Map:**
  - `code/services/jev-copilot-service/src/domain/`
  - `code/services/jev-copilot-service/src/handlers/`
  - `code/services/jev-copilot-service/test/lifecycle.test.mjs`
  - `docs/03-architecture/specs/goals/G-JEVC-006/`
- **Verification Command:**
  `node code/services/jev-copilot-service/test/lifecycle.test.mjs && node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node scripts/testing/check-tdd-traceability.mjs`
