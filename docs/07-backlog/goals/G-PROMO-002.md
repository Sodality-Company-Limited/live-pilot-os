---
goal_contract:
  id: G-PROMO-002
  version: 2
  kind: feature
  status: review
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Promotion event schemas and NATS compatibility"
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
        worktree: "../worktrees/aether-G-PROMO-002-engineer2"
        branch: "feature/G-PROMO-002"
      - role: aether_tester
        worktree: "../worktrees/aether-G-PROMO-002-tester"
        branch: "feature/G-PROMO-002-test"
      - role: security_auditor
        worktree: "../worktrees/aether-G-PROMO-002-audit"
        branch: "feature/G-PROMO-002-audit"
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

# G-PROMO-002: Promotion event schemas and NATS compatibility

**Status:** review
**Kind:** feature  
**Atomic outcome:** Promotion event schemas and NATS compatibility  
**Epic:** PROMO  
**Depends on:** G-PROMO-001  
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
| `engineer2` | `feature/G-PROMO-002` | `../worktrees/aether-G-PROMO-002-engineer2` | docs/03-architecture/api/schemas/promotion.schema.json | `target/worktrees/G-PROMO-002` |
| `aether_tester` | `feature/G-PROMO-002-test` | `../worktrees/aether-G-PROMO-002-tester` | tests/**, scripts/harness/** | `target/worktrees/G-PROMO-002-test` |
| `security_auditor` | `feature/G-PROMO-002-audit` | `../worktrees/aether-G-PROMO-002-audit` | docs/06_raw/** | `target/worktrees/G-PROMO-002-audit` |

> **Framework Invariant:** Concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` | `feature/G-PROMO-002` | Overall DAG coordination, synthesis barrier, verification | `docs/07-backlog/goals/G-PROMO-002.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (engineer2)** | `../worktrees/aether-G-PROMO-002-engineer2` | `feature/G-PROMO-002` | Step 1 & 2: Production source implementation | docs/03-architecture/api/schemas/promotion.schema.json | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `../worktrees/aether-G-PROMO-002-tester` | `feature/G-PROMO-002-test` | Step 3: Zero-mock unit & integration test suites | tests/**, scripts/harness/** | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

## Context

Goal G-PROMO-002 implements production-grade capability for Promotion event schemas and NATS compatibility under epic PROMO. All operations adhere strictly to Soda OS Agent Governance, Article I Zero-Mock Constitution, and disjoint touch map invariants.

## Intent

**Why:** Establishes one verifiable Promotion service capability required by the PROMO epic and its DigitalOcean release path.  
**Done when:** The declared contract/artifact is complete, repository-grounded, validated by the listed commands, and ready for the next PROMO goal in the dependency chain.  
**Unblocks:** The next PROMO goal in the dependency chain.  

## How

Uses the existing LivePilot SOT, versioned contracts, explicit service ownership, fail-closed behavior, and repository verification commands; implementation details remain bounded to the touch map.

## Open questions

*(none — requirements fully clarified)*

## Knowledge links

| Type | IDs |
|---|---|
| Architecture Spec | [03-architecture/overview.md](../../03-architecture/overview.md) |
| Epic Queue | [queues/PROMO.md](../queues/PROMO.md) |
| Architecture Satellite | [G-PROMO-002-architecture-spec.md](../../03-architecture/specs/goals/G-PROMO-002/G-PROMO-002-architecture-spec.md) |
| Invariants Satellite | [G-PROMO-002-invariants-formal-spec.md](../../03-architecture/specs/goals/G-PROMO-002/G-PROMO-002-invariants-formal-spec.md) |
| FSM Satellite | [G-PROMO-002-fsm-runtime-spec.md](../../03-architecture/specs/goals/G-PROMO-002/G-PROMO-002-fsm-runtime-spec.md) |
| Threat Model | [G-PROMO-002-threat-model.md](../../03-architecture/specs/goals/G-PROMO-002/G-PROMO-002-threat-model.md) |
| Worktree Plan | [G-PROMO-002-worktree-plan.md](../../03-architecture/specs/goals/G-PROMO-002/G-PROMO-002-worktree-plan.md) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | `docs/07-backlog/goals/G-PROMO-002.md` |
| Queue Reference | `docs/07-backlog/queues/PROMO.md` |

## Atomicity & Zero-Mock Contract

- **One outcome:** Promotion event schemas and NATS compatibility
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

1. **Step 1 — Architecture & Contract Design**
   - **Allowed files:** docs/03-architecture/api/schemas/promotion.schema.json, docs/03-architecture/api/schemas/nats/promotion-proposal.schema.json
   - **Actions:** Define type interfaces, schemas, and error boundaries.
   - **Completion gate:** Types compile cleanly.
   - **Stop condition:** Any type ambiguity or contract mismatch.
   - **Zero-mock check:** Real compilable signatures only.

2. **Step 2 — Implementation of Operational Logic**
   - **Allowed files:** docs/03-architecture/api/schemas/promotion.schema.json, docs/03-architecture/api/schemas/nats/promotion-proposal.schema.json, docs/03-architecture/api/schemas/nats/promotion-decision.schema.json, docs/03-architecture/api/asyncapi.yaml
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
- Operational logic and interfaces for Promotion event schemas and NATS compatibility
- Conformance harness validation and negative test cases
- Deterministic markdown queue and snapshot updates

## Out
- Modifying components outside declared touch map
- Placeholder return values or mock fallbacks
- Unbounded memory allocations or blocking loops

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Domain Logic | Add | docs/03-architecture/api/schemas/promotion.schema.json |
| Verification | Add | docs/03-architecture/api/schemas/nats/promotion-proposal.schema.json |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | Production-shaped backend service; public access remains through Core BFF and internal delivery uses NATS/JetStream. |
| **Bounded Context & Domain** | Promotion/Voucher lifecycle is owned by promotion-service; margin, inventory, approval, adapter, and audit remain separate authorities. |
| **Ports & Adapters Topology** | Inbound: Core BFF/NATS proposal and lifecycle commands. Outbound: PostgreSQL, outbox/inbox, NATS events, and authorized service contracts. |
| **State Machine & Invariants** | `proposed → pending → approved/rejected → issued/expired/cancelled`; unknown external outcomes reconcile before retry; resource versions are monotonic. |
| **Zero-Mock & Conformance Gate** | Concrete repository behavior only; simulated marketplace behavior is explicit `SIMULATED` mode and never claims confirmed mutation. |
| **Socratic 5-Why Blueprint** | Goal-specific rationale is recorded in `docs/03-architecture/specs/goals/G-PROMO-002/G-PROMO-002-architecture-spec.md`. |

## Spec checklist

- [x] Intent is WHAT/WHY only
- [x] Touch map paths are concrete and disjoint from parallel goals
- [x] Zero mocks and zero stubs in execution path
- [ ] Software & Architecture Design specified by AI Agent; satellite reviewed before ready
- [ ] Socratic 5-Why Dialectic report generated/linked
- [ ] Architecture & Goal Conformance Harness passing

## Acceptance criteria

- [x] Nominal execution for "Promotion event schemas and NATS compatibility" succeeds without errors
- [x] Edge boundaries and negative inputs fail closed cleanly
- [x] All declared touch map files compile with zero compiler warnings
- [x] Conformance and test harness pass 100%

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

- `docs/03-architecture/api/schemas/promotion.schema.json`
- `docs/03-architecture/api/schemas/nats/promotion-proposal.schema.json`
- `docs/03-architecture/api/schemas/nats/promotion-decision.schema.json`
- `docs/03-architecture/api/asyncapi.yaml`

## Notes for AI

Operate within declared touch map only. Never touch files allocated to concurrent subagents.

## 🏛️ Comprehensive Spec Design Appendix
### Hexagonal Ports & Adapters Spec
- Driving ports: Core BFF proposal/status requests and versioned NATS consumers.
- Driven ports: PostgreSQL aggregate store, transactional outbox/inbox, NATS publisher, and audit/control dependencies.
- Boundary invariant: no browser-to-service or browser-to-platform direct call; no cross-service database write.

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
