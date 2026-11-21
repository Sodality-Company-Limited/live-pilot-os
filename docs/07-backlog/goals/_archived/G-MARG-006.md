---
goal_contract:
  id: G-MARG-006
  version: 2
  kind: chore
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Full service-level test suite passing 100% green, SOT traceability verified, and audit receipts emitted."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: medium, reasons: [architecture gates, traceability verification, and zero-mock guarantee]}
  reversibility: {level: reversible}
  external_dependencies: []
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-MARG-006: Execute Service-Level Tests and Architectural Verification Gates

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** chore  
**Atomic outcome:** Full service-level test suite passing 100% green, SOT traceability verified, and audit receipts emitted.  
**Epic:** MARG  
**Depends on:** G-MARG-005  
**Blocks:** G-MARG-007  
**Spec stability:** clarify approved | spec check approved | analyze approved

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Run comprehensive unit, integration, property-based math, and architecture verification gates | ready |

## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-MARG-006`; bounded implementer followed by independent Codex reviewer; no child agents.

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-MARG-006` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-MARG-006.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-MARG-006-impl` | `feature/G-MARG-006-impl` | Step 1: Production source implementation & domain logic | `code/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-MARG-006-test` | `feature/G-MARG-006-test` | Step 2: Zero-mock unit & integration test suites | `tests/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-MARG-006-arch` | `feature/G-MARG-006-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/**`, `docs/wiki/**` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

## Context
Executes rigorous quality gates including mathematical proof invariants, zero-mock scans, API SOT traceability, and error registry validation.

## Intent
**Why:** Guarantee margin-policy-service is defect-free, mathematically sound, and compliant with all Soda OS governance invariants.  
**Done when:** All tests, property invariant checks, and architectural SOT checkers pass with 0 errors and 0 warnings.  
**Unblocks:** G-MARG-007

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- tests/margin-policy-service/
- artifacts/proofs/G-MARG-006-audit-receipt.json
- docs/03-architecture/specs/goals/G-MARG-006/

## Out
- Production deployment execution (owned by G-MARG-007)

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
### Step 1 — Run comprehensive unit, integration, property-based math, and architecture verification gates
**Allowed files:** `tests/margin-policy-service/`, `artifacts/proofs/G-MARG-006-audit-receipt.json`, `docs/03-architecture/specs/goals/G-MARG-006/`  
**Actions:**
1. Run property-invariant harness verifying margin conservation and monotonicity across 10,000 random inputs.
2. Execute architectural SOT traceability and error registry conformance checkers.
**Verification command:** node scripts/contract-check/error-code-registry.mjs && node scripts/architecture/check-sot.mjs  
**Completion gate:** 100% test pass rate, zero floating-point occurrences in financial code, and all architectural gates green.  
**Stop condition:** Any failing test, unmapped error code, or broken SOT traceability link.**Zero-Mock invariant check:** Real production code only; zero mocks, zero stubs, zero simulated bypasses.

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
- [x] Unit and integration test suites achieve >= 90% branch coverage with zero mocks.
- [x] Property invariant harness confirms net_margin + cogs + fees + discount == original_price across all scales.
- [x] Error code registry and architecture check scripts pass with zero errors.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `tests/margin-policy-service/`
- `artifacts/proofs/G-MARG-006-audit-receipt.json`
- `docs/03-architecture/specs/goals/G-MARG-006/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer minor units, zero-float calculations, and remainder-preserving arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
