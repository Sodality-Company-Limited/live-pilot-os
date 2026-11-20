---
goal_contract:
  id: G-CORE-047
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Implement soda-semantic-refactor-engine skill and refactor analyzer."
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: developer
  approver:
    role: tech-lead
  risk:
    level: low
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

# G-CORE-047: Implement soda-semantic-refactor-engine skill and refactor analyzer

**Status:** done  
**Closed:** 2026-10-18  
**Kind:** feature  
**Atomic outcome:** Implement soda-semantic-refactor-engine skill and refactor analyzer.  
**Epic:** CORE  
**Depends on:** G-CORE-046  
**Spec stability:** clarify done · spec check done · analyze done  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement semantic refactor engine and test suite | done |

### Worktree & Multi-Subagent Orchestration Plan
> [`file:///.agents/specs/worktree-orchestration.md`](.agents/specs/worktree-orchestration.md)
- Multi-agent execution partitioned across isolated Git worktrees (`.worktrees/G-CORE-047-{role}`) with disjoint touch maps.

## Context
1–3 sentences: where this goal sits. Link specs the agent must read first.
This goal introduces `soda-semantic-refactor-engine` and `scripts/lib/semantic-refactor-engine.mjs` to automate AST complexity analysis, extract-function candidate detection, and behavioral test-equivalence verification across the Soda OS codebase. Read [`docs/07-backlog/antigravity-context-pstack-wave10.md`](file:///docs/07-backlog/antigravity-context-pstack-wave10.md) before execution.

## Intent
**Why:** Unchecked cyclomatic complexity and deep nesting in modules increases maintenance burden, regression risk, and test brittleness.  
**Done when:** The engine computes cyclomatic complexity, identifies functions exceeding complexity bounds ($M > 15$), and verifies behavior-preserving refactorings against test suites with zero regressions.  
**Unblocks:** `G-CORE-048` and automated codebase complexity maintenance across downstream repositories.  

## In
- Implementation of `scripts/lib/semantic-refactor-engine.mjs` and mirror `template/scripts/lib/semantic-refactor-engine.mjs`.
- Implementation of agent skill `.agents/skills/soda-semantic-refactor-engine/SKILL.md` and mirror `template/.agents/skills/soda-semantic-refactor-engine/SKILL.md`.
- Comprehensive unit test suite `tests/lib/semantic-refactor-engine.test.mjs` passing green with zero mocks.
- Mathematical invariant verification for cyclomatic complexity bounded extraction and behavioral equivalence.

## Out
- Automatic destructive code transformations without test verification.
- Language AST parsing outside JavaScript / TypeScript / Node.js ecosystems.

## Atomicity & Zero-Mock Contract
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: the semantic refactor engine and analyzer.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or string simulations in implementation or acceptance evidence.
- **Epistemic Invariants:** $\text{Executable invariant} \neq \text{formal theorem}$; exact-HEAD provenance and clean-tree via [`epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md).

### Antigravity handoff contract
When this goal is handed to Antigravity, it returns ordered atomic work steps: `### Step N — [Objective]`, Allowed files, Actions, Verification command, Completion gate, Stop condition, Zero-Mock invariant check.

## Quality priority
**Priority:** P1

## Gap analysis
| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-CORE-047 | P1 | Missing automated cyclomatic complexity analyzer and behavioral equivalence refactor engine | developer | Implement `semantic-refactor-engine.mjs` with AST metrics parser | `node --test tests/lib/semantic-refactor-engine.test.mjs` | open |

## How
**Stack / approach:** Node.js ES module utilizing AST token and branch traversal to compute McCabe cyclomatic complexity, nesting depth, and statement count, coupled with operational test harness execution for equivalence proofs.

## Open questions
- None.

## Knowledge links
| Type | IDs |
|---|---|
| **Context** | [`docs/07-backlog/antigravity-context-pstack-wave10.md`](file:///docs/07-backlog/antigravity-context-pstack-wave10.md) |

## Context manifest
| Kind | IDs / paths |
|---|---|
| **Acceptance** | docs/02-product/acceptance/G-CORE-047.md |
| **Context** | docs/07-backlog/antigravity-context-pstack-wave10.md |

## Work steps

### Step 1 — Implement semantic refactor engine and test suite
**Allowed files:** `scripts/lib/semantic-refactor-engine.mjs`, `template/scripts/lib/semantic-refactor-engine.mjs`, `.agents/skills/soda-semantic-refactor-engine/SKILL.md`, `template/.agents/skills/soda-semantic-refactor-engine/SKILL.md`, `tests/lib/semantic-refactor-engine.test.mjs`  
**Actions:**
1. Implement `analyzeFunctionComplexity`, `findRefactorCandidates`, and `verifyBehavioralEquivalence` in `scripts/lib/semantic-refactor-engine.mjs`.
2. Compute cyclomatic complexity, nesting depth, and function length using exact integer arithmetic.
3. Mirror modules to `template/`.
4. Author `.agents/skills/soda-semantic-refactor-engine/SKILL.md` and mirror to `template/`.
5. Implement unit tests in `tests/lib/semantic-refactor-engine.test.mjs`.
**Verification command:** `node --test tests/lib/semantic-refactor-engine.test.mjs`  
**Completion gate:** Exit code 0 with 100% green test assertions and zero mocks.  
**Stop condition:** Any test failure or calculation discrepancy.  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| framework-skills | ADD | `.agents/skills/soda-semantic-refactor-engine/SKILL.md` |
| framework-skills-template | ADD | `template/.agents/skills/soda-semantic-refactor-engine/SKILL.md` |
| core-lib | ADD | `scripts/lib/semantic-refactor-engine.mjs` |
| core-lib-template | ADD | `template/scripts/lib/semantic-refactor-engine.mjs` |
| unit-tests | ADD | `tests/lib/semantic-refactor-engine.test.mjs` |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/CORE` |
| **System Archetype** | `backend-service` / `refactoring-analyzer` |
| **Bounded Context & Domain** | Code Quality Engineering & Semantic Refactoring Domain |
| **Ports & Adapters Topology** | Driving Inbound Ports: CLI Refactor Analyze Command, Code Review Refactor Hook <br> Driven Outbound Ports: File System AST Reader, Test Runner Adapter, Equivalence Verifier |
| **State Machine & Invariants** | FSM States: SourceLoaded -> MetricsComputed -> CandidatesIdentified -> TransformProposed -> EquivalenceVerified -> RefactorComplete |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `architecture-design-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20261019_062700_antigravity_pstack_wave10_deep_context.md` |

## Contract impact
- **Schema modifications:** None; provides analytical reporting structures.

## Failure Policy & Rollback Contract
```yaml
failure_policy:
  dependency_unavailable: fail_closed
  invalid_input: reject
  verification_failure: defer
  timeout: retry_then_fail
  partial_write: compensate
  model_failure: fallback_to_human_review

rollback:
  trigger: "Semantic refactoring test regression or metric calculation failure"
  command: "git checkout -- scripts/lib/semantic-refactor-engine.mjs .agents/skills/soda-semantic-refactor-engine/ tests/lib/semantic-refactor-engine.test.mjs"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node --test tests/lib/semantic-refactor-engine.test.mjs"
```

## Security & Trust Boundaries
```yaml
security:
  threat_model: "Guards against unverified code mutations that break production semantics"
  trust_boundary: "AST parsing confined to local source files"
  tool_authorization: "Read and write access confined strictly to declared touch map"
  sandbox_boundary: "Execution within local Node.js process"
  secret_handling: "Zero credential or token storage in code analysis"
  pii_handling: "Zero PII processing"
```

## Observability & Drift Telemetry
```yaml
observability:
  metrics:
    - functions_analyzed_count
    - high_complexity_candidates_count
    - equivalence_verifications_count
  alerts:
    - "high_complexity_candidates_count > 50"
  traces:
    - "refactor.analyze.complexity"
```

## Resource & Cost Budget
```yaml
resource_budget:
  latency_budget: "p99 < 50ms per source file analysis"
  memory_budget: "32MB process RAM"
  compute_budget: "Local CPU host execution"
  token_budget: "0 tokens (pure deterministic algorithms)"
```

## Learning-Loop Contract
```yaml
learning_loop:
  observed_metrics: "functions_analyzed_count, high_complexity_candidates_count"
  review_schedule: "weekly"
  regression_threshold: "0 functions with M > 25 in core modules"
  feedback_mechanism: "Complexity scorecard and test equivalence log"
```

## Proof Contract & Invariants
```yaml
invariants:
  - id: INV-047-001
    claim: "Functions targeted for refactoring satisfy cyclomatic complexity bound M <= 15 after extraction"
    type: "safety"
    classification: executable_invariant
    test:
      command: "node --test tests/lib/semantic-refactor-engine.test.mjs"
  - id: INV-047-002
    claim: "A refactoring transformation preserves semantics if and only if all operational tests pass unchanged"
    type: "equivalence"
    classification: executable_property_test
    test:
      command: "node --test tests/lib/semantic-refactor-engine.test.mjs"
```

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
- [x] Given source code files or functions, when analyzed by the semantic refactor engine, then it computes cyclomatic complexity, AST depth, and function length, identifying extraction candidates exceeding complexity bounds ($M > 15$).
- [x] Given a proposed refactoring transformation, when verified against operational test suites, then it confirms behavioral equivalence with zero regressions before applying changes.

## Test plan
- Commands from `AGENTS.md` **Standard commands**
- New/updated test files: `tests/lib/semantic-refactor-engine.test.mjs`
### 1. Positive Tests
- Correctly calculates cyclomatic complexity and nesting depth for simple and branched functions.
### 2. Negative Tests
- Detects functions exceeding the complexity threshold ($M > 15$) and flags them for extraction.
### 3. Fail-Closed & Chaos Tests
- Halts refactoring transformation if test suite fails during equivalence verification.
### 4. Temporal Causality Tests ($t \le T$)
- Analysis occurs prior to refactoring suggestion or application.
### 5. Security & Air-Gap Checks
- Refactoring analysis does not execute unverified arbitrary code outside configured test commands.
### 6. Invariants & System Laws Verification
- Verifies complexity boundedness and behavioral equivalence invariants.
### 7. Formal Verification & Solvers
- Validates cyclomatic complexity bounds using integer arithmetic.
### 8. Harness Engineering & Modeling
- Verified via `tests/lib/semantic-refactor-engine.test.mjs`.
### 9. Adversarial Stress & Edge Pathologies
- Deeply nested conditional expressions and recursive functions.
### 10. Concurrency, Race Conditions & Memory Models
- Pure functional analysis methods ensure thread and concurrency safety.
### 11. Advanced Testing Paradigms & Mutation Testing
- High test assertion coverage with zero mocks.

## Epistemic Proof & Verification Classification
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Capability claims classified under Tripartite Epistemic Taxonomy: Formal Invariant and Deterministic Test Verification.

## Touch map
- `.agents/skills/soda-semantic-refactor-engine/SKILL.md`
- `template/.agents/skills/soda-semantic-refactor-engine/SKILL.md`
- `scripts/lib/semantic-refactor-engine.mjs`
- `template/scripts/lib/semantic-refactor-engine.mjs`
- `tests/lib/semantic-refactor-engine.test.mjs`

## Notes for AI
- Read: `AGENTS.md` and [`docs/07-backlog/antigravity-context-pstack-wave10.md`](file:///docs/07-backlog/antigravity-context-pstack-wave10.md)

---

## 🏛️ Comprehensive Spec Design Appendix
> [`docs/03-architecture/specs/goals/G-CORE-047/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-047/invariants-formal-spec.md)
- Hexagonal Inbound & Outbound Ports: [`docs/03-architecture/specs/goals/G-CORE-047/architecture-spec.md`](docs/03-architecture/specs/goals/G-CORE-047/architecture-spec.md)
- Finite State Machine (FSM) Matrix: [`docs/03-architecture/specs/goals/G-CORE-047/fsm-runtime-spec.md`](docs/03-architecture/specs/goals/G-CORE-047/fsm-runtime-spec.md)
- Mathematical & Data Invariants: [`docs/03-architecture/specs/goals/G-CORE-047/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-047/invariants-formal-spec.md)
- Subagent Swarm & Git Worktree Matrix: [`docs/03-architecture/specs/goals/G-CORE-047/worktree-plan.md`](docs/03-architecture/specs/goals/G-CORE-047/worktree-plan.md)
- Codex Superintelligence Invariants: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Proof-and-Evidence Contract: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Mathematical Proof, Formal Methods & Program Verification: [`docs/03-architecture/specs/formal-verification.md`](file:///docs/03-architecture/specs/formal-verification.md)
