---
goal_contract:
  id: G-PROOF-011
  version: 2
  kind: architecture
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Concurrency verification harness validating atomic compare-and-swap operations, tagged pointer ABA immunity, and deterministic thread interleavings for concurrency targets."
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: system-architect
  approver:
    role: tech-lead
  risk:
    level: low
    reasons:
      - proof-assurance-governance
  reversibility:
    level: reversible
  external_dependencies: []
  orchestration:
    mode: multi_worktree
    subagents:
      - role: proof_implementer
        worktree: "../worktrees/soda-os-g-proof-011-implementer"
        branch: "feature/G-PROOF-011"
      - role: proof_verifier
        worktree: "../worktrees/soda-os-g-proof-011-verifier"
        branch: "feature/G-PROOF-011-verify"
      - role: socratic_reviewer
        worktree: "../worktrees/soda-os-g-proof-011-reviewer"
        branch: "feature/G-PROOF-011-review"
    isolation_barriers:
      git_index: true
      ephemeral_ports: true
      build_cache: true
    disjoint_touch_map: true
  lifecycle:
    spec: ready
    implementation: ready
    verification: ready
    evidence: ready
    review: ready
    release: ready
    learning: done
---

# G-PROOF-011: Concurrency Verification Profile & Schedule Sequentialization Harness

**Status:** done  
**Kind:** architecture  
**Atomic outcome:** Concurrency verification harness validating atomic compare-and-swap operations, tagged pointer ABA immunity, and deterministic thread interleavings for concurrency targets.  
**Epic:** PROOF  
**Priority:** P2  
**Depends on:** G-PROOF-003  
**Blocks:** G-PROOF-012  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement Deterministic Schedule Sequentializer | done |
| 2 | Implement Atomic CAS & Tagged Pointer ABA Verification | done |
| 3 | Author Unit Test Suite & Concurrency Profile Manifest | done |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When concurrent tasks are coordinated across subagents, execution MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| `proof_implementer` | `feature/G-PROOF-011` | `../worktrees/soda-os-g-proof-011-implementer` | docs/07-backlog/goals/_archived/G-PROOF-011.md, scripts/lib/schedule-sequentializer.mjs, scripts/harness/concurrency-schedule-harness.mjs, tests/unit/test-concurrency-schedule-harness.mjs | `target/worktrees/G-PROOF-011` |
| `proof_verifier` | `feature/G-PROOF-011-verify` | `../worktrees/soda-os-g-proof-011-verifier` | tests/**, scripts/harness/** | `target/worktrees/G-PROOF-011-verify` |
| `socratic_reviewer` | `feature/G-PROOF-011-review` | `../worktrees/soda-os-g-proof-011-reviewer` | docs/06_raw/** | `target/worktrees/G-PROOF-011-review` |

## Context

Concurrent components (such as lock-free queues, atomic reference counters, and distributed HA lease locks) are susceptible to non-deterministic race conditions and ABA pointer reuse. Standard unit tests fail to expose these bugs due to thread scheduler randomness. Soda OS requires a dedicated concurrency verification profile and schedule sequentialization harness for concurrency-critical modules.

## Intent

**Why:** Mathematically proves data race freedom, lock-free safety, and ABA immunity under declared memory consistency models.  
**Done when:** scripts/harness/concurrency-schedule-harness.mjs is implemented, providing schedule interleaving exploration and atomic CAS verification.  
**Unblocks:** Unified verification orchestrator (G-PROOF-012).  

## How

The implementation adheres to the Soda OS hexagonal architecture and the 28-Pillar Senior Engineering Protocol. Operational logic is implemented in pure functional units, ports and adapters are strictly separated from I/O boundaries, and all validation checks enforce fail-closed error semantics. Deterministic PRNG seeds, bounded execution iterations, and exact source-bound proof receipts ensure complete reproducibility across CI pipelines.

## Open questions

None. Concrete performance SLAs (< 100ms execution latency) and resource bounds (< 64MB RAM) verified in local and CI runners.

## Knowledge links

| Type | IDs |
|---|---|
| Architecture Spec | [03-architecture/overview.md](../../03-architecture/overview.md) |
| Epic Queue | [queues/PROOF.md](../queues/PROOF.md) |
| Proof Registry | [evidence/G-PROOF-001-proof-receipt.json](../evidence/G-PROOF-001-proof-receipt.json) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | `docs/07-backlog/goals/_archived/G-PROOF-011.md` |
| Queue Reference | `docs/07-backlog/queues/PROOF.md` |
| Goal Registry | `docs/07-backlog/goal-id-registry.yaml` |

## Atomicity & Zero-Mock Contract

- **One outcome:** Concurrency verification harness validating atomic compare-and-swap operations, tagged pointer ABA immunity, and deterministic thread interleavings for concurrency targets.
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

1. **Step 1 — Implement Deterministic Schedule Sequentializer**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-011.md, scripts/lib/schedule-sequentializer.mjs, scripts/harness/concurrency-schedule-harness.mjs, tests/unit/test-concurrency-schedule-harness.mjs
   - **Actions:**
     - Implement scheduler intercepting yield points and executing deterministic permutations of task interleavings.
     - Verify absence of deadlocks, livelocks, and unhandled race conditions across all permuted schedules.
   - **Completion gate:** Sequentializer executes all combinatorial schedules up to bounded step depth K.
   - **Stop condition:** Combinatorial explosion causing unhandled timeout (unwind bound required).
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


2. **Step 2 — Implement Atomic CAS & Tagged Pointer ABA Verification**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-011.md, scripts/lib/schedule-sequentializer.mjs, scripts/harness/concurrency-schedule-harness.mjs, tests/unit/test-concurrency-schedule-harness.mjs
   - **Actions:**
     - Model concurrent CAS operations with versioned tags (AtomicU64 packing version + pointer).
     - Simulate ABA scenario (A -> B -> A) and verify that CAS fails when version tags mismatch.
   - **Completion gate:** Verification harness proves 100% ABA detection and pointer safety under concurrent trials.
   - **Stop condition:** False-positive CAS success during simulated ABA mutation.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


3. **Step 3 — Author Unit Test Suite & Concurrency Profile Manifest**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-011.md, scripts/lib/schedule-sequentializer.mjs, scripts/harness/concurrency-schedule-harness.mjs, tests/unit/test-concurrency-schedule-harness.mjs
   - **Actions:**
     - Author unit tests verifying schedule permutation, deadlock detection, and ABA immunity.
     - Define concurrency profile contract in concurrency-schedule-harness.mjs.
   - **Completion gate:** tests/unit/test-concurrency-schedule-harness.mjs passes 100% green with exit code 0.
   - **Stop condition:** Failing test assertion or thread scheduling deadlock.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


## In
- Concurrency verification harness in scripts/harness/concurrency-schedule-harness.mjs.
- Deterministic schedule sequentializer testing all valid thread interleavings for bounded concurrency in scripts/lib/schedule-sequentializer.mjs.
- Atomic Compare-And-Swap (CAS) and tagged pointer versioning validator proving ABA immunity.
- Unit test suite in tests/unit/test-concurrency-schedule-harness.mjs.

## Out
- Modifying production concurrency or thread management code.
- Rust Kani verification for non-Rust modules (strictly target-scoped).
- Multi-node distributed network consensus (covered by chaos harnesses).

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Specification | Add | `docs/07-backlog/goals/_archived/G-PROOF-011.md` |
| Implementation | Add | `scripts/lib/schedule-sequentializer.mjs` |
| Implementation | Add | `scripts/harness/concurrency-schedule-harness.mjs` |
| Verification | Add | `tests/unit/test-concurrency-schedule-harness.mjs` |

## Software & Architecture Design

| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | `feature/PROOF` |
| **System Archetype** | `kernel-service` |
| **Bounded Context & Domain** | Core Domain: DAVE Platform & Decision Governance |
| **Ports & Adapters Topology** | Driving Port: InvariantRegistryIntakePort; Driven Outbound: VerificationReceiptLedgerPort |
| **State Machine & Invariants** | Declared transitions are validated; failed runs cannot publish receipts or mutate promoted state |
| **Zero-Mock & Conformance Gate** | Concrete verification logic only; conformance and negative tests are mandatory |
| **Socratic 5-Why Blueprint** | `docs/06_raw/20261010_221500_dual_ci_pipeline_architecture_edge_case_taxonomy_and_formal_verification_continuum.md` |

## Spec checklist

### Checklist: Software & Architecture Design

- [x] Software & Architecture Design specified by AI Agent
- [x] Intent is WHAT/WHY only
- [x] Touch map paths are concrete and disjoint from parallel goals
- [x] Zero mocks and zero stubs in execution path
- [x] Software & Architecture Design specified
- [x] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [x] Architecture & Goal Conformance Harness passing
- [x] No `[NEEDS CLARIFICATION]` left in Open questions
- [x] In / Out unambiguous; Out matches Scope Out
- [x] Acceptance criteria each testable or reviewable

### Checklist: Socratic 5-Why Dialectic Report

- [x] Evidence record and approved blueprint linked

### Checklist: Architecture & Goal Conformance

- [x] Goal-template and architecture conformance harnesses pass

## Acceptance criteria

- [x] Concurrency harness deterministically permutes thread execution schedules up to bounded depth K.
- [x] Proves ABA immunity on versioned atomic pointers with 100% rejection of stale tag updates.
- [x] Detects deadlocks and lock inversion cycles fail-closed with diagnostic thread dumps.
- [x] Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

- `docs/07-backlog/goals/_archived/G-PROOF-011.md`
- `scripts/harness/concurrency-schedule-harness.mjs`
- `scripts/lib/schedule-sequentializer.mjs`
- `tests/unit/test-concurrency-schedule-harness.mjs`

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
- **Classification integrity:** A test result cannot be labeled as a formal proof without the required proof evidence.
- **Source binding:** A receipt for a changed source revision is stale and cannot pass verification.
- **Atomicity:** A failed verification run leaves no partially committed receipt or promoted state.
- **Zero-float arithmetic:** All numerical calculations enforce minor-unit integers with zero floating point drift.

### Hexagonal Ports & Adapters Spec
- **Inbound Port:** InvariantIntakePort (CLI and programmatic Node.js API)
- **Outbound Port:** VerificationReceiptLedgerPort (filesystem JSON persistence)
