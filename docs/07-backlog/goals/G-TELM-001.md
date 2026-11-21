---
goal_contract:
  id: G-TELM-001
  version: 2
  kind: api
  status: planned
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "A versioned, SOT-owned contract for tenant/session-scoped signal ingestion."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [service boundary and event compatibility]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: planned, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased}
---
# G-TELM-001: Freeze the Telemetry service contract
**Status:** planned  
**Kind:** api  
**Spec stability:** clarify done | spec check pending | analyze pending  
**Atomic outcome:** A versioned, SOT-owned contract for tenant/session-scoped signal ingestion.  
**Epic:** TELM  
**Depends on:** —  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:------:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|---|---|
| 1 | Freeze telemetry contract and schema specifications | pending |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-TELM-001; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Telemetry owns `livepilot.v1.telemetry.signal.ingest` and the canonical telemetry-signal payload family. It writes normalized signal facts and lineage; it does not classify intent/risk or own the audit ledger.

## Intent
**Why:** Establish immutable SOT contract, schemas, and NATS subject registrations for telemetry-service before implementing runtime code.  
**Done when:** The telemetry-service contract, AsyncAPI channels, error codes, and JSON schemas pass all automated schema validation and traceability checks.  
**Unblocks:** G-TELM-002, G-TELM-003, G-TELM-004

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `docs/03-architecture/api/services/telemetry-service.md`
- `docs/03-architecture/api/asyncapi.yaml` telemetry channel definitions
- `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`
- `docs/03-architecture/api/error-codes.yaml` error codes for telemetry
- `docs/03-architecture/api/nats-subject-catalog-sot.md` registration
- `docs/03-architecture/specs/goals/G-TELM-001/`

## Out
- Runtime service code for telemetry ingest (owned by G-TELM-005)
- Database schema creation and migrations (owned by G-TELM-003)
- Domain state machine implementation (owned by G-TELM-004)

## Open questions
- [ ] None; unresolved architectural decisions block promotion to ready.

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
### Step 1 — Freeze telemetry contract and schema specifications
**Allowed files:** `docs/03-architecture/api/services/telemetry-service.md`, `docs/03-architecture/api/asyncapi.yaml`, `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`, `docs/03-architecture/api/nats-subject-catalog-sot.md`, `docs/03-architecture/api/error-codes.yaml`, `docs/03-architecture/specs/goals/G-TELM-001/`  
**Actions:**
1. Update `docs/03-architecture/api/services/telemetry-service.md` with complete ownership, commands, events, state machine, errors, and delivery semantics.
2. Validate `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json` and ensure registration in `asyncapi.yaml` and `nats-subject-catalog-sot.md`.
**Verification command:** node scripts/harness/api-sot-traceability-harness.mjs && node scripts/contract-check/error-code-registry.mjs  
**Completion gate:** Contract file, schemas, asyncapi channels, and error code registry pass all validation gates with zero drift.  
**Stop condition:** Unresolved ownership conflict, unregistered subjects, schema validation failure, or out-of-scope code changes.

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
- [ ] Intent is WHAT/WHY only.
- [ ] Touch map is real and bounded.
- [ ] Acceptance criteria and verification command are executable.
- [ ] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [ ] `docs/03-architecture/api/services/telemetry-service.md` defines complete ownership, aggregate, commands, events, and persistence boundaries.
- [ ] `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json` conforms strictly to JSON Schema draft-07 and envelopes.
- [ ] API SOT traceability harness passes with zero unmapped endpoints or subjects.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `docs/03-architecture/api/services/telemetry-service.md`
- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`
- `docs/03-architecture/api/nats-subject-catalog-sot.md`
- `docs/03-architecture/api/error-codes.yaml`
- `docs/03-architecture/specs/goals/G-TELM-001/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
