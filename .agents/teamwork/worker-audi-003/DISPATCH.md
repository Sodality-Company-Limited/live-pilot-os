# Worker Dispatch: G-AUDI-003 Implementation

- **Goal ID:** `G-AUDI-003`
- **Role:** Implementer
- **Persona:** `Systems & Database Architect`
- **Touch Map:**
  - `code/services/audit-service/migrations/`
  - `code/services/audit-service/scripts/`
  - `code/services/audit-service/test/`
  - `code/services/audit-service/package.json`
  - `docs/03-architecture/specs/goals/G-AUDI-003/`
  - `docs/07-backlog/goals/G-AUDI-003.md`
- **Verification Command:**
  `node code/services/audit-service/scripts/verify-migrations.mjs && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-AUDI-003.md`
