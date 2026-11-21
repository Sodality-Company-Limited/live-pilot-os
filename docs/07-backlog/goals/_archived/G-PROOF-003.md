---
goal_contract:
  id: G-PROOF-003
  version: 2
  kind: architecture
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Machine-readable Goal Contract v3 schema and verification profile extension framework uniting invariants, proof levels, and rollback contracts."
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
        worktree: "../worktrees/soda-os-g-proof-003-implementer"
        branch: "feature/G-PROOF-003"
      - role: proof_verifier
        worktree: "../worktrees/soda-os-g-proof-003-verifier"
        branch: "feature/G-PROOF-003-verify"
      - role: socratic_reviewer
        worktree: "../worktrees/soda-os-g-proof-003-reviewer"
        branch: "feature/G-PROOF-003-review"
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

# G-PROOF-003: Goal Verification Contract Foundation & Profile Schema Specification

**Status:** done  
**Kind:** architecture  
**Atomic outcome:** Machine-readable Goal Contract v3 schema and verification profile extension framework uniting invariants, proof levels, and rollback contracts.  
**Epic:** PROOF  
**Priority:** P1  
**Depends on:** G-PROOF-001, G-PROOF-002  
**Blocks:** G-PROOF-004, G-PROOF-005, G-PROOF-006, G-PROOF-007, G-PROOF-008, G-PROOF-009, G-PROOF-010, G-PROOF-011, G-PROOF-012, G-PROOF-013  
**Spec stability:** clarify done · spec check done · analyze done  

#### Plan

**Collaboration phase:** SHIP

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Define Goal Contract v3 Universal Schema & Invariant Types | done |
| 2 | Codify Modular Verification Profile Schemas | done |
| 3 | Author Architecture Specification & Backward Compatibility Guide | done |

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When concurrent tasks are coordinated across subagents, execution MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Target Branch | Worktree Filesystem Path | Write Boundary (Disjoint Touch Map) | Isolated Build Cache (CARGO_TARGET_DIR) |
|---|---|---|---|---|
| `proof_implementer` | `feature/G-PROOF-003` | `../worktrees/soda-os-g-proof-003-implementer` | docs/07-backlog/goals/_archived/G-PROOF-003.md, schemas/goal-contract.schema.json, scripts/lib/goal-contract-schema.mjs | `target/worktrees/G-PROOF-003` |
| `proof_verifier` | `feature/G-PROOF-003-verify` | `../worktrees/soda-os-g-proof-003-verifier` | tests/unit/test-goal-contract-schema.mjs | `target/worktrees/G-PROOF-003-verify` |
| `socratic_reviewer` | `feature/G-PROOF-003-review` | `../worktrees/soda-os-g-proof-003-reviewer` | docs/06_raw/** | `target/worktrees/G-PROOF-003-review` |

## Context

Soda OS goal cards currently define informal frontmatter metadata and markdown narrative sections. Without a machine-readable JSON schema defining the Goal Contract v3 and modular verification profiles (formal, property, stateful, adversarial, mutation, concurrency, statistical), automated harnesses cannot reliably validate whether a goal satisfies its required verification obligations before promotion.

## Intent

**Why:** Establishes the foundational contract layer for all Soda OS goals, enabling machine-verifiable assurance profiles and decoupled harness execution.  
**Done when:** The Goal Contract v3 JSON Schema is formally authored and validated, defining universal fields and 7 profile-based extensions with backward compatibility for v2 cards.  
**Unblocks:** Goal-template conformance harness enhancement (G-PROOF-004) and all specialized verification harnesses (G-PROOF-005 to G-PROOF-011).  

## How

The implementation adheres to the Soda OS hexagonal architecture and the 28-Pillar Senior Engineering Protocol. Operational logic is implemented in pure functional units, ports and adapters are strictly separated from I/O boundaries, and all validation checks enforce fail-closed error semantics. Deterministic PRNG seeds, bounded execution iterations, and exact source-bound proof receipts ensure complete reproducibility across CI pipelines.

## Open questions

None.

## Knowledge links

| Type | IDs |
|---|---|
| Architecture Spec | [03-architecture/overview.md](../../03-architecture/overview.md) |
| Epic Queue | [queues/PROOF.md](../queues/PROOF.md) |
| Proof Registry | [evidence/G-PROOF-001-proof-receipt.json](../evidence/G-PROOF-001-proof-receipt.json) |

## Context manifest

| Kind | IDs / paths |
|---|---|
| Goal Contract | `docs/07-backlog/goals/_archived/G-PROOF-003.md` |
| Queue Reference | `docs/07-backlog/queues/PROOF.md` |
| Goal Registry | `docs/07-backlog/goal-id-registry.yaml` |

## Atomicity & Zero-Mock Contract

- **One outcome:** Machine-readable Goal Contract v3 schema and verification profile extension framework uniting invariants, proof levels, and rollback contracts.
- **Concrete execution:** 100% production logic; zero placeholders, zero todo!() stubs, zero dummy fallbacks.

### Antigravity handoff contract

When this goal is handed to Antigravity:
1. Verify isolated Git worktree provisioning and branch isolation.
2. Execute Red-Green-Refactor TDD cycle within declared touch map only.
3. Run verification suites and export evidence before signaling completion.

## Work steps

1. **Step 1 — Define Goal Contract v3 Universal Schema & Invariant Types**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-003.md, schemas/goal-contract.schema.json, scripts/lib/goal-contract-schema.mjs
   - **Actions:**
     - Specify JSON Schema Draft 2020-12 defining universal goal contract properties.
     - Define machine-readable enums for invariant classes: conservation, monotonicity, idempotency, reachability, termination.
   - **Completion gate:** schemas/goal-contract.schema.json parses cleanly with zero schema validation errors.
   - **Stop condition:** Invalid schema syntax or unrepresented universal contract property.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.

2. **Step 2 — Codify Modular Verification Profile Schemas**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-003.md, schemas/goal-contract.schema.json, scripts/lib/goal-contract-schema.mjs
   - **Actions:**
     - Specify profile schemas for formal_proof, property_invariant, stateful_model, adversarial_boundary, mutation_testing, concurrency_memory, and statistical_calibration.
     - Document Hoare Triple precondition/postcondition structures and solver assumption boundaries.
   - **Completion gate:** All 7 profile schemas compile and validate against schema test fixtures.
   - **Stop condition:** Ambiguous profile inheritance or schema collision across profiles.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.

3. **Step 3 — Author Architecture Specification & Backward Compatibility Guide**
   - **Allowed files:** docs/07-backlog/goals/_archived/G-PROOF-003.md, schemas/goal-contract.schema.json, scripts/lib/goal-contract-schema.mjs
   - **Actions:**
     - Document verification contract architecture and native validation engine in scripts/lib/goal-contract-schema.mjs.
     - Specify deterministic translation rules converting legacy v2 cards to v3 schema without data loss.
   - **Completion gate:** Unit test suite tests/unit/test-goal-contract-schema.mjs passes 100% green.
   - **Stop condition:** Unresolved translation ambiguity or missing rollback specification.
   - **Zero-mock check:** 100% operational logic; zero stubs or placeholders.

## In
- Goal Contract v3 JSON Schema specification (universal fields: atomicity, dependencies, touch map, rollback contract).
- 7 Verification Profile schemas: proof_formal, property_invariant, stateful_model, adversarial_boundary, mutation_testing, concurrency_memory, statistical_calibration.
- Backward compatibility mapping rules translating Template v2 goal cards to v3 contracts.

## Out
- Modifying production application logic or runtime kernels.
- Implementing solver integrations (Z3/Kani) or property test runners directly in this goal.
- Modifying downstream project files outside declared touch map.

## Change delta

| Area | Action | Path / behaviour |
|---|---|---|
| Specification | Add | `docs/07-backlog/goals/_archived/G-PROOF-003.md` |
| Implementation | Add | `scripts/lib/goal-contract-schema.mjs` |
| Verification | Add | `schemas/goal-contract.schema.json` |

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

- [x] Goal Contract v3 JSON Schema validates against JSON Schema Draft 2020-12 with zero schema errors.
- [x] All 7 verification profiles (formal, property, stateful, adversarial, mutation, concurrency, statistical) define concrete, machine-readable validation constraints.
- [x] Backward compatibility mapping rules preserve 100% of legacy v2 fields while enabling incremental adoption.
- [x] Goal-template conformance harness passes 100% on G-PROOF-003 with zero violations.

## Test plan

- Unit tests verifying nominal execution and edge-case invariants
- Negative tests verifying fail-closed rejection of invalid payloads
- Conformance verification via automated harness

## Touch map

- `docs/07-backlog/goals/_archived/G-PROOF-003.md`
- `schemas/goal-contract.schema.json`
- `scripts/lib/goal-contract-schema.mjs`
- `tests/unit/test-goal-contract-schema.mjs`

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
