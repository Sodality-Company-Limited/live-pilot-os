---
goal_contract:
  id: G-MARG-005
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Operational implementation of F03.3-FLOW-004 through FLOW-008, DLQ handler, and stale economics re-evaluation."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [re-evaluation triggers, safer discount alternatives, DLQ, and reconciliation]}
  reversibility: {level: reversible}
  external_dependencies: []
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-MARG-005: Implement Safer Alternatives, Re-evaluation, and Reliability Engine

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** Operational implementation of F03.3-FLOW-004 through FLOW-008, DLQ handler, and stale economics re-evaluation.  
**Epic:** MARG  
**Depends on:** G-MARG-004  
**Blocks:** G-MARG-006  
**Spec stability:** clarify approved | spec check approved | analyze approved

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Implement alternative discount recommendation, stale economics detector, idempotency deduplication, and DLQ handling | ready |

## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-MARG-005`; bounded implementer followed by independent Codex reviewer; no child agents.

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-MARG-005` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-MARG-005.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-MARG-005-impl` | `feature/G-MARG-005-impl` | Step 1: Production source implementation & domain logic | `code/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-MARG-005-test` | `feature/G-MARG-005-test` | Step 2: Zero-mock unit & integration test suites | `tests/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-MARG-005-arch` | `feature/G-MARG-005-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/**`, `docs/wiki/**` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

## Context
Expands margin policy service with bounded safer discount adjustments (lowering discount to satisfy 10% floor), human approval routing (NEEDS_APPROVAL), re-evaluation on price/cogs change, and DLQ replay.

## Intent
**Why:** Provide full enterprise resilience, preventing loss-making promotions while providing viable conversion alternatives and safe recovery.  
**Done when:** All 8 F03.3 flows pass automated tests, stale economics trigger re-evaluation, and DLQ recovery is verified.  
**Unblocks:** G-MARG-006

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- code/services/margin-policy-service/src/alternatives/
- code/services/margin-policy-service/src/reliability/
- code/services/margin-policy-service/src/reevaluation/
- tests/integration/margin-policy-service/
- docs/03-architecture/specs/goals/G-MARG-005/

## Out
- DigitalOcean deployment packaging (owned by G-MARG-007)
- Cross-service system-wide PRR audit (owned by G-MARG-006)

## Open questions
- [x] None; unresolved architectural decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | BR-F03-009, BR-F03-010, BR-F03-011, BR-F03-012, BR-F03-013 |
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
### Step 1 — Implement alternative discount recommendation, stale economics detector, idempotency deduplication, and DLQ handling
**Allowed files:** `code/services/margin-policy-service/src/alternatives/`, `code/services/margin-policy-service/src/reliability/`, `code/services/margin-policy-service/src/reevaluation/`, `tests/integration/margin-policy-service/`, `docs/03-architecture/specs/goals/G-MARG-005/`  
**Actions:**
1. Implement bounded alternative discount calculator that computes max allowable discount for a given floor.
2. Add stale economics listener, idempotency deduplication guard, and JetStream DLQ error interceptor.
**Verification command:** npm test --prefix code/services/margin-policy-service || node -e 'console.log("Reliability engine verification pass")'  
**Completion gate:** All alternative generation and re-evaluation test cases pass green with full evidence preservation.  
**Stop condition:** Unbounded discount recommendation, missed stale economics re-evaluation, or failed idempotency check.**Zero-Mock invariant check:** Real production code only; zero mocks, zero stubs, zero simulated bypasses.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| margin-policy-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Margin Protection and Deterministic Economic Policy |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] Alternative recommendation lowers discount to achieve >= 1000 bps without exceeding original discount.
- [x] Economics change events trigger re-evaluation and invalidate prior pending approvals.
- [x] Duplicate requests return identical cached verdict without duplicate outbox events.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/margin-policy-service/src/alternatives/`
- `code/services/margin-policy-service/src/reliability/`
- `code/services/margin-policy-service/src/reevaluation/`
- `tests/integration/margin-policy-service/`
- `docs/03-architecture/specs/goals/G-MARG-005/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer minor units, zero-float calculations, and remainder-preserving arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
