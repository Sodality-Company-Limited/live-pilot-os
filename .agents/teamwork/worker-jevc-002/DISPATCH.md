# Worker Dispatch: G-JEVC-002 Register JEV/Copilot NATS and provider schemas

- **Goal ID:** `G-JEVC-002`
- **Role:** `implementer`
- **Persona:** `NATS Schema & AsyncAPI Contract Architect`
- **Touch Map:**
  - `docs/03-architecture/api/asyncapi.yaml`
  - `docs/03-architecture/api/nats-subject-catalog-sot.md`
  - `docs/03-architecture/api/schemas/nats/jev-suggestion-proposed.schema.json`
  - `docs/03-architecture/api/schemas/nats/jev-suggestion-withdrawn.schema.json`
  - `docs/03-architecture/api/schemas/nats/jev-copilot-delivery-degraded.schema.json`
  - `docs/03-architecture/specs/goals/G-JEVC-002/`
- **Verification Command:**
  `node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node scripts/testing/check-tdd-traceability.mjs`
