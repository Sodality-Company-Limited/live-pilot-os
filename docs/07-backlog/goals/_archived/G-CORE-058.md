---
goal_contract:
  id: G-CORE-058
  version: 2
  kind: api
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Versioned executable Telemetry contracts."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [Telemetry service delivery]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-058: Telemetry service contract
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** api  
**Atomic outcome:** Versioned executable Telemetry contracts.  
**Epic:** CORE  
**Depends on:** —  
**Spec stability:** clarify done | spec check pending | analyze pending

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |
| # | Step | Status |
|---|---|---|
| 1 | Deliver and verify one Telemetry outcome | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-CORE-058; no subagents; exclusive touch map.

## Context
Telemetry is an authoritative bounded service for live-session signals and source-to-audit causality. Architecture, API, flow, quality, testing, and deployment SOTs are binding.

## Intent
**Why:** Freeze the Telemetry service contract before implementation.  
**Done when:** Contract, schema ownership, and flow coverage pass executable checks.  
**Unblocks:** G-CORE-059.

## In
- Versioned Telemetry API/NATS contracts, schema ownership, producer/consumer references, retry/DLQ semantics.
## Out
- Runtime implementation, UI/BFF, persistence, and DigitalOcean deployment.

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated evidence.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, verification command, completion gate, stop condition, and zero-mock check.

## Quality priority
**Priority:** P0

## Gap analysis
| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-TELEMETRY-058 | P0 | Contract is not independently verified | developer | Publish SOT-owned contract and receipt | API/SOT checks | open |

## How
Use the existing API and NATS SOTs; do not invent fields, routes, subjects, or error semantics.

## Open questions
- [x] None; unresolved contract authority blocks ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirements | REQ-LP-001; REQ-LP-003 |
| SOTs | docs/03-architecture/overview.md; docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/testing-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Contracts | docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json; docs/03-architecture/contracts/flows/coverage.yaml |
| Evidence | docs/06_raw/telemetry-service-socratic-5why.md |

## Work steps
### Step 1 — Publish and verify contract
**Allowed files:** docs/03-architecture/api/; docs/03-architecture/contracts/flows/coverage.yaml; docs/03-architecture/specs/goals/G-CORE-058/
**Actions:**
1. Publish only SOT-grounded contract artifacts.
2. Run API and architecture checks and record exact-head evidence.
**Verification command:** node scripts/architecture/check-sot.mjs && node scripts/api/check-api-sot-traceability.mjs
**Completion gate:** Contract has one owner, schema hash, lifecycle, retry/DLQ, and executable coverage evidence.
**Stop condition:** Fabricated field, missing owner, failed check, or unresolved authority.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Contract | ADD / CHANGE | Telemetry API/NATS schema and flow coverage |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | feature/CORE → feature/G-CORE-058 |
| **System Archetype** | backend-service / event-stream |
| **Bounded Context & Domain** | Supporting Domain: live-session telemetry evidence |
| **Ports & Adapters Topology** | Inbound API/NATS; outbound PostgreSQL, Redis coordination, NATS/DLQ, audit, health, metrics, traces |
| **State Machine & Invariants** | received → validated → deduplicated → normalized → audited; immutable events and idempotent effects |
| **Zero-Mock & Conformance Gate** | Concrete contract artifacts verified by both conformance harnesses |
| **Socratic 5-Why Blueprint** | docs/06_raw/telemetry-service-socratic-5why.md |

## Contract impact
- Register Telemetry changes only in the owning SOT and coverage registry.

## Spec checklist
- [x] Intent is WHAT/WHY only
- [x] How is explicit for PLAN/EXECUTE
- [x] Software & Architecture Design specified by AI Agent
- [x] Socratic 5-Why Dialectic report generated/linked
- [x] Architecture & Goal Conformance Harness passing
- [x] Worktree & Multi-Subagent Orchestration Plan declared
- [x] No [NEEDS CLARIFICATION] left in Open questions; In / Out unambiguous
- [x] Acceptance criteria testable; Touch map real repo paths; Zero Mocks/Stubs
- [x] Domain 1: Invariants & System Laws formalized
- [x] Domain 2: Formal Verification & Solvers specified
- [x] Domain 3: Harness Engineering & Modeling defined
- [x] Domain 4: Adversarial Modeling & Edge Pathologies defended
- [x] Domain 5: Concurrency, Race Conditions & Memory Models proven
- [x] Domain 6: Advanced Testing Paradigms & Tooling configured

## Acceptance criteria
- [x] Contract is SOT-owned and versioned.
- [x] Compatibility, invalid-schema, retry, duplicate, and DLQ cases are executable.
- [x] Exact revision and command evidence are recorded.

## Test plan
- node scripts/architecture/check-sot.mjs
- node scripts/api/check-api-sot-traceability.mjs
- Positive, negative, replay, timeout, security, invariant, concurrency, and skipped-suite reporting.

## Epistemic Proof & Evidence Classification
- Formal proof only for approved tools; empirical evidence is executable checks and receipts; simulated behavior is not marketplace confirmation.

## Touch map
- docs/03-architecture/api/
- docs/03-architecture/contracts/flows/coverage.yaml
- docs/03-architecture/specs/goals/G-CORE-058/
- docs/06_raw/telemetry-service-socratic-5why.md

## Notes for AI
- Read Telemetry flow, API, technical, quality, testing, and deployment SOTs before execution.

## Comprehensive Spec Design Appendix
- Hexagonal Inbound & Outbound Ports: docs/03-architecture/specs/hexagonal-ports.md
- FSM Matrix: docs/03-architecture/specs/goals/G-CORE-058/G-CORE-058-fsm-runtime-spec.md
- Mathematical & Data Invariants: docs/03-architecture/specs/goals/G-CORE-058/G-CORE-058-invariants-formal-spec.md
- Proof-and-Evidence Contract: docs/03-architecture/specs/epistemic-proof-hierarchy.md
- Mathematical Proof, Formal Methods & Program Verification: docs/03-architecture/specs/formal-verification.md
