# Worker Dispatch: G-TELM-006 Implementation

- **Goal ID:** `G-TELM-006`
- **Role:** Reliability & Reconciliation Engineer
- **Persona:** `Systems & Reliability Architect`
- **Touch Map:**
  - `code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.ts`
  - `code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.spec.ts`
  - `code/services/telemetry-service/src/reconciliation/telemetry-dlq.publisher.ts`
  - `docs/07-backlog/goals/G-TELM-006.md`
  - `docs/03-architecture/specs/goals/G-TELM-006/design.md`
- **Verification Command:**
  `node --test code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.spec.ts`
