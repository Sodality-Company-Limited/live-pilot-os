# Orchestrator Dispatch: TELM Epic Execution

- **Target Epic:** TELM
- **Goals In Scope:** `G-TELM-001` through `G-TELM-008`
- **Role:** Autonomous Orchestrator Supervisor
- **Persona:** `Software Architect & Lead Systems Engineer`
- **Primary Execution Target:** `G-TELM-001` (Freeze the Telemetry service contract)
- **Lifecycle Mode:** Sequential Autonomous Execution
- **Touch Map Boundaries:**
  - `docs/03-architecture/api/services/telemetry-service.md`
  - `docs/03-architecture/api/asyncapi.yaml`
  - `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`
  - `docs/03-architecture/api/nats-subject-catalog-sot.md`
  - `docs/03-architecture/api/error-codes.yaml`
  - `docs/07-backlog/goals/G-TELM-*.md`
  - `docs/07-backlog/queues/TELM.md`
- **Verification Harness:**
  - `node scripts/contract-check/error-code-registry.mjs`
  - `node scripts/harness/api-sot-traceability-harness.mjs`
  - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-TELM-001.md`
