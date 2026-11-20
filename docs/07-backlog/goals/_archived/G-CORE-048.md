---
goal_contract:
  id: G-CORE-048
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Implement soda-ast-type-invariants skill and type contract linter."
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

# G-CORE-048: Implement soda-ast-type-invariants skill and type contract linter

**Status:** done  
**Closed:** 2026-10-18  
**Kind:** feature  
**Atomic outcome:** Implement soda-ast-type-invariants skill and type contract linter.  
**Epic:** CORE  
**Depends on:** G-CORE-047  
**Spec stability:** clarify done · spec check done · analyze done  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement AST type invariants engine and test suite | done |

### Worktree & Multi-Subagent Orchestration Plan
> [`file:///.agents/specs/worktree-orchestration.md`](.agents/specs/worktree-orchestration.md)
- Multi-agent execution partitioned across isolated Git worktrees (`.worktrees/G-CORE-048-{role}`) with disjoint touch maps.

## Context
1–3 sentences: where this goal sits. Link specs the agent must read first.
This goal introduces `soda-ast-type-invariants` and `scripts/lib/ast-type-invariants.mjs` to enforce strict type-system invariants across TypeScript and JSDoc contracts in Soda OS, eliminating `any` leaks, enforcing discriminating unions for multi-state domain entities, and requiring explicit return signatures on public exports. Read [`docs/07-backlog/antigravity-context-pstack-wave10.md`](file:///docs/07-backlog/antigravity-context-pstack-wave10.md) before execution.

## Intent
**Why:** Permissive typing, implicit `any`, and non-discriminated union shapes allow subtle runtime regressions, incomplete pattern matching, and contract drift between modules.  
**Done when:** The linter audits TypeScript ASTs, flagging and rejecting `any` usages, non-discriminated union variants, and missing public return types fail-closed.  
**Unblocks:** `G-CORE-049` and compile-time type soundness across the Sodality ecosystem.  

## In
- Implementation of `scripts/lib/ast-type-invariants.mjs` and mirror `template/scripts/lib/ast-type-invariants.mjs`.
- Implementation of agent skill `.agents/skills/soda-ast-type-invariants/SKILL.md` and mirror `template/.agents/skills/soda-ast-type-invariants/SKILL.md`.
- Comprehensive unit test suite `tests/lib/ast-type-invariants.test.mjs` passing green with zero mocks.
- Mathematical invariant verification for zero `any` and discriminating union exhaustiveness.

## Out
- Re-implementing a full TypeScript compiler or type checker.
- Parsing non-JS/TS language contracts.

## Atomicity & Zero-Mock Contract
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: the AST type invariants engine and linter.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or string simulations in implementation or acceptance evidence.
- **Epistemic Invariants:** $\text{Executable invariant} \neq \text{formal theorem}$; exact-HEAD provenance and clean-tree via [`epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md).

### Antigravity handoff contract
When this goal is handed to Antigravity, it returns ordered atomic work steps: `### Step N — [Objective]`, Allowed files, Actions, Verification command, Completion gate, Stop condition, Zero-Mock invariant check.

## Quality priority
**Priority:** P1

## Gap analysis
| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-CORE-048 | P1 | Missing automated AST linter enforcing zero any and discriminating unions | developer | Implement `ast-type-invariants.mjs` with AST pattern scanner | `node --test tests/lib/ast-type-invariants.test.mjs` | open |

## How
**Stack / approach:** Node.js ES module scanning TypeScript/JavaScript AST constructs for prohibited type keywords (`any`), union types lacking distinct tag literals, and exported functions missing return type declarations.

## Open questions
- None.

## Knowledge links
| Type | IDs |
|---|---|
| **Context** | [`docs/07-backlog/antigravity-context-pstack-wave10.md`](file:///docs/07-backlog/antigravity-context-pstack-wave10.md) |

## Context manifest
| Kind | IDs / paths |
|---|---|
| **Acceptance** | docs/02-product/acceptance/G-CORE-048.md |
| **Context** | docs/07-backlog/antigravity-context-pstack-wave10.md |

## Work steps

### Step 1 — Implement AST type invariants engine and test suite
**Allowed files:** `scripts/lib/ast-type-invariants.mjs`, `template/scripts/lib/ast-type-invariants.mjs`, `.agents/skills/soda-ast-type-invariants/SKILL.md`, `template/.agents/skills/soda-ast-type-invariants/SKILL.md`, `tests/lib/ast-type-invariants.test.mjs`  
**Actions:**
1. Implement `lintTypeInvariants`, `auditAnyProhibition`, and `auditDiscriminatingUnions` in `scripts/lib/ast-type-invariants.mjs`.
2. Support configurable severity rules, line-number violation tracking, and summary statistics.
3. Mirror modules to `template/`.
4. Author `.agents/skills/soda-ast-type-invariants/SKILL.md` and mirror to `template/`.
5. Implement unit tests in `tests/lib/ast-type-invariants.test.mjs`.
**Verification command:** `node --test tests/lib/ast-type-invariants.test.mjs`  
**Completion gate:** Exit code 0 with 100% green test assertions and zero mocks.  
**Stop condition:** Any test failure or type lint discrepancy.  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| framework-skills | ADD | `.agents/skills/soda-ast-type-invariants/SKILL.md` |
| framework-skills-template | ADD | `template/.agents/skills/soda-ast-type-invariants/SKILL.md` |
| core-lib | ADD | `scripts/lib/ast-type-invariants.mjs` |
| core-lib-template | ADD | `template/scripts/lib/ast-type-invariants.mjs` |
| unit-tests | ADD | `tests/lib/ast-type-invariants.test.mjs` |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/CORE` |
| **System Archetype** | `backend-service` / `type-contract-linter` |
| **Bounded Context & Domain** | Type System Engineering & Semantic Governance Domain |
| **Ports & Adapters Topology** | Driving Inbound Ports: CLI Type Lint Command, CI Pipeline Type Invariant Hook <br> Driven Outbound Ports: TypeScript AST Parser Adapter, Diagnostic Reporter, Union Discriminating Analyzer |
| **State Machine & Invariants** | FSM States: SourcesDiscovered -> AstConstructed -> AnyAudited -> UnionsAudited -> SignaturesAudited -> AuditPassed |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `architecture-design-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20261019_062700_antigravity_pstack_wave10_deep_context.md` |

## Contract impact
- **Schema modifications:** None; emits structured diagnostic lint reports.

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
  trigger: "Type lint false positive or parser failure"
  command: "git checkout -- scripts/lib/ast-type-invariants.mjs .agents/skills/soda-ast-type-invariants/ tests/lib/ast-type-invariants.test.mjs"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node --test tests/lib/ast-type-invariants.test.mjs"
```

## Security & Trust Boundaries
```yaml
security:
  threat_model: "Prevents unsafe type escape hatches and unverified runtime casts"
  trust_boundary: "AST parsing confined to local TypeScript/JavaScript files"
  tool_authorization: "Read access to source files, write access confined to declared touch map"
  sandbox_boundary: "Execution within local Node.js process"
  secret_handling: "Zero credential or token storage in type analysis"
  pii_handling: "Zero PII processing"
```

## Observability & Drift Telemetry
```yaml
observability:
  metrics:
    - files_type_audited_count
    - any_violations_count
    - union_violations_count
  alerts:
    - "any_violations_count > 0"
  traces:
    - "type.audit.invariants"
```

## Resource & Cost Budget
```yaml
resource_budget:
  latency_budget: "p99 < 30ms per file type audit"
  memory_budget: "24MB process RAM"
  compute_budget: "Local CPU host execution"
  token_budget: "0 tokens (pure deterministic algorithms)"
```

## Learning-Loop Contract
```yaml
learning_loop:
  observed_metrics: "files_type_audited_count, any_violations_count"
  review_schedule: "weekly"
  regression_threshold: "0 any violations across production modules"
  feedback_mechanism: "Type conformance scorecard"
```

## Proof Contract & Invariants
```yaml
invariants:
  - id: INV-048-001
    claim: "Public APIs and internal domain models contain zero explicit or inferred any types"
    type: "safety"
    classification: executable_invariant
    test:
      command: "node --test tests/lib/ast-type-invariants.test.mjs"
  - id: INV-048-002
    claim: "Union variants for multi-state domain entities define distinct literal discriminant fields"
    type: "exhaustiveness"
    classification: executable_property_test
    test:
      command: "node --test tests/lib/ast-type-invariants.test.mjs"
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
- [x] Given TypeScript source code files, when analyzed by the AST type invariants engine, then it detects and flags any usage of `any`, untyped public exports, and non-discriminated union variants.
- [x] Given complex domain states, when structured with discriminating unions, then the linter verifies compile-time exhaustive switch checks without fallback holes.

## Test plan
- Commands from `AGENTS.md` **Standard commands**
- New/updated test files: `tests/lib/ast-type-invariants.test.mjs`
### 1. Positive Tests
- Passes clean files declaring strict types, discriminating unions, and explicit return annotations.
### 2. Negative Tests
- Rejects source snippets with explicit `any` and reports precise line numbers.
### 3. Fail-Closed & Chaos Tests
- Throws failure and halts when non-discriminated unions are presented.
### 4. Temporal Causality Tests ($t \le T$)
- Invariants checked prior to compilation and release gates.
### 5. Security & Air-Gap Checks
- Type auditing does not load untrusted remote schemas.
### 6. Invariants & System Laws Verification
- Zero `any` and discriminating union exhaustiveness invariants verified.
### 7. Formal Verification & Solvers
- Discrete type union disjunction verified.
### 8. Harness Engineering & Modeling
- Verified via `tests/lib/ast-type-invariants.test.mjs`.
### 9. Adversarial Stress & Edge Pathologies
- Deeply nested generic types and intersection types.
### 10. Concurrency, Race Conditions & Memory Models
- Stateless pure functions guarantee concurrency safety.
### 11. Advanced Testing Paradigms & Mutation Testing
- High test assertion density with zero mocks.

## Epistemic Proof & Verification Classification
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Capability claims classified under Tripartite Epistemic Taxonomy: Formal Invariant and Deterministic Test Verification.

## Touch map
- `.agents/skills/soda-ast-type-invariants/SKILL.md`
- `template/.agents/skills/soda-ast-type-invariants/SKILL.md`
- `scripts/lib/ast-type-invariants.mjs`
- `template/scripts/lib/ast-type-invariants.mjs`
- `tests/lib/ast-type-invariants.test.mjs`

## Notes for AI
- Read: `AGENTS.md` and [`docs/07-backlog/antigravity-context-pstack-wave10.md`](file:///docs/07-backlog/antigravity-context-pstack-wave10.md)

---

## 🏛️ Comprehensive Spec Design Appendix
> [`docs/03-architecture/specs/goals/G-CORE-048/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-048/invariants-formal-spec.md)
- Hexagonal Inbound & Outbound Ports: [`docs/03-architecture/specs/goals/G-CORE-048/architecture-spec.md`](docs/03-architecture/specs/goals/G-CORE-048/architecture-spec.md)
- Finite State Machine (FSM) Matrix: [`docs/03-architecture/specs/goals/G-CORE-048/fsm-runtime-spec.md`](docs/03-architecture/specs/goals/G-CORE-048/fsm-runtime-spec.md)
- Mathematical & Data Invariants: [`docs/03-architecture/specs/goals/G-CORE-048/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-048/invariants-formal-spec.md)
- Subagent Swarm & Git Worktree Matrix: [`docs/03-architecture/specs/goals/G-CORE-048/worktree-plan.md`](docs/03-architecture/specs/goals/G-CORE-048/worktree-plan.md)
- Codex Superintelligence Invariants: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Proof-and-Evidence Contract: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Mathematical Proof, Formal Methods & Program Verification: [`docs/03-architecture/specs/formal-verification.md`](file:///docs/03-architecture/specs/formal-verification.md)
