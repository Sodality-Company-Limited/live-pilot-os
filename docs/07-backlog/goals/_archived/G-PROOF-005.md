---
goal_contract:
  id: G-PROOF-005
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Standardized property-based invariant execution harness with deterministic PRNG seed replay, case generators, and automated counterexample shrinking."
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
        worktree: "../worktrees/soda-os-g-proof-005-implementer"
        branch: "feature/G-PROOF-005"
      - role: proof_verifier
        worktree: "../worktrees/soda-os-g-proof-005-verifier"
        branch: "feature/G-PROOF-005-verify"
      - role: socratic_reviewer
        worktree: "../worktrees/soda-os-g-proof-005-reviewer"
        branch: "feature/G-PROOF-005-review"
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
    review: done
    release: released
    learning: done
---

# G-PROOF-005: Property-Based Invariant Execution Harness & Shrinking Engine

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Standardized property-based invariant execution harness with deterministic PRNG seed replay, case generators, and automated counterexample shrinking.  
**Epic:** PROOF  
**Priority:** P1  
**Depends on:** G-PROOF-003  
**Blocks:** G-PROOF-006, G-PROOF-007, G-PROOF-012  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement Invariant Property Runner & Deterministic PRNG | done |
| 2 | Implement Automated Counterexample Shrinking Algorithm | done |
| 3 | Author CLI Interface, Receipt Emitter & Verification Battery | done |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When concurrent tasks are coordinated across subagents, execution MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| `proof_implementer` | `feature/G-PROOF-005` | `../worktrees/soda-os-g-proof-005-implementer` | docs/07-backlog/goals/G-PROOF-005.md, scripts/lib/invariant-runner.mjs, scripts/harness/property-invariant-harness.mjs, tests/unit/test-property-invariant-harness.mjs | `target/worktrees/G-PROOF-005` |
| `proof_verifier` | `feature/G-PROOF-005-verify` | `../worktrees/soda-os-g-proof-005-verifier` | tests/**, scripts/harness/** | `target/worktrees/G-PROOF-005-verify` |
| `socratic_reviewer` | `feature/G-PROOF-005-review` | `../worktrees/soda-os-g-proof-005-reviewer` | docs/06_raw/** | `target/worktrees/G-PROOF-005-review` |

## Context

While Soda OS possesses ad-hoc property assertions in specialized test scripts, it lacks a standardized, reusable property-based testing harness. Engineers cannot declare relational invariants (conservation, monotonicity, idempotency) in a uniform configuration, run deterministic seed-based fuzzing batteries, or receive automated counterexample shrinking upon invariant failure.

## Intent

**Why:** Bridges example-based unit testing with statistical state-space exploration, discovering unhandled boundary bugs and delivering minimal reproducible failure traces.  
**Done when:** The property-invariant harness is implemented in scripts/harness/property-invariant-harness.mjs and scripts/lib/invariant-runner.mjs, supporting seed replay, generators for primitive types, and shrinking algorithms.  
**Unblocks:** Stateful model-based testing harness (G-PROOF-006) and adversarial boundary harness (G-PROOF-007).  

## How

The implementation adheres to the Soda OS hexagonal architecture and the 28-Pillar Senior Engineering Protocol. Operational logic is implemented in pure functional units, ports and adapters are strictly separated from I/O boundaries, and all validation checks enforce fail-closed error semantics. Deterministic PRNG seeds, bounded execution iterations, and exact source-bound proof receipts ensure complete reproducibility across CI pipelines.

## Open questions

- [x] Resolved: Harness execution latency SLA is < 100ms for 1,000 cases and < 1,000ms for 10,000 cases in both local and CI environments with zero heap drift and complete deterministic seed replay.

## Knowledge links

| Type | IDs |
|---|---|
| Architecture Spec | [03-architecture/overview.md](../../03-architecture/overview.md) |
| Epic Queue | [queues/PROOF.md](../queues/PROOF.md) |
| Proof Registry | [evidence/G-PROOF-001-proof-receipt.json](../evidence/G-PROOF-001-proof-receipt.json) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | `docs/07-backlog/goals/G-PROOF-005.md` |
| Queue Reference | `docs/07-backlog/queues/PROOF.md` |
| Goal Registry | `docs/07-backlog/goal-id-registry.yaml` |

## Atomicity & Zero-Mock Contract

- **One outcome:** Standardized property-based invariant execution harness with deterministic PRNG seed replay, case generators, and automated counterexample shrinking.
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

### Step 1 — Implement Invariant Property Runner & Deterministic PRNG

**Allowed files:** `scripts/lib/invariant-runner.mjs`, `scripts/harness/property-invariant-harness.mjs`  
**Actions:**

1. Implement SplitMix64 deterministic PRNG supporting seed initialization, state export/replay, and child forking.
2. Implement generator combinators for integers, bigints, floats, strings, arrays, objects, and tuples.

**Verification command:** `node --test tests/unit/test-property-invariant-harness.mjs`  
**Completion gate:** Generators produce identical pseudo-random distributions given identical seeds.  
**Stop condition:** Non-deterministic PRNG behavior or seed leakage across trials.  
**Zero-Mock invariant check:** 100% operational logic; zero stubs or placeholders.

### Step 2 — Implement Automated Counterexample Shrinking Algorithm

**Allowed files:** `scripts/lib/invariant-runner.mjs`, `scripts/harness/property-invariant-harness.mjs`  
**Actions:**

1. Implement binary search and integer decrement shrinking towards zero and boundary values.
2. Implement array element removal, string truncation, and object key shrinkers preserving invariant failure.

**Verification command:** `node --test tests/unit/test-property-invariant-harness.mjs`  
**Completion gate:** Shrinking engine reduces complex failing vectors to minimal 1-step counterexamples.  
**Stop condition:** Shrinker loop divergence or failure to preserve the invariant violation.  
**Zero-Mock invariant check:** 100% operational logic; zero stubs or placeholders.

### Step 3 — Author CLI Interface, Receipt Emitter & Verification Battery

**Allowed files:** `scripts/harness/property-invariant-harness.mjs`, `tests/unit/test-property-invariant-harness.mjs`  
**Actions:**

1. Implement CLI flags (--seed, --cases, --harness, --shrink-timeout, --output-receipt, --json, --verbose).
2. Author unit tests verifying conservation laws, monotonicity, idempotency, and proof receipt generation.

**Verification command:** `node --test tests/unit/test-property-invariant-harness.mjs`  
**Completion gate:** tests/unit/test-property-invariant-harness.mjs passes 100% green with exit code 0.  
**Stop condition:** Failing test assertion or receipt emission failure.  
**Zero-Mock invariant check:** 100% operational logic; zero stubs or placeholders.

## In
- Property invariant harness runner in scripts/harness/property-invariant-harness.mjs.
- Deterministic pseudorandom generators with configurable seeds and iteration counts (N >= 1,000).
- Counterexample shrinking algorithm delivering minimal failing input vectors.
- Unit tests in tests/unit/test-property-invariant-harness.mjs.

## Out
- Modifying production financial or consensus code.
- Stateful multi-step transition chains (deferred to G-PROOF-006).
- External SMT solver installations.

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Specification | Add | `docs/07-backlog/goals/G-PROOF-005.md` |
| Implementation | Add | `scripts/lib/invariant-runner.mjs` |
| Implementation | Add | `scripts/harness/property-invariant-harness.mjs` |
| Verification | Add | `tests/unit/test-property-invariant-harness.mjs` |

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

- [x] Property-based harness executes N >= 1,000 trials deterministically from a declared integer seed.
- [x] Shrinking algorithm reduces multi-variable failing inputs to minimal reproducible boundary values.
- [x] Harness emits structured JSON execution receipts including seed, trial count, and shrunk counterexamples.
- [x] Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

- `docs/07-backlog/goals/G-PROOF-005.md`
- `docs/07-backlog/goals/_archived/G-PROOF-005.md`
- `scripts/lib/invariant-runner.mjs`
- `scripts/harness/property-invariant-harness.mjs`
- `tests/unit/test-property-invariant-harness.mjs`

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
