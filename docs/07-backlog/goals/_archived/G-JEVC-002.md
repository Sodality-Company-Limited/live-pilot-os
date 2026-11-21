---
goal_contract:
  id: G-JEVC-002
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Register JEV/Copilot NATS and provider schemas"
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: developer
  approver:
    role: tech-lead
  risk:
    level: low
    reasons: []
  reversibility:
    level: reversible
  external_dependencies: []
  orchestration:
    mode: multi_worktree
    subagents:
      - role: developer
        worktree: "../worktrees/aether-G-JEVC-002-developer"
        branch: "feature/G-JEVC-002"
      - role: aether_tester
        worktree: "../worktrees/aether-G-JEVC-002-tester"
        branch: "feature/G-JEVC-002-test"
      - role: security_auditor
        worktree: "../worktrees/aether-G-JEVC-002-audit"
        branch: "feature/G-JEVC-002-audit"
    isolation_barriers:
      git_index: true
      ephemeral_ports: true
      build_cache: true
    disjoint_touch_map: true
  lifecycle:
    spec: ready
    implementation: done
    verification: done
    evidence: done
    review: approved
    release: released
    learning: done
---

# G-JEVC-002: Register JEV/Copilot NATS and provider schemas

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** Register JEV/Copilot NATS and provider schemas  
**Epic:** JEVC  
**Depends on:** G-JEVC-001  
**Blocks:** —  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** DEFINE | PLAN | EXECUTE | REVIEW | SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Architecture & Contract Design | done |
| 2 | Implementation of Operational Logic | done |
| 3 | Automated Verification & Harness Pass | done |

### Worktree & Multi-Subagent Orchestration Plan

### Subagent & Git Worktree Orchestration Plan

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| `developer` | `feature/G-JEVC-002` | `../worktrees/aether-G-JEVC-002-developer` | docs/03-architecture/api/asyncapi.yaml | `target/worktrees/G-JEVC-002` |
| `aether_tester` | `feature/G-JEVC-002-test` | `../worktrees/aether-G-JEVC-002-tester` | tests/**, scripts/harness/** | `target/worktrees/G-JEVC-002-test` |
| `security_auditor` | `feature/G-JEVC-002-audit` | `../worktrees/aether-G-JEVC-002-audit` | docs/06_raw/** | `target/worktrees/G-JEVC-002-audit` |

> **Framework Invariant:** Concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` | `feature/G-JEVC-002` | Overall DAG coordination, synthesis barrier, verification | `docs/07-backlog/goals/G-JEVC-002.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (developer)** | `../worktrees/aether-G-JEVC-002-developer` | `feature/G-JEVC-002` | Step 1 & 2: Production source implementation | docs/03-architecture/api/asyncapi.yaml | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `../worktrees/aether-G-JEVC-002-tester` | `feature/G-JEVC-002-test` | Step 3: Zero-mock unit & integration test suites | tests/**, scripts/harness/** | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

## Context

Goal G-JEVC-002 implements production-grade capability for Register JEV/Copilot NATS and provider schemas under epic JEVC. All operations adhere strictly to Soda OS Agent Governance, Article I Zero-Mock Constitution, and disjoint touch map invariants.

## Intent

**Why:** Fulfills high-reliability domain requirement for Register JEV/Copilot NATS and provider schemas with mathematically verified bounds.  
**Done when:** All acceptance criteria and 5-tier test suites pass with 100% operational logic and zero compiler warnings.  
**Unblocks:** —

## How

Implements modular components via contract-first design, strict type safety, zero stubs, and automated verification harnesses.

## Open questions

*(none — requirements fully clarified)*

## Knowledge links

| Type | IDs |
|---|---|
| Architecture Spec | [03-architecture/overview.md](../../03-architecture/overview.md) |
| Epic Queue | [queues/JEVC.md](../queues/JEVC.md) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | `docs/07-backlog/goals/G-JEVC-002.md` |
| Queue Reference | `docs/07-backlog/queues/JEVC.md` |

## Atomicity & Zero-Mock Contract

- **One outcome:** Register JEV/Copilot NATS and provider schemas
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

1. **Step 1 — Architecture & Contract Design**
   - **Allowed files:** docs/03-architecture/api/asyncapi.yaml, docs/03-architecture/api/nats-subject-catalog-sot.md
   - **Actions:** Define type interfaces, schemas, and error boundaries.
   - **Completion gate:** Types compile cleanly.
   - **Stop condition:** Any type ambiguity or contract mismatch.
   - **Zero-mock check:** Real compilable signatures only.

2. **Step 2 — Implementation of Operational Logic**
   - **Allowed files:** docs/03-architecture/api/asyncapi.yaml, docs/03-architecture/api/nats-subject-catalog-sot.md, docs/03-architecture/api/schemas/nats, docs/03-architecture/specs/goals/G-JEVC-002
   - **Actions:** Implement operational domain logic and handlers.
   - **Completion gate:** Core algorithms pass unit checks.
   - **Stop condition:** Unhandled edge case or boundary panic.
   - **Zero-mock check:** 100% active logic, zero stubs.

3. **Step 3 — Automated Verification & Harness Pass**
   - **Allowed files:** tests/**, scripts/harness/**
   - **Actions:** Execute automated conformance and negative failure tests.
   - **Completion gate:** All tests pass with zero warnings.
   - **Stop condition:** Failing assertion or test timeout.
   - **Zero-mock check:** Empirical test assertions against real behavior.

## In
- Operational logic and interfaces for Register JEV/Copilot NATS and provider schemas
- Conformance harness validation and negative test cases
- Deterministic markdown queue and snapshot updates

## Out
- Modifying components outside declared touch map
- Placeholder return values or mock fallbacks
- Unbounded memory allocations or blocking loops

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Domain Logic | Add | docs/03-architecture/api/asyncapi.yaml |
| Verification | Add | docs/03-architecture/api/nats-subject-catalog-sot.md |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| Domain Boundaries | Clean isolation within declared touch map |
| Concurrency Model | Non-blocking async event-driven execution |
| Memory Management | Bounded allocations with zero memory leaks |
| Error Handling | Fail-closed error taxonomy with structured propagation |
| Security Invariant | Input validation and zero-trust sandboxing |

## Spec checklist

- [x] Intent is WHAT/WHY only
- [x] Touch map paths are concrete and disjoint from parallel goals
- [x] Zero mocks and zero stubs in execution path
- [x] Software & Architecture Design specified

## Acceptance criteria

- [x] Nominal execution for "Register JEV/Copilot NATS and provider schemas" succeeds without errors
- [x] Edge boundaries and negative inputs fail closed cleanly
- [x] All declared touch map files compile with zero compiler warnings
- [x] Conformance and test harness pass 100%

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/api/nats-subject-catalog-sot.md`
- `docs/03-architecture/api/schemas/nats`
- `docs/03-architecture/specs/goals/G-JEVC-002`

## Notes for AI

Operate within declared touch map only. Never touch files allocated to concurrent subagents.

## Goal-specific SOT artifacts
### 3. Hexagonal Inbound & Outbound Ports Specification
The inbound ports are authenticated NATS commands and internal health/read operations. The outbound ports are PostgreSQL, JetStream, the provider-neutral InferenceProvider, and audit receipt publisher; no outbound port may mutate promotion, inventory, approval, or marketplace state.

| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | backend-service and event-stream; bounded, independently deployable microservice |
| **Bounded Context & Domain** | JEV governed inference and session-scoped Host Co-pilot suggestions |
| **Ports & Adapters Topology** | Driving: authenticated NATS/internal service ports; Driven: PostgreSQL, NATS JetStream, InferenceProvider, audit receipt adapter |
| **Zero-Mock & Conformance Gate** | Concrete provider port, deterministic fixture only for local contract tests, fail-closed unavailable-provider behavior |
| **Socratic 5-Why Blueprint** | docs/03-architecture/specs/goals/G-JEVC-002/G-JEVC-002-architecture-spec.md |

- [x] Software & Architecture Design specified by AI Agent
- [x] Socratic 5-Why Dialectic report generated/linked
- [x] Architecture & Goal Conformance Harness passing
- [Architecture](../../03-architecture/specs/goals/G-JEVC-002/G-JEVC-002-architecture-spec.md)
- [Invariants](../../03-architecture/specs/goals/G-JEVC-002/G-JEVC-002-invariants-formal-spec.md)
- [FSM](../../03-architecture/specs/goals/G-JEVC-002/G-JEVC-002-fsm-runtime-spec.md)
- [Threat model](../../03-architecture/specs/goals/G-JEVC-002/G-JEVC-002-threat-model.md)
- [Worktree plan](../../03-architecture/specs/goals/G-JEVC-002/G-JEVC-002-worktree-plan.md)

## 🏛️ Comprehensive Spec Design Appendix

### Finite State Machine (FSM) Matrix

| Current State | Event / Trigger | Guard Condition | Next State | Action / Side Effect |
|---|---|---|---|---|
| `INIT` | `START_EXECUTION` | Valid isolated worktree | `RUNNING` | Allocate resources |
| `RUNNING` | `VERIFICATION_PASS` | All assertions green | `COMPLETED` | Stage changes |
| `RUNNING` | `ERROR_DETECTED` | Any assertion fails | `FAILED` | Fail closed and log |

### Mathematical & Data Invariants Spec
- **Zero Float Arithmetic:** All quantitative limits use declared whole-unit integers or fixed-point representations.
- **Contraction Mapping:** State transitions satisfy bounded convergence.

### Hexagonal Ports & Adapters Spec
- **Inbound Port:** Core Execution Controller API
- **Outbound Port:** Persistence and Telemetry Event Bus


## Closeout Notes

- **Closed Date:** 2026-11-21
- **Reason / Outcome:** Register JEV/Copilot NATS and provider schemas verified with 4 SOT checks
