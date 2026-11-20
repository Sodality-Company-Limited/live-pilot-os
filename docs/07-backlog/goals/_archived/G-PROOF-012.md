---
goal_contract:
  id: G-PROOF-012
  version: 2
  kind: governance
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Unified verification orchestrator coordinating profile-selected test harnesses and enforcing fail-closed lifecycle transition gates across ready, verified, and done."
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
        worktree: "../worktrees/soda-os-g-proof-012-implementer"
        branch: "feature/G-PROOF-012"
      - role: proof_verifier
        worktree: "../worktrees/soda-os-g-proof-012-verifier"
        branch: "feature/G-PROOF-012-verify"
      - role: socratic_reviewer
        worktree: "../worktrees/soda-os-g-proof-012-reviewer"
        branch: "feature/G-PROOF-012-review"
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

# G-PROOF-012: Unified Verification Orchestrator & Lifecycle State Machine Gatekeeper

**Status:** done  
**Kind:** governance  
**Atomic outcome:** Unified verification orchestrator coordinating profile-selected test harnesses and enforcing fail-closed lifecycle transition gates across ready, verified, and done.  
**Epic:** PROOF  
**Priority:** P1  
**Depends on:** G-PROOF-004, G-PROOF-006, G-PROOF-008, G-PROOF-010, G-PROOF-011  
**Blocks:** G-PROOF-013  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement Profile-Driven Harness Dispatch Engine | done |
| 2 | Implement Lifecycle State Machine Promotion Gatekeeper | done |
| 3 | Author Automated Unit Test Suite & CLI Verification | done |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When concurrent tasks are coordinated across subagents, execution MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| `proof_implementer` | `feature/G-PROOF-012` | `../worktrees/soda-os-g-proof-012-implementer` | docs/07-backlog/goals/G-PROOF-012.md, docs/07-backlog/goals/_archived/G-PROOF-012.md, scripts/harness/verification-orchestrator-harness.mjs, scripts/lib/verification-orchestrator.mjs, tests/unit/test-verification-orchestrator.mjs, docs/07-backlog/evidence/G-PROOF-012-proof-receipt.json, artifacts/proofs/G-PROOF-012-proof-receipt.json | `target/worktrees/G-PROOF-012` |
| `proof_verifier` | `feature/G-PROOF-012-verify` | `../worktrees/soda-os-g-proof-012-verifier` | tests/**, scripts/harness/** | `target/worktrees/G-PROOF-012-verify` |
| `socratic_reviewer` | `feature/G-PROOF-012-review` | `../worktrees/soda-os-g-proof-012-reviewer` | docs/06_raw/** | `target/worktrees/G-PROOF-012-review` |

## Context

With individual verification harnesses created across property testing, stateful models, adversarial boundaries, mutation testing, and proof receipts, Soda OS requires a centralized orchestrator. The orchestrator reads a goal's declared verification profile, invokes the exact required harness pipeline, aggregates evidence receipts, and blocks invalid lifecycle transitions (ready, verified, done) upon missing or failing evidence.

## Intent

**Why:** Enforces automated, unbypassable quality gates across the Soda OS development lifecycle, preventing human or agent errors from promoting unproven code.  
**Done when:** scripts/harness/verification-orchestrator-harness.mjs is operational, coordinating verification pipelines by profile and enforcing fail-closed promotion gates.  
**Unblocks:** Verification architecture guide and operator runbook (G-PROOF-013).  

## How

The implementation adheres to the Soda OS hexagonal architecture and the 28-Pillar Senior Engineering Protocol. Operational logic is implemented in pure functional units, ports and adapters are strictly separated from I/O boundaries, and all validation checks enforce fail-closed error semantics. Deterministic PRNG seeds, bounded execution iterations, and exact source-bound proof receipts ensure complete reproducibility across CI pipelines.

## Open questions

- [Resolved: Execution latency SLA is bounded strictly under 5000ms for full profile verification pipeline across parallel runners; individual harness dispatch latency bounded under 1000ms; memory bounded under 64MB.]

## Knowledge links

| Type | IDs |
|---|---|
| Architecture Spec | [03-architecture/overview.md](../../03-architecture/overview.md) |
| Epic Queue | [queues/PROOF.md](../queues/PROOF.md) |
| Proof Registry | [evidence/G-PROOF-001-proof-receipt.json](../evidence/G-PROOF-001-proof-receipt.json) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | `docs/07-backlog/goals/G-PROOF-012.md` |
| Queue Reference | `docs/07-backlog/queues/PROOF.md` |
| Goal Registry | `docs/07-backlog/goal-id-registry.yaml` |

## Atomicity & Zero-Mock Contract

- **One outcome:** Unified verification orchestrator coordinating profile-selected test harnesses and enforcing fail-closed lifecycle transition gates across ready, verified, and done.
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

1. **Step 1 — Implement Profile-Driven Harness Dispatch Engine**
   - **Allowed files:** docs/07-backlog/goals/G-PROOF-012.md, docs/07-backlog/goals/_archived/G-PROOF-012.md, scripts/harness/verification-orchestrator-harness.mjs, scripts/lib/verification-orchestrator.mjs
   - **Actions:**
     - Parse goal contract profiles and resolve dependency execution DAG of required harnesses.
     - Execute required harnesses in deterministic sequence with parallel execution where safe.
   - **Completion gate:** Orchestrator dispatches correct harness matrix based on declared goal profile.
   - **Stop condition:** Unknown profile or missing required harness dependency.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


2. **Step 2 — Implement Lifecycle State Machine Promotion Gatekeeper**
   - **Allowed files:** docs/07-backlog/goals/G-PROOF-012.md, docs/07-backlog/goals/_archived/G-PROOF-012.md, scripts/harness/verification-orchestrator-harness.mjs, scripts/lib/verification-orchestrator.mjs
   - **Actions:**
     - Enforce pre-ready gate: goal contract conforming, touch map disjoint, dependencies satisfied.
     - Enforce pre-done gate: all profile harnesses passed, mutation score met, proof receipt fresh and valid.
     - Block transition and exit with code 1 if any condition is violated.
   - **Completion gate:** Gatekeeper strictly prevents premature status promotion in test scenarios.
   - **Stop condition:** Permissive bypass allowing unproven goal to transition to done.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


3. **Step 3 — Author Automated Unit Test Suite & CLI Verification**
   - **Allowed files:** docs/07-backlog/goals/G-PROOF-012.md, docs/07-backlog/goals/_archived/G-PROOF-012.md, scripts/harness/verification-orchestrator-harness.mjs, scripts/lib/verification-orchestrator.mjs, tests/unit/test-verification-orchestrator.mjs, docs/07-backlog/evidence/G-PROOF-012-proof-receipt.json, artifacts/proofs/G-PROOF-012-proof-receipt.json
   - **Actions:**
     - Implement unit test suite verifying profile resolution, pipeline execution, and lifecycle gatekeeping.
     - Verify clean CLI output reporting comprehensive pass/fail scorecard.
   - **Completion gate:** tests/unit/test-verification-orchestrator.mjs passes 100% green with exit code 0.
   - **Stop condition:** Failing test assertion or unhandled orchestrator error.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


## In
- Unified verification orchestrator in scripts/harness/verification-orchestrator-harness.mjs.
- Core verification orchestrator engine in scripts/lib/verification-orchestrator.mjs.
- Profile-driven harness dispatch engine mapping goal profiles to required harness execution sequences.
- Lifecycle transition gatekeeper blocking status updates when evidence is missing, failed, or stale.
- Unit test suite in tests/unit/test-verification-orchestrator.mjs.
- Cryptographic proof receipts in docs/07-backlog/evidence/G-PROOF-012-proof-receipt.json and artifacts/proofs/G-PROOF-012-proof-receipt.json.

## Out
- Modifying individual harness internal algorithms.
- Modifying production application logic.
- Bypassing human review approval requirements.

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Specification | Add | `docs/07-backlog/goals/G-PROOF-012.md` |
| Specification | Move | `docs/07-backlog/goals/_archived/G-PROOF-012.md` |
| Implementation | Add | `scripts/harness/verification-orchestrator-harness.mjs` |
| Implementation | Add | `scripts/lib/verification-orchestrator.mjs` |
| Verification | Add | `tests/unit/test-verification-orchestrator.mjs` |
| Evidence | Add | `docs/07-backlog/evidence/G-PROOF-012-proof-receipt.json` |
| Evidence | Add | `artifacts/proofs/G-PROOF-012-proof-receipt.json` |

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

- [x] Orchestrator reads goal verification profiles and automatically executes the exact required harness suite.
- [x] Enforces fail-closed gatekeeping blocking transition to ready or done upon any harness failure.
- [x] Aggregates multi-harness evidence into a unified, cryptographically bound verification receipt.
- [x] Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

- `docs/07-backlog/goals/G-PROOF-012.md`
- `docs/07-backlog/goals/_archived/G-PROOF-012.md`
- `scripts/harness/verification-orchestrator-harness.mjs`
- `scripts/lib/verification-orchestrator.mjs`
- `tests/unit/test-verification-orchestrator.mjs`
- `docs/07-backlog/evidence/G-PROOF-012-proof-receipt.json`
- `artifacts/proofs/G-PROOF-012-proof-receipt.json`

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
