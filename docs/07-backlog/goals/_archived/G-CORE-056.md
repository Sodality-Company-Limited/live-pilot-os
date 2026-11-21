---
goal_contract:
  id: G-CORE-056
  version: 2
  kind: chore
  status: done
  profiles: [core, deployment]
  atomicity:
    outcome_count: 1
    primary_outcome: "one independently verifiable session-service outcome"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: critical, reasons: [production deployment and infrastructure]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-050, G-CORE-051, G-CORE-052, G-CORE-053, G-CORE-054, G-CORE-055]
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-056: Deploy session-service to DigitalOcean
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** chore  
**Atomic outcome:** A human-approved DigitalOcean deployment receipt for the independently verified session-service.  
**Epic:** CORE  
**Depends on:** G-CORE-050…G-CORE-055  
**Traceability:** `deployment/README.md`; `digitalocean-droplets-sot.md`; `deployment-pipeline-sot.md`; `migration-rollback-sot.md`

## In
- Declarative deployment, private networking, secrets injection, immutable image and migration references, health/smoke/observability evidence, rollback reference, and release receipt.

## Out
- Production deployment of other services, topology expansion, console-only changes, and automatic approval.

## Work steps
### Step 1 — prepare, obtain approval, and verify the release
**Allowed files:** goal-scoped files declared in the touch map
**Actions:**
1. Prepare the declarative release, obtain approval, run smoke/rollback evidence, and write the receipt.
2. Record reproducible evidence and stop on any failed gate.
**Allowed files:** `infra/`, `scripts/`, `docs/03-architecture/deployment/`, `docs/03-architecture/specs/goals/G-CORE-056/`, release evidence  
**Verification command:** deployment pipeline and service smoke commands recorded in the release receipt  
**Completion gate:** Human approval is recorded; private ingress, migration safety, health, smoke, telemetry, rollback, and exact image/config/source provenance are verified.  
**Stop condition:** failed gate, missing rollback, public data/messaging port, stale proof receipt, or absent human approval.

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
Single worktree on feature/G-CORE-056; no subagents; disjoint touch map only.

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
| **Epic & Integration Branch** | feature/G-CORE-056 |
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

- [ ] Deployment is declarative, private, non-root, resource-bounded, and labeled as single-Droplet SPOF if applicable.
- [ ] Health, lifecycle smoke, logs/metrics/traces, backup/restore posture, and rollback evidence are attached.
- [ ] Receipt records environment, release ID, image digest, source revision, migration/config versions, operator, approval, timestamps, and result.

## Touch map
- `infra/`
- `scripts/`
- `docs/03-architecture/deployment/`
- `docs/03-architecture/specs/goals/G-CORE-056/`

## Test plan
All standard SOT/contract/security checks, signed image/provenance validation, deployment smoke, failure injection, rollback rehearsal, and post-deploy verification.

## Satellite specifications
- [Architecture](../../03-architecture/specs/goals/G-CORE-056/G-CORE-056-architecture-spec.md)
- [Invariants](../../03-architecture/specs/goals/G-CORE-056/G-CORE-056-invariants-formal-spec.md)
- [FSM](../../03-architecture/specs/goals/G-CORE-056/G-CORE-056-fsm-runtime-spec.md)
- [Threat model](../../03-architecture/specs/goals/G-CORE-056/G-CORE-056-threat-model.md)
- [Worktree plan](../../03-architecture/specs/goals/G-CORE-056/G-CORE-056-worktree-plan.md)
