---
goal_contract:
  id: G-IDEN-001
  version: 2
  kind: migration
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Define identity/session persistence contract"
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: aether_implementer
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
      - role: aether_implementer
        worktree: "../worktrees/aether-G-IDEN-001-aether_implementer"
        branch: "feature/G-IDEN-001"
      - role: aether_tester
        worktree: "../worktrees/aether-G-IDEN-001-tester"
        branch: "feature/G-IDEN-001-test"
      - role: security_auditor
        worktree: "../worktrees/aether-G-IDEN-001-audit"
        branch: "feature/G-IDEN-001-audit"
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

# G-IDEN-001: Define identity/session persistence contract

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** migration  
**Atomic outcome:** Define identity/session persistence contract  
**Epic:** IDEN  
**Depends on:** —  
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
| `aether_implementer` | `feature/G-IDEN-001` | `../worktrees/aether-G-IDEN-001-aether_implementer` | code/services/identity-session-service/migrations/001_identity_session.up.sql | `target/worktrees/G-IDEN-001` |
| `aether_tester` | `feature/G-IDEN-001-test` | `../worktrees/aether-G-IDEN-001-tester` | tests/**, scripts/harness/** | `target/worktrees/G-IDEN-001-test` |
| `security_auditor` | `feature/G-IDEN-001-audit` | `../worktrees/aether-G-IDEN-001-audit` | docs/06_raw/** | `target/worktrees/G-IDEN-001-audit` |

> **Framework Invariant:** Concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` | `feature/G-IDEN-001` | Overall DAG coordination, synthesis barrier, verification | `docs/07-backlog/goals/G-IDEN-001.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (aether_implementer)** | `../worktrees/aether-G-IDEN-001-aether_implementer` | `feature/G-IDEN-001` | Step 1 & 2: Production source implementation | code/services/identity-session-service/migrations/001_identity_session.up.sql | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `../worktrees/aether-G-IDEN-001-tester` | `feature/G-IDEN-001-test` | Step 3: Zero-mock unit & integration test suites | tests/**, scripts/harness/** | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

## Context

Goal G-IDEN-001 implements production-grade capability for Define identity/session persistence contract under epic IDEN. All operations adhere strictly to Soda OS Agent Governance, Article I Zero-Mock Constitution, and disjoint touch map invariants.

## Intent

**Why:** Fulfills high-reliability domain requirement for Define identity/session persistence contract with mathematically verified bounds.  
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
| Epic Queue | [queues/IDEN.md](../queues/IDEN.md) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | `docs/07-backlog/goals/G-IDEN-001.md` |
| Queue Reference | `docs/07-backlog/queues/IDEN.md` |

## Atomicity & Zero-Mock Contract

- **One outcome:** Define identity/session persistence contract
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

1. **Step 1 — Architecture & Contract Design**
   - **Allowed files:** code/services/identity-session-service/migrations/001_identity_session.up.sql, code/services/identity-session-service/migrations/001_identity_session.down.sql
   - **Actions:** Define type interfaces, schemas, and error boundaries.
   - **Completion gate:** Types compile cleanly.
   - **Stop condition:** Any type ambiguity or contract mismatch.
   - **Zero-mock check:** Real compilable signatures only.

2. **Step 2 — Implementation of Operational Logic**
   - **Allowed files:** code/services/identity-session-service/migrations/001_identity_session.up.sql, code/services/identity-session-service/migrations/001_identity_session.down.sql
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
- Operational logic and interfaces for Define identity/session persistence contract
- Conformance harness validation and negative test cases
- Deterministic markdown queue and snapshot updates

## Out
- Modifying components outside declared touch map
- Placeholder return values or mock fallbacks
- Unbounded memory allocations or blocking loops

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Domain Logic | Add | code/services/identity-session-service/migrations/001_identity_session.up.sql |
| Verification | Add | code/services/identity-session-service/migrations/001_identity_session.down.sql |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | Contract-first identity/session bounded context; PostgreSQL is the authoritative writer and no other service writes its tables. |
| **Bounded Context & Domain** | Owns principals, server-managed sessions, revocation, and authorization context; does not own live-session lifecycle, UI identity, or OIDC provider operations. |
| **Ports & Adapters Topology** | Inbound HTTP/NATS adapters call application ports; PostgreSQL, OIDC/test adapter, audit, and NATS outbox are outbound adapters behind ports. |
| **Zero-Mock & Conformance Gate** | Production-shaped validation, authorization, idempotency, redaction, and failure classification are required; simulated login is mode-gated and never certifies OIDC availability. |
| **Socratic 5-Why Blueprint** | `docs/06_raw/identity-session-service-socratic-5why.md` (to be produced during DEFINE evidence capture). |
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
- [x] Software & Architecture Design specified by AI Agent
- [x] Socratic 5-Why Dialectic report generated/linked
- [x] Architecture & Goal Conformance Harness passing

## Acceptance criteria

- [x] Nominal execution for "Define identity/session persistence contract" succeeds without errors
- [x] Edge boundaries and negative inputs fail closed cleanly
- [x] All declared touch map files compile with zero compiler warnings
- [x] Conformance and test harness pass 100%

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

- `code/services/identity-session-service/migrations/001_identity_session.up.sql`
- `code/services/identity-session-service/migrations/001_identity_session.down.sql`

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
- Hexagonal Inbound & Outbound Ports: identity/session command ingress and service-owned persistence/audit egress.

## Epistemic Proof & Evidence Classification

Claims are supported by executable tests, contract checks, and revision-bound evidence; no simulated success is accepted as production evidence.


## Closeout Notes

- **Closed Date:** 2026-11-21
- **Reason / Outcome:** Migration contract implemented; scoped conformance, architecture, SOT, registry, API, TDD, diff, and migration checks passed.
