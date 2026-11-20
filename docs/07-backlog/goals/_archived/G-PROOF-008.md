---
goal_contract:
  id: G-PROOF-008
  version: 2
  kind: governance
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Automated mutation testing gate injecting synthetic AST mutation operators into target domain logic and enforcing minimum mutation kill score thresholds."
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
        worktree: "../worktrees/soda-os-g-proof-008-implementer"
        branch: "feature/G-PROOF-008"
      - role: proof_verifier
        worktree: "../worktrees/soda-os-g-proof-008-verifier"
        branch: "feature/G-PROOF-008-verify"
      - role: socratic_reviewer
        worktree: "../worktrees/soda-os-g-proof-008-reviewer"
        branch: "feature/G-PROOF-008-review"
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

# G-PROOF-008: Framework Mutation Testing Gate & Test Oracle Strength Verifier

**Status:** done  
**Kind:** governance  
**Atomic outcome:** Automated mutation testing gate injecting synthetic AST mutation operators into target domain logic and enforcing minimum mutation kill score thresholds.  
**Epic:** PROOF  
**Priority:** P1  
**Depends on:** G-PROOF-007  
**Blocks:** G-PROOF-012  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement AST Mutation Operators & In-Memory Patch Engine | done |
| 2 | Implement Test Runner Fork & Mutation Score Calculator | done |
| 3 | Implement CI Gate Policy & Automated Unit Test Suite | done |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When concurrent tasks are coordinated across subagents, execution MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| `proof_implementer` | `feature/G-PROOF-008` | `../worktrees/soda-os-g-proof-008-implementer` | docs/07-backlog/goals/_archived/G-PROOF-008.md, scripts/lib/ast-mutator.mjs, scripts/harness/mutation-testing-harness.mjs, tests/unit/test-mutation-testing-harness.mjs | `target/worktrees/G-PROOF-008` |
| `proof_verifier` | `feature/G-PROOF-008-verify` | `../worktrees/soda-os-g-proof-008-verifier` | tests/**, scripts/harness/** | `target/worktrees/G-PROOF-008-verify` |
| `socratic_reviewer` | `feature/G-PROOF-008-review` | `../worktrees/soda-os-g-proof-008-reviewer` | docs/06_raw/** | `target/worktrees/G-PROOF-008-review` |

## Context

High test coverage metrics (100% statement, branch, or line coverage) frequently create a dangerous illusion of security. Tests that achieve 100% branch coverage can completely miss critical bugs if their assertions are weak or tautological. Soda OS requires an automated mutation testing gate that mutates AST nodes (operators, relational comparisons, boundary values) to empirically prove that test suites kill invalid mutations.

## Intent

**Why:** Verifies the quality and strength of test oracles, guaranteeing that test suites actively detect and fail on regressions.  
**Done when:** scripts/harness/mutation-testing-harness.mjs is operational, injecting mutation operators, computing mutation scores, and failing CI when kill rates drop below 85%.  
**Unblocks:** Unified verification orchestrator (G-PROOF-012).  

## How

The implementation adheres to the Soda OS hexagonal architecture and the 28-Pillar Senior Engineering Protocol. Operational logic is implemented in pure functional units, ports and adapters are strictly separated from I/O boundaries, and all validation checks enforce fail-closed error semantics. Deterministic PRNG seeds, bounded execution iterations, and exact source-bound proof receipts ensure complete reproducibility across CI pipelines.

## Open questions

- Resolved: In-memory AST patch engine enforces per-mutant execution timeout of 5,000ms and bounded evaluation batches (default 30 mutants) completing in < 3.0s total runtime in local and CI runners.

## Knowledge links

| Type | IDs |
|---|---|
| Architecture Spec | [03-architecture/overview.md](../../03-architecture/overview.md) |
| Epic Queue | [queues/PROOF.md](../queues/PROOF.md) |
| Proof Registry | [evidence/G-PROOF-001-proof-receipt.json](../evidence/G-PROOF-001-proof-receipt.json) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | `docs/07-backlog/goals/_archived/G-PROOF-008.md` |
| Queue Reference | `docs/07-backlog/queues/PROOF.md` |
| Goal Registry | `docs/07-backlog/goal-id-registry.yaml` |

## Atomicity & Zero-Mock Contract

- **One outcome:** Automated mutation testing gate injecting synthetic AST mutation operators into target domain logic and enforcing minimum mutation kill score thresholds.
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

1. **Step 1 — Implement AST Mutation Operators & In-Memory Patch Engine**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-008.md, scripts/lib/ast-mutator.mjs, scripts/harness/mutation-testing-harness.mjs
   - **Actions:**
     - Implement parser for JS/TS/Rust AST structures to locate mutable operator sites.
     - Define mutation operators: ComparisonInversion, ArithmeticReplacement, BoundaryShift, ReturnNullification.
   - **Completion gate:** Mutator generates syntactically valid mutant variants without corrupting disk state.
   - **Stop condition:** Generation of uncompilable mutants that cause trivial syntax failures.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


2. **Step 2 — Implement Test Runner Fork & Mutation Score Calculator**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-008.md, scripts/lib/ast-mutator.mjs, scripts/harness/mutation-testing-harness.mjs
   - **Actions:**
     - Execute target test suite against each generated mutant with execution timeouts.
     - Calculate MutationScore = (MutantsKilled / TotalMutants) * 100% and generate surviving mutant report.
   - **Completion gate:** Score calculator accurately classifies killed vs surviving mutants.
   - **Stop condition:** Runner deadlock or infinite loop caused by mutated termination conditions.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


3. **Step 3 — Implement CI Gate Policy & Automated Unit Test Suite**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-008.md, scripts/lib/ast-mutator.mjs, scripts/harness/mutation-testing-harness.mjs, tests/unit/test-mutation-testing-harness.mjs
   - **Actions:**
     - Enforce fail-closed gate policy: exit code 1 if MutationScore < threshold (default 85%).
     - Author unit tests verifying mutant detection, surviving mutant logging, and timeout handling.
   - **Completion gate:** tests/unit/test-mutation-testing-harness.mjs passes 100% green with exit code 0.
   - **Stop condition:** Failing test assertion or threshold miscalculation.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


## In
- Mutation testing gate harness in scripts/harness/mutation-testing-harness.mjs.
- AST mutator engine in scripts/lib/ast-mutator.mjs.
- AST mutation operators: relational mutations (< to <=, > to >=, == to !=), arithmetic mutations (+ to -, * to /), and statement deletion.
- Configurable mutation kill score thresholds (default: >= 85%).
- Unit test suite in tests/unit/test-mutation-testing-harness.mjs.

## Out
- Modifying production domain logic.
- Running unbounded full-codebase mutation runs on every commit (scoped to goal touch maps).
- Replacing formal proofs with mutation testing (epistemic distinction maintained).

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Specification | Add | `docs/07-backlog/goals/_archived/G-PROOF-008.md` |
| Implementation | Add | `scripts/lib/ast-mutator.mjs` |
| Implementation | Add | `scripts/harness/mutation-testing-harness.mjs` |
| Verification | Add | `tests/unit/test-mutation-testing-harness.mjs` |

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

- [x] Mutation gate injects synthetic faults across comparison, arithmetic, and boundary operators.
- [x] Calculates mutation score and enforces configured threshold (>= 85% kill rate) fail-closed.
- [x] Reports exact source line and operator diff for all surviving mutants.
- [x] Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

- `docs/07-backlog/goals/_archived/G-PROOF-008.md`
- `scripts/lib/ast-mutator.mjs`
- `scripts/harness/mutation-testing-harness.mjs`
- `tests/unit/test-mutation-testing-harness.mjs`

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
