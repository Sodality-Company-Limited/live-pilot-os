---
goal_contract:
  id: G-TELM-006
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Dead-letter queue consumer and background reconciliation worker for interrupted signals."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [dead-letter handling, backoff retries, and data reconciliation]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-TELM-006: Add Telemetry recovery and reconciliation
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Spec stability:** clarify done | spec check pending | analyze pending  
**Atomic outcome:** Dead-letter queue consumer and background reconciliation worker for interrupted signals.  
**Epic:** TELM  
**Depends on:** G-TELM-005  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement exponential backoff retry worker, DLQ routing, and periodic reconciliation scanner | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-TELM-006; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Signals encountering transient persistence errors must be retried with exponential backoff (max 5 attempts) before routing to `livepilot.v1.telemetry.signal.dlq`.

## Intent
**Why:** Guarantee resilience against transient network and database failures with automatic retry and dead-letter routing.  
**Done when:** Transient errors are retried up to 5 times, unrecoverable errors route to DLQ with causation headers, and reconciliation reaps pending signals.  
**Unblocks:** G-TELM-007

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/telemetry-service/src/reconciliation/`
- Retry policy handler and DLQ publisher
- Periodic uncommitted signal reconciliation job
- `docs/03-architecture/specs/goals/G-TELM-006/`

## Out
- User-facing administrative UI
- External PagerDuty alerting webhooks

## Open questions
- [x] None; unresolved architectural decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-016 |
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/service-topology-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md |
| Deployment | docs/03-architecture/deployment/README.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated evidence.
- **Fail closed:** unknown, stale, unauthorized, or failed work cannot report success.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Work steps
### Step 1 — Implement exponential backoff retry worker, DLQ routing, and periodic reconciliation scanner
**Allowed files:** `code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.ts`, `code/services/telemetry-service/src/reconciliation/telemetry-dlq.publisher.ts`, `code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.spec.ts`, `docs/03-architecture/specs/goals/G-TELM-006/design.md`  
**Actions:**
1. Implement `TelemetryDlqPublisher` building schema-valid DLQ envelopes for `livepilot.v1.telemetry.signal.dlq` with `dlq_metadata` and SHA-256 payload digest.
2. Implement `TelemetryReconciliationService` handling bounded exponential backoff retries (attempts 1..4), `DEAD_LETTER` FSM transitions and DLQ dispatching (attempt >= 5), and periodic stale signal reconciliation.
3. Author fault-injection integration tests simulating database timeouts, exhausted retries, and stale pending signal reconciliation.
**Verification command:** node --test code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.spec.ts  
**Completion gate:** Fault simulation tests pass: signals retry up to 5 times then land on DLQ with zero message loss.  
**Stop condition:** Unbounded retries, lost error contexts on DLQ messages, or non-deterministic recovery behavior.
**Zero-Mock invariant check:** 100% operational exponential backoff scheduler, pure domain FSM (`transitionSignal`), frozen `telemetry-signal.schema.json` DLQ envelope builder/publisher, transactional PostgreSQL reconciliation queries, and in-process PostgreSQL + JetStream fault-injection test harness; zero mocks, zero stubs, zero fallbacks.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| telemetry-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Telemetry Signal Observation Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] Transient failures trigger exponential backoff retry up to 5 attempts.
- [x] Permanent failures and exhausted retries publish cleanly to `livepilot.v1.telemetry.signal.dlq`.
- [x] Reconciliation worker safely identifies and resolves uncommitted signal records.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.ts`
- `code/services/telemetry-service/src/reconciliation/telemetry-dlq.publisher.ts`
- `code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.spec.ts`
- `docs/07-backlog/goals/G-TELM-006.md`
- `docs/03-architecture/specs/goals/G-TELM-006/design.md`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
