---
goal_contract:
  id: G-PROOF-006
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Stateful model-based testing harness comparing runtime state-machine transitions against a deterministic shadow reference model across generated command sequences."
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
        worktree: "../worktrees/soda-os-g-proof-006-implementer"
        branch: "feature/G-PROOF-006"
      - role: proof_verifier
        worktree: "../worktrees/soda-os-g-proof-006-verifier"
        branch: "feature/G-PROOF-006-verify"
      - role: socratic_reviewer
        worktree: "../worktrees/soda-os-g-proof-006-reviewer"
        branch: "feature/G-PROOF-006-review"
    isolation_barriers:
      git_index: true
      ephemeral_ports: true
      build_cache: true
    disjoint_touch_map: true
  lifecycle:
    spec: approved
    implementation: done
    verification: done
    evidence: complete
    review: done
    release: released
    learning: done
---

# G-PROOF-006: Stateful Model-Based Testing Harness & Shadow Oracle Validator

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Stateful model-based testing harness comparing runtime state-machine transitions against a deterministic shadow reference model across generated command sequences.  
**Epic:** PROOF  
**Priority:** P1  
**Depends on:** G-PROOF-005  
**Blocks:** G-PROOF-012  
**Spec stability:** clarify complete · spec check complete · analyze complete  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement Stateful Command Sequence Generator | done |
| 2 | Implement Shadow Reference Model State Comparison Engine | done |
| 3 | Implement Trace Shrinker & Automated Unit Test Suite | done |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When concurrent tasks are coordinated across subagents, execution MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| `proof_implementer` | `feature/G-PROOF-006` | `../worktrees/soda-os-g-proof-006-implementer` | docs/07-backlog/goals/_archived/G-PROOF-006.md, scripts/harness/stateful-model-harness.mjs, scripts/lib/shadow-oracle-validator.mjs, tests/unit/test-stateful-model-harness.mjs | `target/worktrees/G-PROOF-006` |
| `proof_verifier` | `feature/G-PROOF-006-verify` | `../worktrees/soda-os-g-proof-006-verifier` | tests/**, scripts/harness/** | `target/worktrees/G-PROOF-006-verify` |
| `socratic_reviewer` | `feature/G-PROOF-006-review` | `../worktrees/soda-os-g-proof-006-reviewer` | docs/06_raw/** | `target/worktrees/G-PROOF-006-review` |

## Context

Systems with complex lifecycles (such as DAVE state machines, WAL recovery, and consensus lease managers) cannot be verified solely by stateless function property checks. Subtle bugs emerge only across sequences of interleaved state transitions. Soda OS requires a stateful model-based harness that generates valid and invalid command sequences and compares System Under Test (SUT) states against a pure shadow reference model.

## Intent

**Why:** Detects illegal state reachability, out-of-order execution, reentrancy vulnerabilities, and saga rollback inconsistencies across multi-step execution traces.  
**Done when:** scripts/harness/stateful-model-harness.mjs is operational, executing stateful command sequences against shadow models and emitting minimized failing action traces.  
**Unblocks:** Unified verification orchestrator (G-PROOF-012).  

## How

The implementation adheres to the Soda OS hexagonal architecture and the 28-Pillar Senior Engineering Protocol. Operational logic is implemented in pure functional units, ports and adapters are strictly separated from I/O boundaries, and all validation checks enforce fail-closed error semantics. Deterministic PRNG seeds, bounded execution iterations, and exact source-bound proof receipts ensure complete reproducibility across CI pipelines.

## Open questions

- Local harness execution latency is bounded under 2.5s (< 100ms measured) across 100 steps; CI execution budget capped at 15s with max 128MB RAM.

## Knowledge links

| Type | IDs |
|---|---|
| Architecture Spec | [03-architecture/overview.md](../../03-architecture/overview.md) |
| Epic Queue | [queues/PROOF.md](../queues/PROOF.md) |
| Proof Registry | [evidence/G-PROOF-001-proof-receipt.json](../evidence/G-PROOF-001-proof-receipt.json) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | `docs/07-backlog/goals/_archived/G-PROOF-006.md` |
| Queue Reference | `docs/07-backlog/queues/PROOF.md` |
| Goal Registry | `docs/07-backlog/goal-id-registry.yaml` |

## Atomicity & Zero-Mock Contract

- **One outcome:** Stateful model-based testing harness comparing runtime state-machine transitions against a deterministic shadow reference model across generated command sequences.
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

1. **Step 1 — Implement Stateful Command Sequence Generator**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-006.md, scripts/harness/stateful-model-harness.mjs, scripts/lib/shadow-oracle-validator.mjs
   - **Actions:**
     - Define Command interface: precondition(state), run(sut, state), postcondition(sut, state).
     - Generate randomized command sequences with state-dependent feasibility filtering.
   - **Completion gate:** Generator produces valid, reproducible multi-step execution sequences.
   - **Stop condition:** Infinite loop during sequence generation or invalid precondition evaluation.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


2. **Step 2 — Implement Shadow Reference Model State Comparison Engine**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-006.md, scripts/harness/stateful-model-harness.mjs, scripts/lib/shadow-oracle-validator.mjs
   - **Actions:**
     - Execute parallel state transitions on SUT and pure reference shadow model.
     - Assert state equivalence and system law preservation after every individual command step.
   - **Completion gate:** State comparison engine detects state divergence and throws structured discrepancy errors.
   - **Stop condition:** False-positive divergence caused by non-deterministic shadow model evaluation.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


3. **Step 3 — Implement Trace Shrinker & Automated Unit Test Suite**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-006.md, scripts/harness/stateful-model-harness.mjs, tests/unit/test-stateful-model-harness.mjs
   - **Actions:**
     - Implement trace shrinker removing redundant commands while preserving the state failure.
     - Author unit tests verifying stateful transition detection on simulated FSM models.
   - **Completion gate:** tests/unit/test-stateful-model-harness.mjs passes 100% green with exit code 0.
   - **Stop condition:** Failing test assertion or unhandled state transition error.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


## In
- Stateful command generator producing valid and adversarial action sequences.
- Shadow model execution engine comparing state invariants after every transition.
- Action-trace shrinker that removes non-essential intermediate commands upon failure.
- Unit test suite in tests/unit/test-stateful-model-harness.mjs.

## Out
- Modifying production state machine implementations.
- Hardware-level memory model checking (deferred to G-PROOF-011).
- Third-party distributed database cluster orchestration.

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Specification | Add | `docs/07-backlog/goals/_archived/G-PROOF-006.md` |
| Implementation | Add | `scripts/harness/stateful-model-harness.mjs` |
| Implementation | Add | `scripts/lib/shadow-oracle-validator.mjs` |
| Verification | Add | `tests/unit/test-stateful-model-harness.mjs` |

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

- [x] Stateful harness generates multi-step command traces and evaluates shadow model equivalence after each step.
- [x] Trace shrinker minimizes failing command sequences to the exact minimal sequence reproducing the bug.
- [x] Harness detects state desynchronizations, reentrancy bugs, and illegal state reachability fail-closed.
- [x] Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

- `docs/07-backlog/goals/_archived/G-PROOF-006.md`
- `scripts/harness/stateful-model-harness.mjs`
- `scripts/lib/shadow-oracle-validator.mjs`
- `tests/unit/test-stateful-model-harness.mjs`

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
