---
goal_contract:
  id: G-APPR-001
  version: 2
  kind: api
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "A versioned, SOT-owned contract for approval decisions, approval modes, and emergency pause."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [control-plane authority, approval state machine, emergency pause]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-APPR-001: Freeze Approval & Control service contract, state machine, and error registry
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** api  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** A versioned, SOT-owned contract for approval decisions, approval modes, and emergency pause.  
**Epic:** APPR  
**Depends on:** —  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Freeze approval-control contract, schemas, and error codes | completed |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-APPR-001; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Approval & Control service owns `livepilot.v1.control.approval.*`, `livepilot.v1.control.mode.*`, and `livepilot.v1.control.emergency_pause.*`. It is the authoritative control-plane writer for operator approvals, approval modes (RECOMMEND_ONLY, ASSISTED, AUTONOMOUS), and emergency pause state. It does not own promotion lifecycle, inventory reservations, margin calculations, or execution adapters.

## Intent
**Why:** Establish immutable SOT contract, schemas, LP05xxx error codes, and NATS subject registrations for approval-control-service before implementing runtime code.  
**Done when:** The approval-control-service contract, AsyncAPI channels, error codes, and JSON schemas pass all automated schema validation and traceability checks.  
**Unblocks:** G-APPR-002, G-APPR-003, G-APPR-004

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `docs/03-architecture/api/services/approval-control-service.md`
- `docs/03-architecture/api/asyncapi.yaml` approval channels
- `docs/03-architecture/api/schemas/nats/approval-decision.schema.json`
- `docs/03-architecture/api/schemas/nats/control-mode.schema.json`
- `docs/03-architecture/api/schemas/nats/emergency-pause.schema.json`
- `docs/03-architecture/api/error-codes.yaml` error codes for policy/approval
- `docs/03-architecture/api/nats-subject-catalog-sot.md` registration
- `docs/03-architecture/specs/goals/G-APPR-001/`

## Out
- Runtime service code for approval handling (owned by G-APPR-005)
- Database schema creation and migrations (owned by G-APPR-002)
- Domain state machine implementation (owned by G-APPR-003)

## Open questions
- [x] None; unresolved architectural decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-013; REQ-LP-016 |
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/service-topology-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md |
| Deployment | docs/03-architecture/deployment/README.md; docs/03-architecture/deployment/digitalocean-droplets-sot.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated evidence.
- **Fail closed:** unknown, stale, unauthorized, or failed work cannot report success.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Work steps
### Step 1 — Freeze approval-control contract, schemas, and error codes
**Allowed files:** `docs/03-architecture/api/services/approval-control-service.md`, `docs/03-architecture/api/asyncapi.yaml`, `docs/03-architecture/api/schemas/nats/approval-decision.schema.json`, `docs/03-architecture/api/schemas/nats/control-mode.schema.json`, `docs/03-architecture/api/schemas/nats/emergency-pause.schema.json`, `docs/03-architecture/api/nats-subject-catalog-sot.md`, `docs/03-architecture/api/error-codes.yaml`, `docs/03-architecture/specs/goals/G-APPR-001/`  
**Actions:**
1. Create `docs/03-architecture/api/services/approval-control-service.md` with complete ownership, commands, events, state machine, errors, and delivery semantics.
2. Add JSON schemas and register NATS subjects in `asyncapi.yaml` and `nats-subject-catalog-sot.md`.
**Verification command:** node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs  
**Completion gate:** Contract file, schemas, asyncapi channels, and error code registry pass all validation gates with zero drift.  
**Stop condition:** Unresolved ownership conflict, unregistered subjects, schema validation failure, or out-of-scope code changes.  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| approval-control-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Approval Control Plane & Emergency Pause Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] `docs/03-architecture/api/services/approval-control-service.md` defines complete ownership, aggregate, commands, events, and persistence boundaries.
- [x] JSON Schemas strictly validate approval, control-mode, and emergency-pause contracts.
- [x] API SOT traceability harness passes with zero unmapped endpoints or subjects.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `docs/03-architecture/api/services/approval-control-service.md`
- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/api/schemas/nats/approval-decision.schema.json`
- `docs/03-architecture/api/schemas/nats/control-mode.schema.json`
- `docs/03-architecture/api/schemas/nats/emergency-pause.schema.json`
- `docs/03-architecture/api/nats-subject-catalog-sot.md`
- `docs/03-architecture/api/error-codes.yaml`
- `docs/03-architecture/specs/goals/G-APPR-001/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Approvals transition through requested → approved | rejected | expired | revoked; emergency pause transitions through active | inactive; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
