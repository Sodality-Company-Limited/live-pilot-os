# Worker Dispatch: G-JEVC-004 Implement provider-neutral JEV inference adapter

- **Goal ID:** `G-JEVC-004`
- **Role:** `implementer`
- **Persona:** `AI Model Provider & Inference Resilience Engineer`
- **Touch Map:**
  - `code/services/jev-copilot-service/src/provider/`
  - `code/services/jev-copilot-service/test/provider.test.mjs`
  - `docs/03-architecture/specs/goals/G-JEVC-004/`
- **Verification Command:**
  `node code/services/jev-copilot-service/test/provider.test.mjs && node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node scripts/testing/check-tdd-traceability.mjs`
