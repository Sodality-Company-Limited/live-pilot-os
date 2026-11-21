---
goal_contract:
  id: G-AUDI-001
  version: 2
  kind: api
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "A versioned, SOT-owned contract for append-only audit receipt ingestion and error codes."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [audit boundary, immutable ledger, and error registry]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-AUDI-001: Freeze the Audit service contract & error registry
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** api  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** A versioned, SOT-owned contract for append-only audit receipt ingestion and error codes.  
**Epic:** AUDI  
**Depends on:** —  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Freeze audit contract, schema specifications, and error codes | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-AUDI-001; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Audit owns `livepilot.v1.audit.receipt.append` and the canonical audit-receipt payload family. It writes immutable ledger facts and proof lineages; it does not mutate business state.

## Intent
**Why:** Establish immutable SOT contract, schemas, LP13xxx error codes, and NATS subject registrations for audit-service before implementing runtime code.  
**Done when:** The audit-service contract, AsyncAPI channels, error codes, and JSON schemas pass all automated schema validation and traceability checks.  
**Unblocks:** G-AUDI-002, G-AUDI-003, G-AUDI-004

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `docs/03-architecture/api/services/audit-service.md`
- `docs/03-architecture/api/asyncapi.yaml` audit channel definitions
- `docs/03-architecture/api/schemas/nats/audit-receipt.schema.json`
- `docs/03-architecture/api/error-codes.yaml` error codes for audit (LP13xxx)
- `docs/03-architecture/api/nats-subject-catalog-sot.md` registration
- `docs/03-architecture/specs/goals/G-AUDI-001/`

## Out
- Runtime service code for audit append (owned by G-AUDI-005)
- Database schema creation and migrations (owned by G-AUDI-003)
- Domain state machine implementation (owned by G-AUDI-004)

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
### Step 1 — Freeze audit contract, schema specifications, and error codes
**Allowed files:** `docs/03-architecture/api/services/audit-service.md`, `docs/03-architecture/api/asyncapi.yaml`, `docs/03-architecture/api/schemas/nats/audit-receipt.schema.json`, `docs/03-architecture/api/nats-subject-catalog-sot.md`, `docs/03-architecture/api/error-codes.yaml`, `docs/03-architecture/specs/goals/G-AUDI-001/`  
**Actions:**
1. Update `docs/03-architecture/api/services/audit-service.md` with complete ownership, commands, events, state machine, errors, and delivery semantics.
2. Validate `docs/03-architecture/api/schemas/nats/audit-receipt.schema.json` and ensure registration in `asyncapi.yaml` and `nats-subject-catalog-sot.md`.
**Verification command:** node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.  
**Completion gate:** Contract file, schemas, asyncapi channels, and error code registry pass all validation gates with zero drift.  
**Stop condition:** Unresolved ownership conflict, unregistered subjects, schema validation failure, or out-of-scope code changes.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| audit-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Execution Audit & Immutable Decision Ledger Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] `docs/03-architecture/api/services/audit-service.md` defines complete ownership, aggregate, commands, events, and persistence boundaries.
- [x] `docs/03-architecture/api/schemas/nats/audit-receipt.schema.json` conforms strictly to JSON Schema draft-2020-12 and envelopes.
- [x] API SOT traceability harness passes with zero unmapped endpoints or subjects.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `docs/03-architecture/api/services/audit-service.md`
- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/api/schemas/nats/audit-receipt.schema.json`
- `docs/03-architecture/api/nats-subject-catalog-sot.md`
- `docs/03-architecture/api/error-codes.yaml`
- `docs/03-architecture/specs/goals/G-AUDI-001/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → redacted → hashed → committed; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
