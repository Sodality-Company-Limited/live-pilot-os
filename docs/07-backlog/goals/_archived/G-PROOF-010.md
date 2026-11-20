---
goal_contract:
  id: G-PROOF-010
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Standardized counterexample trace serialization engine and cryptographic receipt freshness validator invalidating stale receipts upon source drift."
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
        worktree: "../worktrees/soda-os-g-proof-010-implementer"
        branch: "feature/G-PROOF-010"
      - role: proof_verifier
        worktree: "../worktrees/soda-os-g-proof-010-verifier"
        branch: "feature/G-PROOF-010-verify"
      - role: socratic_reviewer
        worktree: "../worktrees/soda-os-g-proof-010-reviewer"
        branch: "feature/G-PROOF-010-review"
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

# G-PROOF-010: Standardized Counterexample Minimizer & Cryptographic Receipt Freshness Engine

**Status:** done  
**Kind:** feature  
**Atomic outcome:** Standardized counterexample trace serialization engine and cryptographic receipt freshness validator invalidating stale receipts upon source drift.  
**Epic:** PROOF  
**Priority:** P1  
**Depends on:** G-PROOF-009  
**Blocks:** G-PROOF-012  
**Spec stability:** clarify ready · spec check ready · analyze ready  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Standardize Counterexample Artifact Schema & Serialization | done |
| 2 | Implement Deterministic Replay Engine | done |
| 3 | Implement Working-Tree Receipt Freshness Validator & Test Suite | done |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When concurrent tasks are coordinated across subagents, execution MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| `proof_implementer` | `feature/G-PROOF-010` | `../worktrees/soda-os-g-proof-010-implementer` | docs/07-backlog/goals/G-PROOF-010.md, scripts/harness/counterexample-minimizer.mjs, scripts/lib/receipt-freshness-engine.mjs, tests/unit/test-counterexample-minimizer.mjs | `target/worktrees/G-PROOF-010` |
| `proof_verifier` | `feature/G-PROOF-010-verify` | `../worktrees/soda-os-g-proof-010-verifier` | tests/**, scripts/harness/** | `target/worktrees/G-PROOF-010-verify` |
| `socratic_reviewer` | `feature/G-PROOF-010-review` | `../worktrees/soda-os-g-proof-010-reviewer` | docs/06_raw/** | `target/worktrees/G-PROOF-010-review` |

## Context

Proof receipts certify that invariants held under a specific Git commit hash and file state. If source code is modified after verification, the receipt becomes stale and invalid. Furthermore, when harnesses fail, counterexamples are often logged as unparseable console text rather than standardized, replayable JSON artifacts.

## Intent

**Why:** Guarantees that shipped code is cryptographically bound to fresh verification receipts and makes every failure instantly replayable.  
**Done when:** scripts/harness/counterexample-minimizer.mjs and scripts/lib/receipt-freshness-engine.mjs are implemented and tested, standardizing counterexample schemas, deterministic replay commands, and receipt freshness validation.  
**Unblocks:** Unified verification orchestrator (G-PROOF-012).  

## How

The implementation adheres to the Soda OS hexagonal architecture and the 28-Pillar Senior Engineering Protocol. Operational logic is implemented in pure functional units, ports and adapters are strictly separated from I/O boundaries, and all validation checks enforce fail-closed error semantics. Deterministic PRNG seeds, bounded execution iterations, and exact source-bound proof receipts ensure complete reproducibility across CI pipelines.

## Open questions

- [Resolved: Execution latency SLA is bounded strictly under 500ms for trace serialization and receipt freshness validation; max heap memory bounded under 64MB.]

## Knowledge links

| Type | IDs |
|---|---|
| Architecture Spec | [03-architecture/overview.md](../../03-architecture/overview.md) |
| Epic Queue | [queues/PROOF.md](../queues/PROOF.md) |
| Proof Registry | [evidence/G-PROOF-001-proof-receipt.json](../evidence/G-PROOF-001-proof-receipt.json) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | `docs/07-backlog/goals/G-PROOF-010.md` |
| Queue Reference | `docs/07-backlog/queues/PROOF.md` |
| Goal Registry | `docs/07-backlog/goal-id-registry.yaml` |

## Atomicity & Zero-Mock Contract

- **One outcome:** Standardized counterexample trace serialization engine and cryptographic receipt freshness validator invalidating stale receipts upon source drift.
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

1. **Step 1 — Standardize Counterexample Artifact Schema & Serialization**
   - **Allowed files:** docs/07-backlog/goals/G-PROOF-010.md, scripts/harness/counterexample-minimizer.mjs, scripts/lib/receipt-freshness-engine.mjs
   - **Actions:**
     - Define JSON schema for counterexample artifacts: seed, input_tuple, failing_step, trace, replay_command.
     - Implement serializer writing artifacts/counterexamples/<GOAL-ID>-<INVARIANT-ID>.json upon failure.
   - **Completion gate:** Serializer writes valid, conforming counterexample JSON files upon simulated failures.
   - **Stop condition:** Unserializable input objects or malformed JSON output.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


2. **Step 2 — Implement Deterministic Replay Engine**
   - **Allowed files:** docs/07-backlog/goals/G-PROOF-010.md, scripts/harness/counterexample-minimizer.mjs, scripts/lib/receipt-freshness-engine.mjs
   - **Actions:**
     - Implement CLI replay handler reproducing the exact failure trace from a saved counterexample file.
     - Verify that replaying a counterexample reproduces the identical assertion failure with 100% determinism.
   - **Completion gate:** Replay engine reproduces failing assertion trace identically across 20 trials.
   - **Stop condition:** Non-deterministic divergence during counterexample replay.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


3. **Step 3 — Implement Working-Tree Receipt Freshness Validator & Test Suite**
   - **Allowed files:** docs/07-backlog/goals/G-PROOF-010.md, scripts/harness/counterexample-minimizer.mjs, scripts/lib/receipt-freshness-engine.mjs, tests/unit/test-counterexample-minimizer.mjs
   - **Actions:**
     - Implement validator calculating active SHA-256 hashes of all source files listed in proof receipts.
     - Reject and flag receipts as STALE with exit code 1 if any working-tree byte differs from receipt hash.
     - Author unit tests verifying counterexample generation, replay, and freshness validation.
   - **Completion gate:** tests/unit/test-counterexample-minimizer.mjs passes 100% green with exit code 0.
   - **Stop condition:** Failing test assertion or hash calculation error.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.


## In
- Counterexample serialization engine standardizing failing inputs, seeds, and execution traces in scripts/harness/counterexample-minimizer.mjs.
- Deterministic replay command generator reproducing exact failure traces.
- Cryptographic receipt freshness validator in scripts/lib/receipt-freshness-engine.mjs checking working tree SHA-256 digests against receipt manifests and 24h SLA.
- Unit test suite in tests/unit/test-counterexample-minimizer.mjs.

## Out
- Modifying production financial or consensus code.
- Modifying Git commit history.
- Altering evidence receipts belonging to unrelated goals.

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Specification | Add | `docs/07-backlog/goals/G-PROOF-010.md` |
| Specification | Move | `docs/07-backlog/goals/_archived/G-PROOF-010.md` |
| Implementation | Add | `scripts/harness/counterexample-minimizer.mjs` |
| Implementation | Add | `scripts/lib/receipt-freshness-engine.mjs` |
| Verification | Add | `tests/unit/test-counterexample-minimizer.mjs` |
| Evidence | Add | `docs/07-backlog/evidence/G-PROOF-010-proof-receipt.json` |
| Evidence | Add | `artifacts/proofs/G-PROOF-010-proof-receipt.json` |

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

- [x] Failed verification runs emit standardized, replayable counterexample JSON artifacts.
- [x] Replay engine reproduces exact failure traces deterministically from saved counterexamples.
- [x] Receipt freshness validator detects working-tree source drift and invalidates stale receipts fail-closed.
- [x] Unit test suite passes 100% with zero mocks and zero compiler/runtime warnings.

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

- `docs/07-backlog/goals/G-PROOF-010.md`
- `docs/07-backlog/goals/_archived/G-PROOF-010.md`
- `scripts/harness/counterexample-minimizer.mjs`
- `scripts/lib/receipt-freshness-engine.mjs`
- `tests/unit/test-counterexample-minimizer.mjs`
- `docs/07-backlog/evidence/G-PROOF-010-proof-receipt.json`
- `artifacts/proofs/G-PROOF-010-proof-receipt.json`

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
