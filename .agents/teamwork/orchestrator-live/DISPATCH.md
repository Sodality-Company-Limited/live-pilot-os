# DISPATCH: orchestrator-live

- **Goal Target:** G-LIVE Epic (`G-LIVE-001` through `G-LIVE-005`)
- **Role:** coordinator
- **Persona:** Soda OS Fleet Orchestrator
- **Touch Map:**
  - `docs/03-architecture/api/services/session-service.md`
  - `docs/03-architecture/api/schemas/nats/session-lifecycle.schema.json`
  - `docs/03-architecture/api/nats-subject-catalog-sot.md`
  - `docs/03-architecture/contracts/flows/coverage.yaml`
  - `code/services/session-service/`
  - `docs/07-backlog/goals/G-LIVE-*.md`
  - `docs/07-backlog/queues/LIVE.md`
- **Verification Command:**
  - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-LIVE-001.md`
  - `node scripts/contract-check/error-code-registry.mjs`
  - `node scripts/api/check-api-sot-traceability.mjs`
