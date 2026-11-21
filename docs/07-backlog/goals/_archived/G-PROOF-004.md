---
goal_contract:
  id: G-PROOF-004
  version: 2
  kind: governance
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Enhanced goal-template conformance harness validating Goal Contract v3 schemas, single-outcome atomicity, and cross-goal touch-map collision detection."
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
        worktree: "../worktrees/soda-os-g-proof-004-implementer"
        branch: "feature/G-PROOF-004"
      - role: proof_verifier
        worktree: "../worktrees/soda-os-g-proof-004-verifier"
        branch: "feature/G-PROOF-004-verify"
      - role: socratic_reviewer
        worktree: "../worktrees/soda-os-g-proof-004-reviewer"
        branch: "feature/G-PROOF-004-review"
    isolation_barriers:
      git_index: true
      ephemeral_ports: true
      build_cache: true
    disjoint_touch_map: true
  lifecycle:
    spec: done
    implementation: done
    verification: done
    evidence: done
    review: done
    release: done
    learning: done
---

# G-PROOF-004: Goal-Template Conformance Harness Enhancement & Touch-Map Collision Gate

**Status:** done  
**Kind:** governance  
**Atomic outcome:** Enhanced goal-template conformance harness validating Goal Contract v3 schemas, single-outcome atomicity, and cross-goal touch-map collision detection.  
**Epic:** PROOF  
**Priority:** P1  
**Depends on:** G-PROOF-003  
**Blocks:** G-PROOF-012  
**Spec stability:** clarify done · spec check done · analyze done  
**Closed:** 2026-10-10  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Modularize Touch Map Analyzer Library & Path Normalization Engine | done |
| 2 | Implement Cross-Goal Touch-Map Collision Gate CLI Runner | done |
| 3 | Automated Zero-Mock Unit Test Suite & Conformance Verification | done |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When concurrent tasks are coordinated across subagents, execution MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| `proof_implementer` | `feature/G-PROOF-004` | `../worktrees/soda-os-g-proof-004-implementer` | docs/07-backlog/goals/_archived/G-PROOF-004.md, scripts/lib/touch-map-analyzer.mjs, scripts/harness/touch-map-collision-gate.mjs | `target/worktrees/G-PROOF-004` |
| `proof_verifier` | `feature/G-PROOF-004-verify` | `../worktrees/soda-os-g-proof-004-verifier` | tests/unit/test-touch-map-collision-gate.mjs, docs/07-backlog/evidence/G-PROOF-004-proof-receipt.json | `target/worktrees/G-PROOF-004-verify` |
| `socratic_reviewer` | `feature/G-PROOF-004-review` | `../worktrees/soda-os-g-proof-004-reviewer` | docs/06_raw/** | `target/worktrees/G-PROOF-004-review` |

## Context

The existing goal-template conformance harness performs regular-expression scans on markdown headings. It does not validate machine-readable Goal Contract v3 schemas, does not cross-check active goals for parallel touch-map write collisions, and cannot detect multi-outcome scope creep embedded within complex work steps.

## Intent

**Why:** Prevents parallel subagents from corrupting shared repositories via concurrent file writes and guarantees that every admitted goal represents exactly one atomic outcome.  
**Done when:** The enhanced harness strictly validates Goal Contract v3 schemas, enforces single-outcome atomicity, and flags any pairwise touch-map overlap across active goals fail-closed.  
**Unblocks:** Unified verification orchestrator (G-PROOF-012).  

## How

The implementation adheres to the Soda OS hexagonal architecture and the 28-Pillar Senior Engineering Protocol. Operational logic is implemented in pure functional units, ports and adapters are strictly separated from I/O boundaries, and all validation checks enforce fail-closed error semantics. Deterministic PRNG seeds, bounded execution iterations, and exact source-bound proof receipts ensure complete reproducibility across CI pipelines.

## Open questions

- [RESOLVED] Execution latency budgets: Sub-50ms pairwise matrix evaluation and sub-100ms full repository gate scan across all active goals verified empirically.

## Knowledge links

| Type | IDs |
|---|---|
| Architecture Spec | [03-architecture/overview.md](../../03-architecture/overview.md) |
| Epic Queue | [queues/PROOF.md](../queues/PROOF.md) |
| Proof Registry | [evidence/G-PROOF-001-proof-receipt.json](../evidence/G-PROOF-001-proof-receipt.json) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | `docs/07-backlog/goals/_archived/G-PROOF-004.md` |
| Queue Reference | `docs/07-backlog/queues/PROOF.md` |
| Goal Registry | `docs/07-backlog/goal-id-registry.yaml` |

## Atomicity & Zero-Mock Contract

- **One outcome:** Enhanced goal-template conformance harness validating Goal Contract v3 schemas, single-outcome atomicity, and cross-goal touch-map collision detection.
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

1. **Step 1 — Modularize Touch Map Analyzer Library & Path Normalization Engine**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-004.md, scripts/lib/touch-map-analyzer.mjs
   - **Actions:**
     - Modularize pathsCollide, checkTouchMapCollision, sanitizeTouchMap, and parseTouchMap into scripts/lib/touch-map-analyzer.mjs.
     - Implement wildcard glob expansion, prefix overlap, and boundary-safe directory containment algorithms.
   - **Completion gate:** Module exports all 5 core functions and passes path normalization and collision unit tests.
   - **Stop condition:** Regressions on path normalization or false collisions on distinct directory branches.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


2. **Step 2 — Implement Cross-Goal Touch-Map Collision Gate CLI Runner**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-004.md, scripts/harness/touch-map-collision-gate.mjs
   - **Actions:**
     - Implement CLI harness scanning active goals in docs/07-backlog/goals/ or accepting explicit goal ID arguments.
     - Support --strict, --json, and --verbose flags, exiting 0 for clean disjoint worktrees and 1 on collision.
   - **Completion gate:** CLI correctly reports 0 collisions across disjoint goals and identifies synthetic overlapping touch maps.
   - **Stop condition:** Unhandled error or false-positive collision on shared tracking files.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


3. **Step 3 — Automated Zero-Mock Unit Test Suite & Conformance Verification**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-004.md, tests/unit/test-touch-map-collision-gate.mjs, docs/07-backlog/evidence/G-PROOF-004-proof-receipt.json
   - **Actions:**
     - Author comprehensive unit test suite in tests/unit/test-touch-map-collision-gate.mjs testing all edge cases.
     - Emit cryptographic proof receipt in docs/07-backlog/evidence/G-PROOF-004-proof-receipt.json and validate via proof-receipt-validator.mjs.
   - **Completion gate:** 31/31 unit tests pass green; proof-receipt-validator exits 0.
   - **Stop condition:** Any failing unit test assertion or invalid receipt schema.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


## In
- Modularizing scripts/lib/touch-map-analyzer.mjs with path normalization, glob support, and collision detection.
- Implementing scripts/harness/touch-map-collision-gate.mjs CLI runner with --strict, --json, and --verbose options.
- Developing zero-mock unit test suite in tests/unit/test-touch-map-collision-gate.mjs covering >= 20 edge cases.
- Emitting cryptographic proof receipt in docs/07-backlog/evidence/G-PROOF-004-proof-receipt.json.

## Out
- Modifying production application logic or runtime daemons.
- Modifying other harness scripts outside declared touch map.
- Changing other archived goal cards in docs/07-backlog/goals/_archived/.

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Specification | Archive | `docs/07-backlog/goals/_archived/G-PROOF-004.md` |
| Implementation | Add | `scripts/lib/touch-map-analyzer.mjs` |
| Implementation | Add | `scripts/harness/touch-map-collision-gate.mjs` |
| Verification | Add | `tests/unit/test-touch-map-collision-gate.mjs` |
| Evidence | Add | `docs/07-backlog/evidence/G-PROOF-004-proof-receipt.json` |

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

- [x] Goal template conformance harness validates Goal Contract v3 schema and reports structured diagnostics.
- [x] Touch-map collision detection flags overlapping write boundaries across active goals with exit code 1.
- [x] Unit test suite achieves 100% pass rate across positive, negative, and edge-case goal fixtures.
- [x] Zero-mock invariant verified with 100% operational logic across all touched files.

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

- `docs/07-backlog/goals/_archived/G-PROOF-004.md`
- `scripts/lib/touch-map-analyzer.mjs`
- `scripts/harness/touch-map-collision-gate.mjs`
- `tests/unit/test-touch-map-collision-gate.mjs`
- `docs/07-backlog/evidence/G-PROOF-004-proof-receipt.json`

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
