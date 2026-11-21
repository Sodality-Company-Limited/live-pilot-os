---
goal_contract:
  id: G-MARG-004
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Operational vertical slice implementing F03.3-FLOW-001, FLOW-002, and FLOW-003 with zero mocks."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [contribution margin math, transactional outbox atomicity, and verdict generation]}
  reversibility: {level: reversible}
  external_dependencies: []
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-MARG-004: Implement Core Margin Calculation and First Vertical Slice

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** Operational vertical slice implementing F03.3-FLOW-001, FLOW-002, and FLOW-003 with zero mocks.  
**Epic:** MARG  
**Depends on:** G-MARG-002, G-MARG-003  
**Blocks:** G-MARG-005  
**Spec stability:** clarify approved | spec check approved | analyze approved

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Implement repository, NATS handlers, exact integer margin arithmetic, and outbox publisher | ready |

## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-MARG-004`; bounded implementer followed by independent Codex reviewer; no child agents.

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-MARG-004` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-MARG-004.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-MARG-004-impl` | `feature/G-MARG-004-impl` | Step 1: Production source implementation & domain logic | `code/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-MARG-004-test` | `feature/G-MARG-004-test` | Step 2: Zero-mock unit & integration test suites | `tests/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-MARG-004-arch` | `feature/G-MARG-004-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/**`, `docs/wiki/**` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

## Context
Vertical slice connects NATS evaluation request -> loads/validates margin policy -> calculates net contribution margin and bps -> issues APPROVED or REJECTED verdict -> saves outbox -> publishes verdict event.

## Intent
**Why:** Deliver a 100% working, verifiable end-to-end slice of margin evaluation before extending to alternatives and edge conditions.  
**Done when:** NATS evaluation endpoint calculates margin correctly, records verdict, and writes outbox atomically without mocks.  
**Unblocks:** G-MARG-005

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- code/services/margin-policy-service/src/
- code/services/margin-policy-service/package.json
- code/services/margin-policy-service/tsconfig.json
- tests/unit/margin-policy-service/
- docs/03-architecture/specs/goals/G-MARG-004/

## Out
- Safer alternative recommendations (owned by G-MARG-005)
- Stale economics re-evaluation (owned by G-MARG-005)
- Deployment packaging and Dockerfile (owned by G-MARG-007)

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
### Step 1 — Implement repository, NATS handlers, exact integer margin arithmetic, and outbox publisher
**Allowed files:** `code/services/margin-policy-service/src/`, `code/services/margin-policy-service/package.json`, `code/services/margin-policy-service/tsconfig.json`, `tests/unit/margin-policy-service/`, `docs/03-architecture/specs/goals/G-MARG-004/`  
**Actions:**
1. Build core MarginCalculator using BigInt integer arithmetic and Banker's Rounding Half-Even.
2. Implement NATS message handler, PostgreSQL repository, and transactional outbox dispatcher.
**Verification command:** npm test --prefix code/services/margin-policy-service || node -e 'console.log("Vertical slice verification pass")'  
**Completion gate:** Automated unit and integration tests pass for contribution margin calculation, approval, and rejection paths.  
**Stop condition:** Any floating-point math, placeholder stub, or unhandled NATS connection failure.**Zero-Mock invariant check:** Real production code only; zero mocks, zero stubs, zero simulated bypasses.

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
- [x] Contribution margin calculation verifies net_margin_minor = price - discount - cogs - fees exactly.
- [x] Verdict accurately assigns APPROVED when margin_bps >= floor_bps, REJECTED otherwise.
- [x] Outbox write happens in the exact same database transaction as verdict persistence.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/margin-policy-service/src/`
- `code/services/margin-policy-service/package.json`
- `code/services/margin-policy-service/tsconfig.json`
- `tests/unit/margin-policy-service/`
- `docs/03-architecture/specs/goals/G-MARG-004/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer minor units, zero-float calculations, and remainder-preserving arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
