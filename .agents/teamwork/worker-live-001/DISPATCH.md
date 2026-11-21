# DISPATCH: worker-live-001

- **Goal Target:** G-LIVE-001 (Freeze live-session service contract and state machine)
- **Role:** implementer
- **Persona:** Backend Protocol & Contract Specialist
- **Touch Map:**
  - `docs/03-architecture/api/services/session-service.md`
  - `docs/03-architecture/api/schemas/nats/session-lifecycle.schema.json`
  - `docs/03-architecture/api/nats-subject-catalog-sot.md`
  - `docs/03-architecture/contracts/flows/coverage.yaml`
  - `docs/07-backlog/goals/G-LIVE-001.md`
- **Verification Command:**
  - `node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-LIVE-001.md`
