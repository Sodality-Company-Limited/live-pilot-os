---
goal_contract:
  id: G-MARG-001
  version: 2
  kind: api
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "A frozen, SOT-traceable service contract and deterministic state machine for margin-policy-service."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [financial policy boundary, zero-float invariant, and state machine]}
  reversibility: {level: reversible}
  external_dependencies: []
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-MARG-001: Freeze Margin Policy Service contract and state machine

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** api  
**Atomic outcome:** A frozen, SOT-traceable service contract and deterministic state machine for margin-policy-service.  
**Epic:** MARG  
**Depends on:** —  
**Blocks:** G-MARG-002, G-MARG-003  
**Spec stability:** clarify approved | spec check approved | analyze approved

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Draft and freeze margin-policy-service contract, state machine, and error mappings | ready |

## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-MARG-001`; bounded implementer followed by independent Codex reviewer; no child agents.

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-MARG-001` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-MARG-001.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-MARG-001-impl` | `feature/G-MARG-001-impl` | Step 1: Production source implementation & domain logic | `code/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-MARG-001-test` | `feature/G-MARG-001-test` | Step 2: Zero-mock unit & integration test suites | `tests/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-MARG-001-arch` | `feature/G-MARG-001-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/**`, `docs/wiki/**` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

## Context
Margin Policy Service owns deterministic contribution margin arithmetic, versioned margin floor policies, margin verdicts (APPROVED, NEEDS_APPROVAL, REJECTED, UNKNOWN), and bounded safer discount alternatives. It does NOT own promotions, inventory, or platform mutation.

## Intent
**Why:** Establish single authoritative writer boundaries, zero-float integer math invariants, and unambiguous state machine lifecycle before writing persistence or business logic.  
**Done when:** docs/03-architecture/api/services/margin-policy-service.md defines complete ownership, commands, events, state machine, errors, and passes all API traceability and schema validation gates.  
**Unblocks:** G-MARG-002, G-MARG-003

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- docs/03-architecture/api/services/margin-policy-service.md
- docs/03-architecture/specs/goals/G-MARG-001/

## Out
- PostgreSQL schema migrations (owned by G-MARG-002)
- AsyncAPI schema files and NATS catalog registration (owned by G-MARG-003)
- Runtime service implementation (owned by G-MARG-004, G-MARG-005)

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
### Step 1 — Draft and freeze margin-policy-service contract, state machine, and error mappings
**Allowed files:** `docs/03-architecture/api/services/margin-policy-service.md`, `docs/03-architecture/specs/goals/G-MARG-001/`  
**Actions:**
1. Draft docs/03-architecture/api/services/margin-policy-service.md covering owner, resource aggregate, state machine, commands, events, idempotency, and error registry.
2. Verify that margin-policy-service contract aligns with F03.3-FLOW-001 through FLOW-008 and BR-F03-009 through BR-F03-013.
**Verification command:** node scripts/contract-check/error-code-registry.mjs  
**Completion gate:** docs/03-architecture/api/services/margin-policy-service.md is complete, valid, and aligned with all upstream SOTs.  
**Stop condition:** Ambiguous service boundary, floating-point allowance, or missing state transition definition.**Zero-Mock invariant check:** Real production code only; zero mocks, zero stubs, zero simulated bypasses.

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
- [x] docs/03-architecture/api/services/margin-policy-service.md defines single authoritative writer rules for policies and verdicts.
- [x] FSM lifecycle covers DRAFT, VALIDATED, POLICY_CHECKED, APPROVED, NEEDS_APPROVAL, REJECTED, UNKNOWN, RECONCILING, and DEAD_LETTER.
- [x] Zero-float financial arithmetic invariant (minor units + basis points) is explicitly declared.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `docs/03-architecture/api/services/margin-policy-service.md`
- `docs/03-architecture/specs/goals/G-MARG-001/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer minor units, zero-float calculations, and remainder-preserving arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
