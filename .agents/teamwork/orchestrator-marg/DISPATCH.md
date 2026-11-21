# Orchestrator Dispatch: MARG Epic Execution

- **Target Epic:** MARG (Margin Policy Service)
- **Goals In Scope:** `G-MARG-001` through `G-MARG-007`
- **Role:** Autonomous Orchestrator Supervisor
- **Persona:** `Software Architect & Lead Systems Engineer`
- **Primary Execution Target:** `G-MARG-001` (Freeze Margin Policy Service contract and state machine)
- **Execution Mode:** Sequential Autonomous Ephemeral Worker Spawning
- **Touch Map Boundaries:**
  - `docs/03-architecture/api/services/margin-policy-service.md`
  - `docs/03-architecture/api/schemas/nats/margin-*.schema.json`
  - `docs/03-architecture/api/asyncapi.yaml`
  - `docs/03-architecture/api/nats-subject-catalog-sot.md`
  - `docs/03-architecture/api/error-codes.yaml`
  - `code/services/margin-policy-service/**`
  - `docs/07-backlog/goals/G-MARG-*.md`
  - `docs/07-backlog/queues/MARG.md`
- **Verification Commands:**
  - `node scripts/contract-check/error-code-registry.mjs`
  - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-MARG-001.md`
