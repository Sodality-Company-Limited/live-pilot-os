# Worker Dispatch: G-TELM-001 Implementation

- **Goal ID:** `G-TELM-001`
- **Role:** Implementer
- **Persona:** `Systems & API Contract Engineer`
- **Touch Map:**
  - `docs/03-architecture/api/services/telemetry-service.md`
  - `docs/03-architecture/api/asyncapi.yaml`
  - `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`
  - `docs/03-architecture/api/nats-subject-catalog-sot.md`
  - `docs/03-architecture/api/error-codes.yaml`
  - `docs/07-backlog/goals/G-TELM-001.md`
- **Verification Command:**
  `node scripts/contract-check/error-code-registry.mjs && node scripts/harness/api-sot-traceability-harness.mjs`
