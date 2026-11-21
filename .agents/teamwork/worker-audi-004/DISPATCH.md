# Worker Dispatch: G-AUDI-004 Implementation

- **Goal ID:** `G-AUDI-004`
- **Role:** Implementer
- **Persona:** `Systems & Domain Engineer`
- **Touch Map:**
  - `code/services/audit-service/src/domain/`
  - `code/services/audit-service/test/unit/`
  - `code/services/audit-service/package.json`
  - `docs/03-architecture/specs/goals/G-AUDI-004/`
  - `docs/07-backlog/goals/G-AUDI-004.md`
- **Verification Command:**
  `npm --prefix code/services/audit-service test:unit && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-AUDI-004.md`
