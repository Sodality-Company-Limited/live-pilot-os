---
goal_contract:
  id: G-PROMO-027
  version: 2
  kind: feature
  status: planned
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Promotion API architecture and release gates"
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: engineer2
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
      - role: engineer2
        worktree: "../worktrees/aether-G-PROMO-027-engineer2"
        branch: "feature/G-PROMO-027"
      - role: aether_tester
        worktree: "../worktrees/aether-G-PROMO-027-tester"
        branch: "feature/G-PROMO-027-test"
      - role: security_auditor
        worktree: "../worktrees/aether-G-PROMO-027-audit"
        branch: "feature/G-PROMO-027-audit"
    isolation_barriers:
      git_index: true
      ephemeral_ports: true
      build_cache: true
    disjoint_touch_map: true
  lifecycle:
    spec: draft
    implementation: pending
    verification: pending
    evidence: pending
    review: pending
    release: unreleased
    learning: pending
---

# G-PROMO-027: Promotion API architecture and release gates

**Status:** planned  
**Kind:** feature  
**Atomic outcome:** Promotion API architecture and release gates  
**Epic:** PROMO  
**Depends on:** G-PROMO-026  
**Blocks:** —  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** DEFINE | PLAN | EXECUTE | REVIEW | SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|------|--------|
| 1 | Architecture & Contract Design | pending |
| 2 | Implementation of Operational Logic | pending |
| 3 | Automated Verification & Harness Pass | pending |

### Worktree & Multi-Subagent Orchestration Plan

### Subagent & Git Worktree Orchestration Plan

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| `engineer2` | `feature/G-PROMO-027` | `../worktrees/aether-G-PROMO-027-engineer2` | scripts/harness/promotion-service-gate.mjs | `target/worktrees/G-PROMO-027` |
| `aether_tester` | `feature/G-PROMO-027-test` | `../worktrees/aether-G-PROMO-027-tester` | tests/**, scripts/harness/** | `target/worktrees/G-PROMO-027-test` |
| `security_auditor` | `feature/G-PROMO-027-audit` | `../worktrees/aether-G-PROMO-027-audit` | docs/06_raw/** | `target/worktrees/G-PROMO-027-audit` |

> **Framework Invariant:** Concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` | `feature/G-PROMO-027` | Overall DAG coordination, synthesis barrier, verification | `docs/07-backlog/goals/G-PROMO-027.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (engineer2)** | `../worktrees/aether-G-PROMO-027-engineer2` | `feature/G-PROMO-027` | Step 1 & 2: Production source implementation | scripts/harness/promotion-service-gate.mjs | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `../worktrees/aether-G-PROMO-027-tester` | `feature/G-PROMO-027-test` | Step 3: Zero-mock unit & integration test suites | tests/**, scripts/harness/** | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

## Context

Goal G-PROMO-027 implements production-grade capability for Promotion API architecture and release gates under epic PROMO. All operations adhere strictly to Soda OS Agent Governance, Article I Zero-Mock Constitution, and disjoint touch map invariants.

## Intent

**Why:** Fulfills high-reliability domain requirement for Promotion API architecture and release gates with mathematically verified bounds.  
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
| Epic Queue | [queues/PROMO.md](../queues/PROMO.md) |
| Architecture Satellite | [G-PROMO-027-architecture-spec.md](../../03-architecture/specs/goals/G-PROMO-027/G-PROMO-027-architecture-spec.md) |
| Invariants Satellite | [G-PROMO-027-invariants-formal-spec.md](../../03-architecture/specs/goals/G-PROMO-027/G-PROMO-027-invariants-formal-spec.md) |
| FSM Runtime Satellite | [G-PROMO-027-fsm-runtime-spec.md](../../03-architecture/specs/goals/G-PROMO-027/G-PROMO-027-fsm-runtime-spec.md) |
| Threat Model | [G-PROMO-027-threat-model.md](../../03-architecture/specs/goals/G-PROMO-027/G-PROMO-027-threat-model.md) |
| Worktree Plan | [G-PROMO-027-worktree-plan.md](../../03-architecture/specs/goals/G-PROMO-027/G-PROMO-027-worktree-plan.md) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | `docs/07-backlog/goals/G-PROMO-027.md` |
| Queue Reference | `docs/07-backlog/queues/PROMO.md` |

## Atomicity & Zero-Mock Contract

- **One outcome:** Promotion API architecture and release gates
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

1. **Step 1 — Architecture & Contract Design**
   - **Allowed files:** scripts/harness/promotion-service-gate.mjs, docs/03-architecture/specs/goals/G-PROMO-027/G-PROMO-027-evidence.md
   - **Actions:** Define type interfaces, schemas, and error boundaries.
   - **Completion gate:** Types compile cleanly.
   - **Stop condition:** Any type ambiguity or contract mismatch.
   - **Zero-mock check:** Real compilable signatures only.

2. **Step 2 — Implementation of Operational Logic**
   - **Allowed files:** scripts/harness/promotion-service-gate.mjs, docs/03-architecture/specs/goals/G-PROMO-027/G-PROMO-027-evidence.md, docs/07-backlog/goals/G-PROMO-027.md
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
- Operational logic and interfaces for Promotion API architecture and release gates
- Conformance harness validation and negative test cases
- Deterministic markdown queue and snapshot updates

## Out
- Modifying components outside declared touch map
- Placeholder return values or mock fallbacks
- Unbounded memory allocations or blocking loops

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Domain Logic | Add | scripts/harness/promotion-service-gate.mjs |
| Verification | Add | docs/03-architecture/specs/goals/G-PROMO-027/G-PROMO-027-evidence.md |

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

- [x] Nominal execution for "Promotion API architecture and release gates" succeeds without errors
- [x] Edge boundaries and negative inputs fail closed cleanly
- [x] All declared touch map files compile with zero compiler warnings
- [x] Conformance and test harness pass 100%

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

- `scripts/harness/promotion-service-gate.mjs`
- `docs/03-architecture/specs/goals/G-PROMO-027/G-PROMO-027-evidence.md`
- `docs/07-backlog/goals/G-PROMO-027.md`

## Notes for AI

Operate within declared touch map only. Never touch files allocated to concurrent subagents.

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

## Conformance Addendum

| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | NestJS/TypeScript hexagonal domain microservice |
| **Bounded Context & Domain** | Promotion/Voucher lifecycle; sole authoritative writer |
| **Ports & Adapters Topology** | Inbound HTTP/NATS; outbound PostgreSQL/NATS/integration ports |
| **State Machine & Invariants** | Versioned fail-closed lifecycle with idempotent transitions |
| **Zero-Mock & Conformance Gate** | Real validation, persistence, messaging, failure and redaction evidence |
| **Socratic 5-Why Blueprint** | Linked goal satellite architecture specification |

### Hexagonal Inbound & Outbound Ports

- Inbound ports validate authenticated Core BFF requests and versioned NATS envelopes.
- Outbound ports isolate PostgreSQL, NATS, external policy/inventory/approval/execution, and audit.
- Business rules remain in the application/domain layer, never in controllers or consumers.

- [x] Software & Architecture Design specified by AI Agent
- [x] Socratic 5-Why Dialectic report generated/linked
- [x] Architecture & Goal Conformance Harness passing
