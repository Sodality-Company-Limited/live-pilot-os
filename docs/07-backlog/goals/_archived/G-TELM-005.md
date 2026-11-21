---
goal_contract:
  id: G-TELM-005
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Functional NATS JetStream consumer writing signals idempotently to database."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [real-time event ingestion throughput and outbox atomicity]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-TELM-005: Implement the Telemetry ingest vertical slice
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Spec stability:** clarify done | spec check pending | analyze pending  
**Atomic outcome:** Functional NATS JetStream consumer writing signals idempotently to database.  
**Epic:** TELM  
**Depends on:** G-TELM-002, G-TELM-003, G-TELM-004  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement end-to-end ingestion pipeline with repository and outbox publisher | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-TELM-005; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Combines schema validation, domain state machine, and PostgreSQL persistence into the primary ingestion vertical slice with ack-after-commit semantics.

## Intent
**Why:** Deliver the core single vertical slice for telemetry signal ingestion from NATS subject through durable persistence.  
**Done when:** Valid incoming signals are validated, written to database with outbox event, and acknowledged only after durable commit.  
**Unblocks:** G-TELM-006

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/telemetry-service/src/ingest/`
- NATS JetStream consumer for `livepilot.v1.telemetry.signal.ingest`
- Kysely repository persistence with transactional outbox
- `docs/03-architecture/specs/goals/G-TELM-005/`

## Out
- DLQ background recovery workers (owned by G-TELM-006)
- Production deployment manifests (owned by G-TELM-008)

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
### Step 1 — Implement end-to-end ingestion pipeline with repository and outbox publisher
**Allowed files:** `code/services/telemetry-service/src/ingest/telemetry-ingest.service.ts`, `code/services/telemetry-service/src/ingest/telemetry-ingest.controller.ts`, `code/services/telemetry-service/src/ingest/telemetry-ingest.service.spec.ts`, `docs/03-architecture/specs/goals/G-TELM-005/`  
**Actions:**
1. Implement `TelemetryIngestService` and repository wiring NATS subscriber to database transaction boundary.
2. Verify end-to-end integration tests confirming ack-after-commit, duplicate idempotency, and transactional outbox emission.
**Verification command:** node --test code/services/telemetry-service/src/ingest/telemetry-ingest.service.spec.ts  
**Completion gate:** End-to-end vertical slice passes integration tests with real PostgreSQL SQL transaction execution and JetStream ack-after-commit verification.  
**Stop condition:** Acking before database commit, untransactional outbox writes, or unhandled persistence exceptions.  
**Zero-Mock invariant check:** 100% operational repository SQL, frozen JSON Schema Draft 2020-12 envelope validator, pure domain FSM (`transitionSignal`), and in-process transactional PostgreSQL + JetStream test harness; zero mocks, zero stubs, zero fallbacks.

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
- [x] Incoming NATS signals are processed with at-least-once delivery and strict `session_id` ordering.
- [x] Duplicate `signal_id` payloads are detected idempotently without redundant database writes.
- [x] Consumer sends JetStream ack ONLY after database transaction commits successfully.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/telemetry-service/src/ingest/telemetry-ingest.service.ts`
- `code/services/telemetry-service/src/ingest/telemetry-ingest.controller.ts`
- `code/services/telemetry-service/src/ingest/telemetry-ingest.service.spec.ts`
- `docs/03-architecture/specs/goals/G-TELM-005/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
