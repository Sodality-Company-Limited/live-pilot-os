---
goal_contract:
  id: G-TELM-002
  version: 2
  kind: qa
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Schema conformance test suite and backward-compatibility golden fixtures for telemetry signals."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: medium, reasons: [message schema evolution and consumer compatibility]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-TELM-002: Verify Telemetry message compatibility
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** qa  
**Spec stability:** clarify done | spec check pending | analyze pending  
**Atomic outcome:** Schema conformance test suite and backward-compatibility golden fixtures for telemetry signals.  
**Epic:** TELM  
**Depends on:** G-TELM-001  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Create golden contract fixtures and automated schema validation tests | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-TELM-002; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Telemetry ingestion accepts signals across multiple producer versions. Backward compatibility must be verified with automated contract fixtures before implementation.

## Intent
**Why:** Guarantee all incoming telemetry message variants conform strictly to schema envelopes and pass backward-compatibility test suites.  
**Done when:** Contract test suite passes against valid, invalid, and legacy golden fixtures with zero false positives.  
**Unblocks:** G-TELM-005

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `tests/contracts/telemetry/` test fixtures and contract runners
- Valid, invalid, edge-case, and envelope schema validation tests
- `docs/03-architecture/specs/goals/G-TELM-002/`

## Out
- Database integration and persistence logic
- Live NATS cluster connections

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
### Step 1 — Create golden contract fixtures and automated schema validation tests
**Allowed files:** `tests/contracts/telemetry/telemetry-signal-contract.spec.ts`, `tests/contracts/telemetry/run-contract-tests.mjs`, `tests/contracts/telemetry/fixtures/telemetry-signal.valid.json`, `tests/contracts/telemetry/fixtures/telemetry-signal.invalid.json`, `docs/03-architecture/specs/goals/G-TELM-002/`  
**Actions:**
1. Establish valid and invalid golden JSON fixtures under `tests/contracts/telemetry/fixtures/`.
2. Implement real JSON Schema Draft 2020-12 contract test runner (`run-contract-tests.mjs` and `telemetry-signal-contract.spec.ts`) verifying header envelopes, tenant scopes, and schema constraints.
**Verification command:** node tests/contracts/telemetry/run-contract-tests.mjs && node --test tests/contracts/telemetry/telemetry-signal-contract.spec.ts  
**Completion gate:** All golden fixtures pass validation and invalid payloads fail closed with structured schema error receipts.  
**Stop condition:** Silent validation failure, missing required envelope assertions, or mocked test runners.  
**Zero-Mock invariant check:** 100% operational JSON Schema Draft 2020-12 validator and golden contract suite; zero stubs, zero mocks, zero placeholders.

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
- [x] Golden payload fixtures cover all signal types (`chat`, `purchase`, `engagement`, `system`).
- [x] Contract test suite verifies envelope headers: `tenant_id`, `session_id`, `traceparent`, and `occurred_at`.
- [x] Schema validation fails closed upon detecting unexpected or unversioned fields.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `tests/contracts/telemetry/telemetry-signal-contract.spec.ts`
- `tests/contracts/telemetry/run-contract-tests.mjs`
- `tests/contracts/telemetry/fixtures/telemetry-signal.valid.json`
- `tests/contracts/telemetry/fixtures/telemetry-signal.invalid.json`
- `docs/03-architecture/specs/goals/G-TELM-002/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
