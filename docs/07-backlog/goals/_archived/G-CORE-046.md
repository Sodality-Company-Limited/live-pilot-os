---
goal_contract:
  id: G-CORE-046
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Implement soda-intent-playbook-router skill and task intent classifier."
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

# G-CORE-046: Implement soda-intent-playbook-router skill and task intent classifier

**Status:** done  
**Closed:** 2026-10-18  
**Kind:** feature  
**Atomic outcome:** Implement soda-intent-playbook-router skill and task intent classifier.  
**Epic:** CORE  
**Depends on:** G-CORE-045  
**Spec stability:** clarify done · spec check done · analyze n/a  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement intent playbook router driver and test suite | done |

### Worktree & Multi-Subagent Orchestration Plan
> [`file:///.agents/specs/worktree-orchestration.md`](.agents/specs/worktree-orchestration.md)
- Multi-agent execution partitioned across isolated Git worktrees (`.worktrees/G-CORE-046-{role}`) with disjoint touch maps.

## Context
1–3 sentences: where this goal sits. Link specs the agent must read first.
This goal introduces `soda-intent-playbook-router` and `scripts/lib/intent-playbook-router.mjs` to classify raw, unstructured developer prompts, map semantic intent to registered `soda-*` skills with monotonic integer confidence scoring, and emit executable BDD Given-When-Then scenarios without stochastic variation. Read [`docs/07-backlog/antigravity-context-pstack-wave9.md`](file:///docs/07-backlog/antigravity-context-pstack-wave9.md) before execution.

## Intent
**Why:** Agents receiving ambiguous or high-level user requests often struggle to select appropriate domain skills or hallucinate fictitious commands; a deterministic intent router maps prompts to canonical playbooks with proven confidence scoring.  
**Done when:** The router classifies user prompts, ranks matching skills with monotonic confidence scores, and outputs Given-When-Then BDD scenario skeletons.  
**Unblocks:** Autonomous prompt routing and zero-guesswork task activation across Soda OS.  

## In
- Implementation of `scripts/lib/intent-playbook-router.mjs` and mirror `template/scripts/lib/intent-playbook-router.mjs`.
- Implementation of agent skill `.agents/skills/soda-intent-playbook-router/SKILL.md` and mirror `template/.agents/skills/soda-intent-playbook-router/SKILL.md`.
- Comprehensive unit test suite `tests/lib/intent-playbook-router.test.mjs` passing green with zero mocks.
- Mathematical invariant verification for classification determinism and monotonic confidence ranking.

## Out
- Modifying underlying registered agent skill implementations.
- Executing code or mutating workspace files during routing analysis.

## Atomicity & Zero-Mock Contract
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: the task intent classifier and playbook router.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or string simulations in implementation or acceptance evidence.
- **Epistemic Invariants:** $\text{Executable invariant} \neq \text{formal theorem}$; exact-HEAD provenance and clean-tree via [`epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md).

### Antigravity handoff contract
When this goal is handed to Antigravity, it returns ordered atomic work steps: `### Step N — [Objective]`, Allowed files, Actions, Verification command, Completion gate, Stop condition, Zero-Mock invariant check.

## Quality priority
**Priority:** P1

## Gap analysis
| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-CORE-046 | P1 | Missing deterministic task intent classifier and skill playbook router | developer | Implement `intent-playbook-router.mjs` with trigger matcher | `node --test tests/lib/intent-playbook-router.test.mjs` | open |

## How
**Stack / approach:** Node.js ES module providing `classifyTaskIntent`, `rankSkillCandidates`, and `generateBddSkeleton` with exact basis point scoring and tokenized trigger evaluation.

## Open questions
- None.

## Knowledge links
| Type | IDs |
|---|---|
| **Context** | [`docs/07-backlog/antigravity-context-pstack-wave9.md`](file:///docs/07-backlog/antigravity-context-pstack-wave9.md) |

## Context manifest
| Kind | IDs / paths |
|---|---|
| **Acceptance** | docs/02-product/acceptance/G-CORE-046.md |
| **Context** | docs/07-backlog/antigravity-context-pstack-wave9.md |

## Work steps

### Step 1 — Implement intent playbook router driver and test suite
**Allowed files:** `scripts/lib/intent-playbook-router.mjs`, `template/scripts/lib/intent-playbook-router.mjs`, `.agents/skills/soda-intent-playbook-router/SKILL.md`, `template/.agents/skills/soda-intent-playbook-router/SKILL.md`, `tests/lib/intent-playbook-router.test.mjs`  
**Actions:**
1. Implement `classifyTaskIntent`, `rankSkillCandidates`, and `generateBddSkeleton` in `scripts/lib/intent-playbook-router.mjs`.
2. Support semantic trigger scoring, monotonic sorting, and BDD scenario generation.
3. Mirror modules to `template/`.
4. Author `.agents/skills/soda-intent-playbook-router/SKILL.md` and mirror to `template/`.
5. Implement unit tests in `tests/lib/intent-playbook-router.test.mjs`.
**Verification command:** `node --test tests/lib/intent-playbook-router.test.mjs`  
**Completion gate:** Exit code 0 with 100% green test assertions and zero mocks.  
**Stop condition:** Any test failure or non-monotonic ranking.  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| framework-skills | ADD | `.agents/skills/soda-intent-playbook-router/SKILL.md` |
| framework-skills-template | ADD | `template/.agents/skills/soda-intent-playbook-router/SKILL.md` |
| core-lib | ADD | `scripts/lib/intent-playbook-router.mjs` |
| core-lib-template | ADD | `template/scripts/lib/intent-playbook-router.mjs` |
| unit-tests | ADD | `tests/lib/intent-playbook-router.test.mjs` |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/CORE` |
| **System Archetype** | `backend-service` / `intent-router` |
| **Bounded Context & Domain** | Semantic Intent Classification & Autonomous Playbook Routing Domain |
| **Ports & Adapters Topology** | Driving Inbound Ports: CLI Prompt Router Command, Autonomous Swarm Coordinator Intent Classifier <br> Driven Outbound Ports: Registered Skills Catalog Scanner, BDD Scenario Skeleton Generator, Confidence Ranking Engine |
| **State Machine & Invariants** | FSM States: PromptReceived -> TokensExtracted -> TriggersScored -> CandidatesRanked -> RoutingPlanEmitted |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `architecture-design-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20261019_002500_antigravity_pstack_wave9_deep_context.md` |

## Contract impact
- **Schema modifications:** None; typed intent classification JSON format.

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
  trigger: "Router exception or non-deterministic classification output"
  command: "git checkout -- scripts/lib/intent-playbook-router.mjs .agents/skills/soda-intent-playbook-router/ tests/lib/intent-playbook-router.test.mjs"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node --test tests/lib/intent-playbook-router.test.mjs"
```

## Security & Trust Boundaries
```yaml
security:
  threat_model: "Guards against prompt injection attacks attempting to trigger unauthorized administrative skills"
  trust_boundary: "Input prompts strictly tokenized and evaluated against declared trigger lists"
  tool_authorization: "Read-only access to skill metadata headers"
  sandbox_boundary: "Execution within local Node.js process"
  secret_handling: "Zero logging of confidential tokens or keys in intent outputs"
  pii_handling: "Zero PII processing"
```

## Observability & Drift Telemetry
```yaml
observability:
  metrics:
    - prompts_routed_count
    - top_match_confidence_bp
    - ambiguous_prompts_count
  alerts:
    - "ambiguous_prompts_count > 10"
  traces:
    - "framework.intent.route"
```

## Resource & Cost Budget
```yaml
resource_budget:
  latency_budget: "p99 < 25ms per prompt intent classification"
  memory_budget: "16MB process RAM"
  compute_budget: "Local CPU host execution"
  token_budget: "0 tokens (pure deterministic algorithms)"
```

## Learning-Loop Contract
```yaml
learning_loop:
  observed_metrics: "prompts_routed_count, top_match_confidence_bp"
  review_schedule: "weekly"
  regression_threshold: "0 misclassified standard workflow prompts"
  feedback_mechanism: "Intent routing scorecard"
```

## Proof Contract & Invariants
```yaml
invariants:
  - id: INV-046-001
    claim: "Evaluating identical user prompts against identical skill catalogs yields bitwise identical ranked skill lists"
    type: "determinism"
    classification: executable_invariant
    test:
      command: "node --test tests/lib/intent-playbook-router.test.mjs"
  - id: INV-046-002
    claim: "The returned candidate skill matches are sorted in strictly non-ascending order of confidence score in [0, 10000] basis points"
    type: "monotonicity"
    classification: executable_property_test
    test:
      command: "node --test tests/lib/intent-playbook-router.test.mjs"
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
- [x] Given an unstructured user prompt, when analyzed by the router, then it maps the prompt to matching registered `soda-*` skills with monotonic confidence scoring.
- [x] Given a classified intent match, when generating an execution roadmap, then it produces a structured Given-When-Then BDD scenario skeleton and recommended next actions without stochastic variation.

## Test plan
- Commands from `AGENTS.md` **Standard commands**
- New/updated test files: `tests/lib/intent-playbook-router.test.mjs`
### 1. Positive Tests
- Maps clear developer intent ("fix performance issue with heap snapshot") to `soda-runtime-trace-forensics` with high confidence.
### 2. Negative Tests
- Returns fallback status for completely unrelated or gibberish prompts.
### 3. Fail-Closed & Chaos Tests
- Handles empty or non-string prompts without throwing unhandled exceptions.
### 4. Temporal Causality Tests ($t \le T$)
- Ingestion precedes scoring and BDD generation.
### 5. Security & Air-Gap Checks
- Sanitizes prompt text preventing script injection.
### 6. Invariants & System Laws Verification
- Determinism and monotonic ranking invariants verified.
### 7. Formal Verification & Solvers
- Discrete confidence sorting verified.
### 8. Harness Engineering & Modeling
- Verified via `tests/lib/intent-playbook-router.test.mjs`.
### 9. Adversarial Stress & Edge Pathologies
- Long prompts (4000+ characters) with contradictory triggers.
### 10. Concurrency, Race Conditions & Memory Models
- Pure function execution guarantees safe concurrent evaluation.
### 11. Advanced Testing Paradigms & Mutation Testing
- High test assertion density with zero mocks.

## Epistemic Proof & Verification Classification
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Capability claims classified under Tripartite Epistemic Taxonomy: Formal Invariant and Deterministic Test Verification.

## Touch map
- `.agents/skills/soda-intent-playbook-router/SKILL.md`
- `template/.agents/skills/soda-intent-playbook-router/SKILL.md`
- `scripts/lib/intent-playbook-router.mjs`
- `template/scripts/lib/intent-playbook-router.mjs`
- `tests/lib/intent-playbook-router.test.mjs`

## Notes for AI
- Read: `AGENTS.md` and [`docs/07-backlog/antigravity-context-pstack-wave9.md`](file:///docs/07-backlog/antigravity-context-pstack-wave9.md)

---

## 🏛️ Comprehensive Spec Design Appendix
> [`docs/03-architecture/specs/goals/G-CORE-046/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-046/invariants-formal-spec.md)
- Hexagonal Inbound & Outbound Ports: [`docs/03-architecture/specs/goals/G-CORE-046/architecture-spec.md`](docs/03-architecture/specs/goals/G-CORE-046/architecture-spec.md)
- Finite State Machine (FSM) Matrix: [`docs/03-architecture/specs/goals/G-CORE-046/fsm-runtime-spec.md`](docs/03-architecture/specs/goals/G-CORE-046/fsm-runtime-spec.md)
- Mathematical & Data Invariants: [`docs/03-architecture/specs/goals/G-CORE-046/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-046/invariants-formal-spec.md)
- Subagent Swarm & Git Worktree Matrix: [`docs/03-architecture/specs/goals/G-CORE-046/worktree-plan.md`](docs/03-architecture/specs/goals/G-CORE-046/worktree-plan.md)
- Codex Superintelligence Invariants: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Proof-and-Evidence Contract: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Mathematical Proof, Formal Methods & Program Verification: [`docs/03-architecture/specs/formal-verification.md`](file:///docs/03-architecture/specs/formal-verification.md)


## Closeout Notes

- **Closed Date:** 2026-10-18
- **Reason / Outcome:** Completed 100% implementation of intent-playbook-router and tests green
