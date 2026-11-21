# Worker Dispatch: G-AUDI-006 Implementation

- **Goal ID:** `G-AUDI-006`
- **Role:** Implementer
- **Persona:** `Systems & Reliability Engineer`
- **Touch Map:**
  - `code/services/audit-service/src/application/`
  - `code/services/audit-service/src/infrastructure/`
  - `code/services/audit-service/test/e2e/`
  - `code/services/audit-service/package.json`
  - `docs/03-architecture/specs/goals/G-AUDI-006/`
  - `docs/07-backlog/goals/G-AUDI-006.md`
- **Verification Command:**
  `npm --prefix code/services/audit-service test:e2e && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-AUDI-006.md`
