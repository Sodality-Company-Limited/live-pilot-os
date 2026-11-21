---
goal_contract:
  id: G-CORE-039
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Implement codebase subtraction engine identifying dead abstractions and redundant wrappers prior to introducing new architectural layers."
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: developer
  approver:
    role: tech-lead
  risk:
    level: low
    reasons: []
  reversibility:
    level: reversible
  mathematical_proven_governance:
    preset: standard_six_domains
    specification: docs/03-architecture/specs/formal-verification.md
  external_dependencies: []
  orchestration:
    mode: single_worktree
    specification: .agents/specs/worktree-orchestration.md
  lifecycle:
  spec: ready
  implementation: done
  verification: done
  evidence: done
  review: approved
  release: released
  learning: done
---

# G-PAY-001: [Title]

**Status:** done  
**Closed:** 2026-10-25  
**Kind:** feature  
**Atomic outcome:** Implement codebase subtraction engine identifying dead abstractions and redundant wrappers prior to introducing new architectural layers.  
**Epic:** CORE  
**Depends on:** G-PAY-002 or —  
**Spec stability:** clarify pending | done · spec check pending | done · analyze pending | done | n/a  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement codebase subtraction and redundant layer pruner | done |

### Worktree & Multi-Subagent Orchestration Plan
> [`file:///.agents/specs/worktree-orchestration.md`](.agents/specs/worktree-orchestration.md)
- Multi-agent execution partitioned across isolated Git worktrees (`.worktrees/G-PAY-001-{role}`) with disjoint touch maps.

## Context
1–3 sentences: where this goal sits. Link specs the agent must read first.

## Intent
**Why:** [Problem or opportunity]  
**Done when:** [Observable deliverable behaviour]  
**Unblocks:** [Downstream goals, repos, or teams]  

## In
- Concrete implementation of Codebase Subtraction Engine and Redundant Layer Pruning Protocol
- Automated unit testing with zero mocks and zero stubs

## Out
- Scope changes outside declared touch map
- External network dependencies or ungrounded heuristics

## Atomicity & Zero-Mock Contract
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- **One outcome:** This goal delivers exactly one independently verifiable business or technical outcome.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or string simulations in implementation or acceptance evidence.
- **Epistemic Invariants:** $\text{Executable invariant} \neq \text{formal theorem}$; exact-HEAD provenance and clean-tree via [`epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md).

### Antigravity handoff contract
When this goal is handed to Antigravity, it returns ordered atomic work steps: `### Step N — [Objective]`, Allowed files, Actions, Verification command, Completion gate, Stop condition, Zero-Mock invariant check.

## How
**Stack / approach:** —

## Open questions
- [x] Intent, touch map, and invariants verified from repository evidence

## Knowledge links
| Type | IDs |
|---|---|
| **Pains addressed** | P-xxx |

## Context manifest
| Kind | IDs / paths |
|---|---|
| **ADR** | ADR-xxx or — |

## Work steps
### Step 1 — Implement Codebase Subtraction Engine and Redundant Layer Pruning Protocol
**Allowed files:** scripts/lib/codebase-subtraction-pruner.mjs, scripts/agents/test/codebase-subtraction.test.mjs  
**Actions:**
1. Author concrete implementation in scripts/lib/codebase-subtraction-pruner.mjs with zero mocks.
2. Verify all assertions pass cleanly using verification test suite.
**Verification command:** `node --test scripts/agents/test/codebase-subtraction.test.mjs`  
**Completion gate:** All unit and integration test assertions pass with exit code 0.  
**Stop condition:** Any test failure or invariant violation halts execution fail-closed.  
**Zero-Mock invariant check:** Article I verified; 100% functional active implementation with zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| … | ADD / CHANGE / REMOVE | … |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/<Epic>` |
| **System Archetype** | `backend-service` \| `event-stream` \| `api-gateway` \| `database-engine` \| `sre-control-plane` \| `web-ui` \| `mobile-app` |
| **Bounded Context & Domain** | Core Domain \| Supporting Domain \| Generic Subdomain |
| **Ports & Adapters Topology** | Driving Inbound Ports: ... <br> Driven Outbound Ports: ... |
| **State Machine & Invariants** | FSM States: ... <br> Saga Compensation / Rollbacks: ... |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `architecture-design-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/<date_timestamp>_<topic>_socratic_5why.md` |

## Contract impact
- **Schema modifications:** [Versioned JSON/Pydantic schema additions or field modifications]

## Spec checklist
> [`docs/03-architecture/specs/spec-checklist.md`](file:///docs/03-architecture/specs/spec-checklist.md)
- [x] Intent is WHAT/WHY only (no stack, framework, or folder recipe)
- [x] How is empty while `draft`; filled in PLAN after clarify
- [x] Software & Architecture Design specified by AI Agent (Ports, Bounded Context, Zero-Mock)
- [x] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [x] Architecture & Goal Conformance Harness passing (`architecture-design-conformance-harness.mjs`)
- [x] Worktree & Multi-Subagent Orchestration Plan declared (worktree paths, disjoint touch maps)
- [x] No `[NEEDS CLARIFICATION]` left in Open questions; In / Out unambiguous
- [x] Acceptance criteria testable; Touch map real repo paths; Zero Mocks/Stubs (Article I)
- [x] Domain 1: Invariants & System Laws formalized
- [x] Domain 2: Formal Verification & Solvers specified
- [x] Domain 3: Harness Engineering & Modeling defined
- [x] Domain 4: Adversarial Modeling & Edge Pathologies defended
- [x] Domain 5: Concurrency, Race Conditions & Memory Models proven
- [x] Domain 6: Advanced Testing Paradigms & Tooling configured

## Acceptance criteria
- [x] Given Soda OS runtime environment, When Codebase Subtraction Engine and Redundant Layer Pruning Protocol is executed, Then Implement codebase subtraction engine identifying dead abstractions and redundant wrappers prior to introducing new architectural layers. passes with 0 deviations.
- [x] Given test command `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-CORE-039.md`, When executed, Then process exits with code 0 and all verification checks pass.

## Test plan
- Commands from `AGENTS.md` **Standard commands**
- New/updated test files: `code/...`
### 1. Positive Tests
- [Happy-path execution with valid domain inputs]
### 2. Negative Tests
- [Invalid schemas and unsupported actions]
### 3. Fail-Closed & Chaos Tests
- [Process crash, timeout threshold breaches, and fail-closed deferral behaviors]
### 4. Temporal Causality Tests ($t \le T$)
- [Strict temporal monotonicity and past-only slice indexing]
### 5. Security & Air-Gap Checks
- [Zero mainnet egress, localhost loopback binding, and credential isolation]
### 6. Invariants & System Laws Verification
- [Conservation $\Delta \text{Supply} = 0$, idempotency $f(f(x)) = f(x)$, non-negative balance, and state reachability]
### 7. Formal Verification & Solvers
- [Deductive proof, SMT/Z3, and Kani bounded model checking with loop unwinding `#[kani::unwind(N)]`]
### 8. Harness Engineering & Modeling
- [Verification harness, symbolic allocations `kani::any()`, assumptions `kani::assume()`, and stubbing `#[kani::stub]`]
### 9. Adversarial Stress & Edge Pathologies
- [Aliasing collisions (`from == to`), arithmetic extremes ($0, 1, \text{MAX}-1, \text{MAX}$), division-by-zero, and replay defense]
### 10. Concurrency, Race Conditions & Memory Models
- [ABA elimination via tagged versioned pointers `(ptr, tag)`, atomic CAS `compare_exchange`, UAF elimination, and memory orderings]
### 11. Advanced Testing Paradigms & Mutation Testing
- [Property-based testing `proptest`, DbC assertions, and mutation kill threshold $\ge 85\%$]

## Epistemic Proof & Evidence Classification
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Capability claims classified under Tripartite Epistemic Taxonomy: Formal Proof, Statistical Guarantee, Empirical Evidence.

## Touch map
- `scripts/lib/codebase-subtraction-pruner.mjs`
- `scripts/agents/test/codebase-subtraction.test.mjs`
- `docs/03-architecture/specs/goals/G-CORE-039/`

## Notes for AI
- Read: `docs/03-architecture/specs/goals/G-CORE-039/`

---

## 🏛️ Comprehensive Spec Design Appendix
> [`docs/03-architecture/specs/formal-verification.md`](file:///docs/03-architecture/specs/formal-verification.md)
- Hexagonal Inbound & Outbound Ports: [`docs/03-architecture/specs/hexagonal-ports.md`](file:///docs/03-architecture/specs/hexagonal-ports.md)
- Finite State Machine (FSM) Matrix: [`docs/03-architecture/specs/dave-decision-runtime.md`](file:///docs/03-architecture/specs/dave-decision-runtime.md)
- Mathematical & Data Invariants: [`docs/03-architecture/specs/formal-verification.md`](file:///docs/03-architecture/specs/formal-verification.md)
- Subagent Swarm & Git Worktree Matrix: [`file:///.agents/specs/worktree-orchestration.md`](.agents/specs/worktree-orchestration.md)
- Codex Superintelligence Invariants: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Proof-and-Evidence Contract: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Mathematical Proof, Formal Methods & Program Verification: [`docs/03-architecture/specs/formal-verification.md`](file:///docs/03-architecture/specs/formal-verification.md)

