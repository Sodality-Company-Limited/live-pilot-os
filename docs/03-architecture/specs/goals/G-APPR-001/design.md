# G-APPR-001 Pre-Execution Design Specification

## 1. Intent & Architectural Rationale

Freeze an authoritative, versioned, SOT-owned contract for `approval-control-service` covering operator approvals, approval modes (`RECOMMEND_ONLY`, `ASSISTED`, `AUTONOMOUS`), and emergency pause before database migrations (`G-APPR-002`), pure domain state machine implementation (`G-APPR-003`), or runtime NATS JetStream handlers (`G-APPR-005`) are written. Isolating control-plane commands and events behind explicit NATS JetStream subjects (`livepilot.v1.control.approval.*`, `livepilot.v1.control.mode.*`, `livepilot.v1.control.emergency_pause.*`) and JSON Schema 2020-12 prevents unauthorized discount issuance, uncontrolled automated dispatch, and race conditions during emergency pauses.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Establish single-writer ownership (`approval-control-service`) over `ApprovalRequest`, `ControlMode`, and `EmergencyPause` aggregates with PostgreSQL persistence.
  - Freeze approval state machine (`requested → approved | rejected | expired | revoked`) and emergency pause state machine (`active | inactive`).
  - Define NATS transport envelope, required headers, idempotency keys, optimistic concurrency versions, and zero-float integer millisecond timestamps (Article V).
  - Register all subjects in `asyncapi.yaml` and `nats-subject-catalog-sot.md` and policy error codes (`LP05001`–`LP05008`) in `error-codes.yaml`.
- **Non-Goals / Anti-Goals:**
  - Writing runtime handler code, database migrations, or UI portal components (owned by downstream goals G-APPR-002 through G-APPR-007).
  - Owning promotion voucher generation, margin floor calculations, inventory stock locks, or platform execution adapters.

## 3. Approaches Considered & Rejected Alternatives

1. **Embedding approval logic directly inside `promotion-service` (Rejected):** Tightly couples promotion marketing rules with control-plane authorization and emergency stops, preventing unified control across product pinning and other automated actions.
2. **Client-side approval gating in Host UI (Rejected):** UI-only hiding provides zero security; malicious or misconfigured clients could bypass approvals or ignore emergency pause.
3. **Dedicated `approval-control-service` control-plane aggregate with fail-closed NATS JetStream contract (Selected):** Guarantees absolute precedence of Emergency Pause, deterministic state transitions, audit-grade non-repudiation, and clean separation of concerns.

## 4. Selected Approach & Trade-off Analysis

Using NATS JetStream at-least-once delivery keyed by `session_id` with PostgreSQL `approvals` + `control_modes` + `emergency_pauses` tables and a transactional outbox balances throughput with strict durability. Requiring optimistic concurrency checks (`expected_resource_version`, `control_revision`) prevents concurrent operator decision collisions, trading trivial eventual consistency for strict fail-closed safety.

## 5. Bounded Context & Touch Map Invariants

All edits are strictly bounded to the declared `G-APPR-001` touch map:
- `docs/03-architecture/api/services/approval-control-service.md`
- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/api/schemas/nats/approval-decision.schema.json`
- `docs/03-architecture/api/schemas/nats/control-mode.schema.json`
- `docs/03-architecture/api/schemas/nats/emergency-pause.schema.json`
- `docs/03-architecture/api/nats-subject-catalog-sot.md`
- `docs/03-architecture/api/error-codes.yaml`
- `docs/03-architecture/specs/goals/G-APPR-001/`
- `docs/07-backlog/goals/G-APPR-001.md`

## 6. Acceptance Test & TDD Verification Strategy

Verification executes deterministic contract, schema, traceability, and goal conformance gates:
- `node scripts/contract-check/error-code-registry.mjs`
- `node scripts/api/check-api-sot-traceability.mjs`
- `node scripts/architecture/check-sot.mjs`
- `node tests/contracts/approval/approval-control-contract.test.mjs`
- `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-APPR-001.md`
