---
goal_contract:
  id: G-APPR-006
  version: 2
  kind: qa
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Comprehensive integration, concurrent decision race, pause fail-closed chaos, and SOT gate verification suite."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [race conditions, emergency pause fail-closed chaos, SOT gate compliance]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-APPR-006: Implement full service-level integration, chaos resilience, and SOT gate verification
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** qa  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** Comprehensive integration, concurrent decision race, pause fail-closed chaos, and SOT gate verification suite.  
**Epic:** APPR  
**Depends on:** G-APPR-005  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Execute service-level integration, chaos resilience, and SOT traceability tests | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-APPR-006; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
Validate approval-control-service under adverse conditions: concurrent decision races, network partitions, sudden emergency pause activations, and token expiration.

## Intent
**Why:** Verify operational reliability and deterministic compliance with LivePilot OS architectural invariants.  
**Done when:** All integration tests, chaos tests, and architectural validation scripts pass cleanly.  
**Unblocks:** G-APPR-007

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- `code/services/approval-control-service/test/e2e/`
- `code/services/approval-control-service/test/chaos/`
- `docs/03-architecture/specs/goals/G-APPR-006/`

## Out
- Deployment packaging and image publication (owned by G-APPR-007)

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
### Step 1 — Execute service-level integration, chaos resilience, and SOT traceability tests
**Allowed files:** `code/services/approval-control-service/test/e2e/`, `code/services/approval-control-service/test/chaos/`, `docs/03-architecture/specs/goals/G-APPR-006/`  
**Actions:**
1. Implement concurrency race tests verifying optimistic lock conflicts fail safely.
2. Implement chaos tests verifying immediate fail-closed cessation of actions upon Emergency Pause.
**Verification command:** node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node --test code/services/approval-control-service/test/e2e/*.test.mjs  
**Completion gate:** All SOT gates, concurrency tests, and emergency pause chaos tests pass with 0 defects.  
**Stop condition:** Any race condition permitting duplicate approval, or execution leak during emergency pause.  
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
- [x] Zero-mock E2E suite passes all happy and negative paths.
- [x] Emergency Pause fail-closed invariant mathematically proven under chaos load.
- [x] All architectural SOT linters pass 100% green.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/approval-control-service/test/e2e/`
- `code/services/approval-control-service/test/chaos/`
- `docs/03-architecture/specs/goals/G-APPR-006/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Approvals transition through requested → approved | rejected | expired | revoked; emergency pause transitions through active | inactive; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.


## Closeout Notes

- **Closed Date:** 2026-11-21
- **Reason / Outcome:** Comprehensive service-level integration, concurrent decision race, pause fail-closed chaos, and SOT gate verification completed with 100% pass.
