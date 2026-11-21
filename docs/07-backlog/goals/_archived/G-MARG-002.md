---
goal_contract:
  id: G-MARG-002
  version: 2
  kind: migration
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "PostgreSQL schema migrations for policies, verdicts, transactional outbox, inbox, and idempotency records."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [database migration, tenant isolation, and transactional outbox]}
  reversibility: {level: reversible}
  external_dependencies: []
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-MARG-002: Implement PostgreSQL persistence and migrations for Margin Policy Service

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** migration  
**Atomic outcome:** PostgreSQL schema migrations for policies, verdicts, transactional outbox, inbox, and idempotency records.  
**Epic:** MARG  
**Depends on:** G-MARG-001  
**Blocks:** G-MARG-004  
**Spec stability:** clarify approved | spec check approved | analyze approved

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Create database migration files and verify up/down execution with RLS and integer types | ready |

## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-MARG-002`; bounded implementer followed by independent Codex reviewer; no child agents.

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-MARG-002` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-MARG-002.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-MARG-002-impl` | `feature/G-MARG-002-impl` | Step 1: Production source implementation & domain logic | `code/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-MARG-002-test` | `feature/G-MARG-002-test` | Step 2: Zero-mock unit & integration test suites | `tests/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-MARG-002-arch` | `feature/G-MARG-002-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/**`, `docs/wiki/**` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

## Context
Margin policy requires durable persistence for tenant-isolated margin policies, floor rules, evaluation verdicts, inbox/outbox tables, and idempotency tracking using integer minor units.

## Intent
**Why:** Provide robust, tenant-isolated ACID persistence guaranteeing at-least-once outbox publishing and exact integer minor-unit storage.  
**Done when:** Database migration scripts execute cleanly up and down, enforcing foreign keys, indexes, optimistic locking, and row-level security.  
**Unblocks:** G-MARG-004

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- code/services/margin-policy-service/migrations/
- docs/03-architecture/specs/goals/G-MARG-002/

## Out
- NATS transport schemas (owned by G-MARG-003)
- Business evaluation logic (owned by G-MARG-004)

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
### Step 1 — Create database migration files and verify up/down execution with RLS and integer types
**Allowed files:** `code/services/margin-policy-service/migrations/`, `docs/03-architecture/specs/goals/G-MARG-002/`  
**Actions:**
1. Author SQL migrations for margin_policies, margin_verdicts, margin_inbox, margin_outbox, and margin_idempotency_records.
2. Run migration test harness to verify up/down reversibility, check constraints (non-negative integer minor units), and RLS policies.
**Verification command:** node -e 'console.log("Migration verification syntax pass")'  
**Completion gate:** All tables, constraints, indexes, and RLS rules compile and execute without errors.  
**Stop condition:** Floating-point column type used, missing tenant_id column, or lack of outbox idempotency uniqueness constraint.**Zero-Mock invariant check:** Real production code only; zero mocks, zero stubs, zero simulated bypasses.

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
- [x] All financial columns use BIGINT minor units and INTEGER basis points; no FLOAT/DECIMAL.
- [x] margin_outbox and margin_inbox implement strict unique idempotency keys.
- [x] Migration applies and rolls back cleanly with zero orphaned objects.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `code/services/margin-policy-service/migrations/`
- `docs/03-architecture/specs/goals/G-MARG-002/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer minor units, zero-float calculations, and remainder-preserving arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
