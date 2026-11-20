---
goal_contract:
  id: G-PROOF-007
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Adversarial boundary harness probing identity aliasing collisions, arithmetic extremes, unsigned underflow, and precision dust leakage with fail-closed rejection."
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
        worktree: "../worktrees/soda-os-g-proof-007-implementer"
        branch: "feature/G-PROOF-007"
      - role: proof_verifier
        worktree: "../worktrees/soda-os-g-proof-007-verifier"
        branch: "feature/G-PROOF-007-verify"
      - role: socratic_reviewer
        worktree: "../worktrees/soda-os-g-proof-007-reviewer"
        branch: "feature/G-PROOF-007-review"
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

# G-PROOF-007: Adversarial Boundary & Extremal Arithmetic Mutation Harness

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Adversarial boundary harness probing identity aliasing collisions, arithmetic extremes, unsigned underflow, and precision dust leakage with fail-closed rejection.  
**Epic:** PROOF  
**Priority:** P1  
**Depends on:** G-PROOF-005  
**Blocks:** G-PROOF-008, G-PROOF-012  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement Boundary Value & Identity Aliasing Generators | done |
| 2 | Implement Precision Dust & Zero-Divisor Probing Engine | done |
| 3 | Author Test Suite & Adversarial Proof Receipt Emitter | done |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When concurrent tasks are coordinated across subagents, execution MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| `proof_implementer` | `feature/G-PROOF-007` | `../worktrees/soda-os-g-proof-007-implementer` | docs/07-backlog/goals/_archived/G-PROOF-007.md, scripts/lib/adversarial-probe-generator.mjs, scripts/harness/adversarial-boundary-harness.mjs, tests/unit/test-adversarial-boundary-harness.mjs | `target/worktrees/G-PROOF-007` |
| `proof_verifier` | `feature/G-PROOF-007-verify` | `../worktrees/soda-os-g-proof-007-verifier` | tests/**, scripts/harness/** | `target/worktrees/G-PROOF-007-verify` |
| `socratic_reviewer` | `feature/G-PROOF-007-review` | `../worktrees/soda-os-g-proof-007-reviewer` | docs/06_raw/** | `target/worktrees/G-PROOF-007-review` |

## Context

Catastrophic failures in software kernels occur predominantly at pathological boundary conditions: self-transfer aliasing ($from == to$), arithmetic extremes (0, 1, MAX - 1, MAX), integer wraps, zero divisors, and fractional precision dust. Soda OS currently tests these through goal-specific ad-hoc scripts rather than a unified, reusable adversarial boundary harness.

## Intent

**Why:** Systematically immunizes domain kernels against boundary exploits, economic balance draining, and arithmetic runtime panics.  
**Done when:** scripts/harness/adversarial-boundary-harness.mjs is implemented, providing reusable test generators across the 4 invariant edge categories and verifying fail-closed handling.  
**Unblocks:** Framework mutation testing gate (G-PROOF-008) and unified orchestrator (G-PROOF-012).  

## How

The implementation adheres to the Soda OS hexagonal architecture and the 28-Pillar Senior Engineering Protocol. Operational logic is implemented in pure functional units, ports and adapters are strictly separated from I/O boundaries, and all validation checks enforce fail-closed error semantics. Deterministic PRNG seeds, bounded execution iterations, and exact source-bound proof receipts ensure complete reproducibility across CI pipelines.

## Open questions

Resolved: Local execution latency SLA p99 < 500ms; CI runner SLA budget < 10s. Empirical run executes in < 150ms.

## Knowledge links

| Type | IDs |
|---|---|
| Architecture Spec | [03-architecture/overview.md](../../03-architecture/overview.md) |
| Epic Queue | [queues/PROOF.md](../queues/PROOF.md) |
| Proof Registry | [evidence/G-PROOF-001-proof-receipt.json](../evidence/G-PROOF-001-proof-receipt.json) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | `docs/07-backlog/goals/_archived/G-PROOF-007.md` |
| Queue Reference | `docs/07-backlog/queues/PROOF.md` |
| Goal Registry | `docs/07-backlog/goal-id-registry.yaml` |

## Atomicity & Zero-Mock Contract

- **One outcome:** Adversarial boundary harness probing identity aliasing collisions, arithmetic extremes, unsigned underflow, and precision dust leakage with fail-closed rejection.
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

1. **Step 1 — Implement Boundary Value & Identity Aliasing Generators**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-007.md, scripts/lib/adversarial-probe-generator.mjs, scripts/harness/adversarial-boundary-harness.mjs
   - **Actions:**
     - Implement generators targeting extremal integer points: 0, 1, MAX - 1, MAX, negative bounds.
     - Implement entity aliasing generators injecting from == to, identical source/destination pointers, and overlapping buffers.
   - **Completion gate:** Generators systematically produce adversarial test matrices for target interfaces.
   - **Stop condition:** Missing boundary values or incorrect integer representation limits.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


2. **Step 2 — Implement Precision Dust & Zero-Divisor Probing Engine**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-007.md, scripts/lib/adversarial-probe-generator.mjs, scripts/harness/adversarial-boundary-harness.mjs
   - **Actions:**
     - Simulate repeated dust transfers ($1 minor unit across 10,000 iterations) verifying conservation.
     - Inject zero denominators and non-canonical floating point values (NaN, Inf) verifying fail-closed rejection.
   - **Completion gate:** Probing engine accurately identifies rounding leakage and unhandled division by zero.
   - **Stop condition:** Tolerance of arithmetic drift or unhandled runtime panic.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


3. **Step 3 — Author Test Suite & Adversarial Proof Receipt Emitter**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-007.md, scripts/lib/adversarial-probe-generator.mjs, scripts/harness/adversarial-boundary-harness.mjs, tests/unit/test-adversarial-boundary-harness.mjs
   - **Actions:**
     - Author unit tests validating adversarial boundary detection against sample vulnerable kernels.
     - Emit structured adversarial proof receipts with exact test probe counts and exit codes.
   - **Completion gate:** tests/unit/test-adversarial-boundary-harness.mjs passes 100% green with exit code 0.
   - **Stop condition:** Failing test assertion or invalid receipt format.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


## In
- Adversarial boundary test engine in scripts/harness/adversarial-boundary-harness.mjs.
- Reusable probe generator primitives in scripts/lib/adversarial-probe-generator.mjs.
- Boundary generators for identity aliasing ($A == B$), arithmetic extremes ($0, 1, 2^{63}-1, 2^{64}-1$), and zero divisors.
- Precision dust draining simulator testing Banker's rounding and conservation across 10,000 micro-operations.
- Unit test suite in tests/unit/test-adversarial-boundary-harness.mjs.

## Out
- Modifying production arithmetic or ledger files.
- Operating system hardware fault injection (handled by SRE chaos harnesses).
- Network physical packet mutation.

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Specification | Add | `docs/07-backlog/goals/_archived/G-PROOF-007.md` |
| Implementation | Add | `scripts/lib/adversarial-probe-generator.mjs` |
| Implementation | Add | `scripts/harness/adversarial-boundary-harness.mjs` |
| Verification | Add | `tests/unit/test-adversarial-boundary-harness.mjs` |

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

- [x] Adversarial harness probes 100% of defined boundary categories: identity aliasing, arithmetic extremes, and zero divisors.
- [x] Precision dust simulation verifies zero-loss conservation across 10,000 consecutive micro-transactions.
- [x] All boundary violations trigger deterministic, fail-closed exceptions without process panics.
- [x] Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

- `docs/07-backlog/goals/_archived/G-PROOF-007.md`
- `scripts/lib/adversarial-probe-generator.mjs`
- `scripts/harness/adversarial-boundary-harness.mjs`
- `tests/unit/test-adversarial-boundary-harness.mjs`

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
