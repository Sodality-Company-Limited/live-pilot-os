# Worker Dispatch: G-AUDI-007 Implementation

- **Goal ID:** `G-AUDI-007`
- **Role:** Implementer
- **Persona:** `Principal Quality & Performance Engineer`
- **Touch Map:**
  - `code/services/audit-service/test/certification/`
  - `artifacts/proofs/G-AUDI-007-audit-certification.json`
  - `docs/03-architecture/specs/goals/G-AUDI-007/`
  - `docs/07-backlog/goals/G-AUDI-007.md`
- **Verification Command:**
  `node --test code/services/audit-service/test/certification/audit-certification.spec.ts && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-AUDI-007.md`
