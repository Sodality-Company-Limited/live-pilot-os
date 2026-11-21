# Worker Dispatch: G-JEVC-001 Scope and Contract Freeze

- **Goal ID:** `G-JEVC-001`
- **Role:** `implementer`
- **Persona:** `Systems & API Contract Engineer`
- **Touch Map:**
  - `docs/03-architecture/api/services/jev-copilot-service.md`
  - `docs/03-architecture/specs/goals/G-JEVC-001/G-JEVC-001-architecture-spec.md`
  - `docs/03-architecture/specs/goals/G-JEVC-001/G-JEVC-001-fsm-runtime-spec.md`
  - `docs/03-architecture/specs/goals/G-JEVC-001/G-JEVC-001-invariants-formal-spec.md`
  - `docs/03-architecture/specs/goals/G-JEVC-001/G-JEVC-001-threat-model.md`
- **Verification Command:**
  `node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node scripts/testing/check-tdd-traceability.mjs`
