# Worker Dispatch: G-AUDI-001 Implementation

- **Goal ID:** `G-AUDI-001`
- **Role:** Implementer
- **Persona:** `Systems & API Contract Engineer`
- **Touch Map:**
  - `docs/03-architecture/api/services/audit-service.md`
  - `docs/03-architecture/api/asyncapi.yaml`
  - `docs/03-architecture/api/schemas/nats/audit-receipt.schema.json`
  - `docs/03-architecture/api/nats-subject-catalog-sot.md`
  - `docs/03-architecture/api/error-codes.yaml`
  - `docs/07-backlog/goals/G-AUDI-001.md`
- **Verification Command:**
  `node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs`
