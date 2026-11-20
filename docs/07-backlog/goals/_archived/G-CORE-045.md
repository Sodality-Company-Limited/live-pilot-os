---
goal_contract:
  id: G-CORE-045
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Implement soda-empirical-eval-runner skill and multi-trial benchmark evaluator."
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

# G-CORE-045: Implement soda-empirical-eval-runner skill and multi-trial benchmark evaluator

**Status:** done  
**Closed:** 2026-10-18  
**Kind:** feature  
**Atomic outcome:** Implement soda-empirical-eval-runner skill and multi-trial benchmark evaluator.  
**Epic:** CORE  
**Depends on:** G-CORE-044  
**Spec stability:** clarify done · spec check done · analyze n/a  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement empirical eval runner driver and test suite | done |

### Worktree & Multi-Subagent Orchestration Plan
> [`file:///.agents/specs/worktree-orchestration.md`](.agents/specs/worktree-orchestration.md)
- Multi-agent execution partitioned across isolated Git worktrees (`.worktrees/G-CORE-045-{role}`) with disjoint touch maps.

## Context
1–3 sentences: where this goal sits. Link specs the agent must read first.
This goal introduces `soda-empirical-eval-runner` and `scripts/lib/empirical-eval-runner.mjs` to execute multi-trial empirical benchmarks, calculate deterministic pass@k metrics in exact integer basis points without floating-point math, track execution latency in microseconds, and emit cryptographic evaluation receipts. Read [`docs/07-backlog/antigravity-context-pstack-wave9.md`](file:///docs/07-backlog/antigravity-context-pstack-wave9.md) before execution.

## Intent
**Why:** Evaluating prompt effectiveness and model accuracy across agent sessions often relies on ungrounded heuristics or floating-point approximations; structured empirical evals require multi-trial test runners with exact integer scoring and cryptographic proof receipts.  
**Done when:** The eval runner executes trial test cases, computes integer pass@k metrics, and outputs certified evaluation receipts bound to test fixture digests.  
**Unblocks:** `G-CORE-046` and rigorous empirical agent evaluation across Soda OS.  

## In
- Implementation of `scripts/lib/empirical-eval-runner.mjs` and mirror `template/scripts/lib/empirical-eval-runner.mjs`.
- Implementation of agent skill `.agents/skills/soda-empirical-eval-runner/SKILL.md` and mirror `template/.agents/skills/soda-empirical-eval-runner/SKILL.md`.
- Comprehensive unit test suite `tests/lib/empirical-eval-runner.test.mjs` passing green with zero mocks.
- Mathematical invariant verification for eval determinism and integer metric bounds.

## Out
- Interacting with external cloud model API billing providers.
- Modifying test fixture input contents.

## Atomicity & Zero-Mock Contract
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: the multi-trial empirical eval runner.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or string simulations in implementation or acceptance evidence.
- **Epistemic Invariants:** $\text{Executable invariant} \neq \text{formal theorem}$; exact-HEAD provenance and clean-tree via [`epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md).

### Antigravity handoff contract
When this goal is handed to Antigravity, it returns ordered atomic work steps: `### Step N — [Objective]`, Allowed files, Actions, Verification command, Completion gate, Stop condition, Zero-Mock invariant check.

## Quality priority
**Priority:** P1

## Gap analysis
| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-CORE-045 | P1 | Missing multi-trial benchmark evaluation runner with zero-float pass@k integer scoring | developer | Implement `empirical-eval-runner.mjs` with integer scoring | `node --test tests/lib/empirical-eval-runner.test.mjs` | open |

## How
**Stack / approach:** Node.js ES module providing `runEmpiricalEval`, `computePassAtKBasisPoints`, and `createEvalReceipt` with high-resolution integer microsecond timing and exact BigInt math.

## Open questions
- None.

## Knowledge links
| Type | IDs |
|---|---|
| **Context** | [`docs/07-backlog/antigravity-context-pstack-wave9.md`](file:///docs/07-backlog/antigravity-context-pstack-wave9.md) |

## Context manifest
| Kind | IDs / paths |
|---|---|
| **Acceptance** | docs/02-product/acceptance/G-CORE-045.md |
| **Context** | docs/07-backlog/antigravity-context-pstack-wave9.md |

## Work steps

### Step 1 — Implement empirical eval runner driver and test suite
**Allowed files:** `scripts/lib/empirical-eval-runner.mjs`, `template/scripts/lib/empirical-eval-runner.mjs`, `.agents/skills/soda-empirical-eval-runner/SKILL.md`, `template/.agents/skills/soda-empirical-eval-runner/SKILL.md`, `tests/lib/empirical-eval-runner.test.mjs`  
**Actions:**
1. Implement `runEmpiricalEval`, `computePassAtKBasisPoints`, and `createEvalReceipt` in `scripts/lib/empirical-eval-runner.mjs`.
2. Support multi-trial execution, integer basis point metrics, and cryptographic receipt emission.
3. Mirror modules to `template/`.
4. Author `.agents/skills/soda-empirical-eval-runner/SKILL.md` and mirror to `template/`.
5. Implement unit tests in `tests/lib/empirical-eval-runner.test.mjs`.
**Verification command:** `node --test tests/lib/empirical-eval-runner.test.mjs`  
**Completion gate:** Exit code 0 with 100% green test assertions and zero mocks.  
**Stop condition:** Any test failure or floating-point metric usage.  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| framework-skills | ADD | `.agents/skills/soda-empirical-eval-runner/SKILL.md` |
| framework-skills-template | ADD | `template/.agents/skills/soda-empirical-eval-runner/SKILL.md` |
| core-lib | ADD | `scripts/lib/empirical-eval-runner.mjs` |
| core-lib-template | ADD | `template/scripts/lib/empirical-eval-runner.mjs` |
| unit-tests | ADD | `tests/lib/empirical-eval-runner.test.mjs` |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/CORE` |
| **System Archetype** | `backend-service` / `eval-runner` |
| **Bounded Context & Domain** | Empirical Agent Evaluation & Benchmark Domain |
| **Ports & Adapters Topology** | Driving Inbound Ports: CLI Eval Run Trigger, CI Benchmark Evaluation Gate <br> Driven Outbound Ports: Trial Execution Engine, Cryptographic Proof Receipt Generator, Zero-Float Metric Evaluator |
| **State Machine & Invariants** | FSM States: FixturesLoaded -> ParametersValidated -> TrialsCompleted -> MetricsCalculated -> ReceiptCertified |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `architecture-design-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20261019_002500_antigravity_pstack_wave9_deep_context.md` |

## Contract impact
- **Schema modifications:** None; typed empirical evaluation receipt format.

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
  trigger: "Trial execution timeout or evaluation metric calculation error"
  command: "git checkout -- scripts/lib/empirical-eval-runner.mjs .agents/skills/soda-empirical-eval-runner/ tests/lib/empirical-eval-runner.test.mjs"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node --test tests/lib/empirical-eval-runner.test.mjs"
```

## Security & Trust Boundaries
```yaml
security:
  threat_model: "Guards against denial-of-service through runaway evaluation loops and metric tampering"
  trust_boundary: "Test trial cases executed with strictly bounded iteration caps"
  tool_authorization: "Read-only access to evaluation fixtures"
  sandbox_boundary: "Execution within local process memory"
  secret_handling: "Zero logging of credentials in evaluation receipts"
  pii_handling: "Zero PII processing"
```

## Observability & Drift Telemetry
```yaml
observability:
  metrics:
    - evals_executed_count
    - avg_trial_latency_us
    - overall_pass_rate_bp
  alerts:
    - "overall_pass_rate_bp < 5000"
  traces:
    - "framework.eval.run"
```

## Resource & Cost Budget
```yaml
resource_budget:
  latency_budget: "p99 < 500ms per evaluation suite"
  memory_budget: "32MB process RAM"
  compute_budget: "Local CPU host execution"
  token_budget: "0 tokens (pure deterministic algorithms)"
```

## Learning-Loop Contract
```yaml
learning_loop:
  observed_metrics: "evals_executed_count, overall_pass_rate_bp"
  review_schedule: "weekly"
  regression_threshold: "0 metric degradation below baseline"
  feedback_mechanism: "Evaluation scorecard"
```

## Proof Contract & Invariants
```yaml
invariants:
  - id: INV-045-001
    claim: "Evaluating identical test fixtures with identical random seeds produces bitwise identical pass counts, pass@k metrics, and failure traces"
    type: "determinism"
    classification: executable_invariant
    test:
      command: "node --test tests/lib/empirical-eval-runner.test.mjs"
  - id: INV-045-002
    claim: "All pass rates and evaluation scores are computed in exact integer basis points in [0, 10000] with zero floats"
    type: "bounds"
    classification: executable_property_test
    test:
      command: "node --test tests/lib/empirical-eval-runner.test.mjs"
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
- [x] Given a suite of test evaluation cases executed over N trials, when evaluated by the runner, then it computes deterministic pass@k rates in exact integer basis points without floating-point math.
- [x] Given an evaluation execution, when completed, then it emits a cryptographic evaluation receipt recording microsecond latency and input fixture SHA-256 digests.

## Test plan
- Commands from `AGENTS.md` **Standard commands**
- New/updated test files: `tests/lib/empirical-eval-runner.test.mjs`
### 1. Positive Tests
- Executes test trials and computes exact integer basis points ($10000$ for 100% pass).
### 2. Negative Tests
- Accurately captures and counts trial failures without crashing.
### 3. Fail-Closed & Chaos Tests
- Rejects zero total trials or non-array case suites.
### 4. Temporal Causality Tests ($t \le T$)
- Trial execution timestamps precede evaluation receipt generation.
### 5. Security & Air-Gap Checks
- Enforces execution timeouts preventing infinite loops.
### 6. Invariants & System Laws Verification
- Determinism and integer metric bounds verified.
### 7. Formal Verification & Solvers
- Discrete integer arithmetic invariant verified.
### 8. Harness Engineering & Modeling
- Verified via `tests/lib/empirical-eval-runner.test.mjs`.
### 9. Adversarial Stress & Edge Pathologies
- 100 concurrent trial runs.
### 10. Concurrency, Race Conditions & Memory Models
- Concurrency isolation across asynchronous trial iterations.
### 11. Advanced Testing Paradigms & Mutation Testing
- High test assertion density with zero mocks.

## Epistemic Proof & Verification Classification
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Capability claims classified under Tripartite Epistemic Taxonomy: Formal Invariant and Deterministic Test Verification.

## Touch map
- `.agents/skills/soda-empirical-eval-runner/SKILL.md`
- `template/.agents/skills/soda-empirical-eval-runner/SKILL.md`
- `scripts/lib/empirical-eval-runner.mjs`
- `template/scripts/lib/empirical-eval-runner.mjs`
- `tests/lib/empirical-eval-runner.test.mjs`

## Notes for AI
- Read: `AGENTS.md` and [`docs/07-backlog/antigravity-context-pstack-wave9.md`](file:///docs/07-backlog/antigravity-context-pstack-wave9.md)

---

## 🏛️ Comprehensive Spec Design Appendix
> [`docs/03-architecture/specs/goals/G-CORE-045/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-045/invariants-formal-spec.md)
- Hexagonal Inbound & Outbound Ports: [`docs/03-architecture/specs/goals/G-CORE-045/architecture-spec.md`](docs/03-architecture/specs/goals/G-CORE-045/architecture-spec.md)
- Finite State Machine (FSM) Matrix: [`docs/03-architecture/specs/goals/G-CORE-045/fsm-runtime-spec.md`](docs/03-architecture/specs/goals/G-CORE-045/fsm-runtime-spec.md)
- Mathematical & Data Invariants: [`docs/03-architecture/specs/goals/G-CORE-045/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-045/invariants-formal-spec.md)
- Subagent Swarm & Git Worktree Matrix: [`docs/03-architecture/specs/goals/G-CORE-045/worktree-plan.md`](docs/03-architecture/specs/goals/G-CORE-045/worktree-plan.md)
- Codex Superintelligence Invariants: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Proof-and-Evidence Contract: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Mathematical Proof, Formal Methods & Program Verification: [`docs/03-architecture/specs/formal-verification.md`](file:///docs/03-architecture/specs/formal-verification.md)


## Closeout Notes

- **Closed Date:** 2026-10-18
- **Reason / Outcome:** Completed 100% implementation of empirical-eval-runner and tests green
