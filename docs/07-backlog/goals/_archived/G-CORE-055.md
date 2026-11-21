---
goal_contract:
  id: G-CORE-055
  version: 2
  kind: chore
  status: done
  profiles: [core, sre]
  atomicity:
    outcome_count: 1
    primary_outcome: "one independently verifiable session-service outcome"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [operational readiness]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-054]
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-055: Prepare the session-service runtime package
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** chore  
**Atomic outcome:** A production-shaped, observable, non-root session-service image package.  
**Epic:** CORE  
**Depends on:** G-CORE-054  
**Traceability:** `service-runtime-mapping-sot.md`; `deployment-pipeline-sot.md`; `software-quality-sot.md`

## In
- Pinned image, non-root runtime, health/readiness probes, graceful shutdown, resource limits, private binding, structured logs, metrics/traces, and local Compose wiring.

## Out
- DigitalOcean apply, shared foundation redesign, UI/BFF, and Kubernetes migration.

## Work steps
### Step 1 — package and verify the runtime
**Allowed files:** goal-scoped files declared in the touch map
**Actions:**
1. Build the pinned non-root image and run health, shutdown, telemetry, and smoke checks.
2. Record reproducible evidence and stop on any failed gate.
**Allowed files:** `code/services/session-service/`, `infra/docker-compose.yml`, `infra/`, `scripts/`, `docs/03-architecture/specs/goals/G-CORE-055/`  
**Verification command:** `bash scripts/ci/app-ci.sh` plus service health/smoke command recorded by the implementation repository  
**Completion gate:** Build, scan, startup, readiness, shutdown, logs, metrics, traces, and local smoke evidence pass.  
**Stop condition:** public database/NATS binding, root process, missing probe, unbounded resource, or unpinned image.

## Acceptance criteria
## Intent
**Why:** Deliver the single bounded session-service capability defined by the linked SOTs.  
**Done when:** The declared atomic outcome has reproducible green evidence.  
**Unblocks:** The next goal in the session-service dependency chain.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

**Spec stability:** clarify done | spec check pending | analyze pending

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement the declared atomic outcome | done |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-CORE-055; no subagents; disjoint touch map only.

## How
Implement only the declared outcome using linked SOTs. No placeholder behavior or fabricated evidence.

## Open questions
- [x] None; unresolved decisions block promotion to ready.

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
Return ordered steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| session-service | CHANGE | Implement only the declared atomic outcome |
| verification | ADD | Positive, negative, replay, timeout, and fail-closed evidence |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | feature/G-CORE-055 |
| **System Archetype** | backend-service / event-stream / sre-control-plane as scoped |
| **Bounded Context & Domain** | Live-session lifecycle supporting domain |
| **Ports & Adapters Topology** | Inbound lifecycle command; outbound PostgreSQL, NATS, audit, and telemetry ports as applicable |
| **State Machine & Invariants** | created → active → paused → active → ended; invalid/stale transitions fail closed |
| **Zero-Mock & Conformance Gate** | Concrete implementation and executable verification |
| **Socratic 5-Why Blueprint** | Derive from linked SOT evidence during PLAN |

## Contract impact
- **Schema modifications:** Only the versioned contract or migration named in the goal touch map.

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Acceptance criteria are testable and touch map is real.
- [x] Security, failure, idempotency, audit, and rollback invariants are explicit.
- [x] Architecture and goal conformance harness passes.

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, linked API/flow authority, and deployment authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM Matrix)
See the goal-specific FSM satellite specification.

### Mathematical & Data Invariants Spec
See the goal-specific invariants satellite specification.

### Hexagonal Ports & Adapters Spec
Inbound and outbound dependencies remain behind explicit ports; service-owned state is not bypassed.

- [ ] Runtime meets every service-runtime mapping deployment gate.
- [ ] Same image contract can be used locally and on DigitalOcean.
- [ ] Health and smoke evidence includes lifecycle success and fail-closed failure paths.

## Touch map
- `code/services/session-service/`
- `infra/`
- `scripts/`
- `docs/03-architecture/specs/goals/G-CORE-055/`

## Test plan
Build/lint, dependency and secret scan, container non-root check, readiness/liveness, graceful termination, resource, log/metric/trace, and local smoke tests.

## Satellite specifications
- [Architecture](../../03-architecture/specs/goals/G-CORE-055/G-CORE-055-architecture-spec.md)
- [Invariants](../../03-architecture/specs/goals/G-CORE-055/G-CORE-055-invariants-formal-spec.md)
- [FSM](../../03-architecture/specs/goals/G-CORE-055/G-CORE-055-fsm-runtime-spec.md)
- [Threat model](../../03-architecture/specs/goals/G-CORE-055/G-CORE-055-threat-model.md)
- [Worktree plan](../../03-architecture/specs/goals/G-CORE-055/G-CORE-055-worktree-plan.md)
