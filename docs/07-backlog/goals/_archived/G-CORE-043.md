---
goal_contract:
  id: G-CORE-043
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Implement soda-concept-doc-extractor skill and mental model documentation engine."
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

# G-CORE-043: Implement soda-concept-doc-extractor skill and mental model documentation engine

**Status:** done  
**Closed:** 2026-10-18  
**Kind:** feature  
**Atomic outcome:** Implement soda-concept-doc-extractor skill and mental model documentation engine.  
**Epic:** CORE  
**Depends on:** G-CORE-042  
**Spec stability:** clarify done · spec check done · analyze n/a  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement concept doc extractor driver and test suite | done |

### Worktree & Multi-Subagent Orchestration Plan
> [`file:///.agents/specs/worktree-orchestration.md`](.agents/specs/worktree-orchestration.md)
- Multi-agent execution partitioned across isolated Git worktrees (`.worktrees/G-CORE-043-{role}`) with disjoint touch maps.

## Context
1–3 sentences: where this goal sits. Link specs the agent must read first.
This goal introduces `soda-concept-doc-extractor` and `scripts/lib/concept-doc-extractor.mjs` to analyze code changes and AST export graphs, extract underlying mental models, invariants, and causal design rationales ("why this way and not the obvious way"), and generate standardized architectural concept specifications. Read [`docs/07-backlog/antigravity-context-pstack-wave8.md`](file:///docs/07-backlog/antigravity-context-pstack-wave8.md) before execution.

## Intent
**Why:** Codebases accumulate implicit domain knowledge that is lost across agent sessions; systematically documenting mental models and invariants turns ephemeral agent realizations into permanent repository assets.  
**Done when:** The extractor scans source files, extracts domain concepts and invariant relationships, and emits formatted markdown concept documents.  
**Unblocks:** Total knowledge synthesis and self-documenting autonomous engineering across Soda OS.  

## In
- Implementation of `scripts/lib/concept-doc-extractor.mjs` and mirror `template/scripts/lib/concept-doc-extractor.mjs`.
- Implementation of agent skill `.agents/skills/soda-concept-doc-extractor/SKILL.md` and mirror `template/.agents/skills/soda-concept-doc-extractor/SKILL.md`.
- Comprehensive unit test suite `tests/lib/concept-doc-extractor.test.mjs` passing green with zero mocks.
- Mathematical invariant verification for documentation determinism and structural completeness.

## Out
- Fabricating documentation for non-existent source code files.
- Modifying underlying source implementation files.

## Atomicity & Zero-Mock Contract
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: the mental model concept doc extractor.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or string simulations in implementation or acceptance evidence.
- **Epistemic Invariants:** $\text{Executable invariant} \neq \text{formal theorem}$; exact-HEAD provenance and clean-tree via [`epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md).

### Antigravity handoff contract
When this goal is handed to Antigravity, it returns ordered atomic work steps: `### Step N — [Objective]`, Allowed files, Actions, Verification command, Completion gate, Stop condition, Zero-Mock invariant check.

## Quality priority
**Priority:** P1

## Gap analysis
| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-CORE-043 | P1 | Missing automated conceptual mental model and invariant documentation extractor | developer | Implement `concept-doc-extractor.mjs` with AST parser | `node --test tests/lib/concept-doc-extractor.test.mjs` | open |

## How
**Stack / approach:** Node.js ES module providing `extractConceptsFromSource`, `generateConceptSpec`, and `validateConceptCitations` with regex AST export inspection and markdown link validation.

## Open questions
- None.

## Knowledge links
| Type | IDs |
|---|---|
| **Context** | [`docs/07-backlog/antigravity-context-pstack-wave8.md`](file:///docs/07-backlog/antigravity-context-pstack-wave8.md) |

## Context manifest
| Kind | IDs / paths |
|---|---|
| **Acceptance** | docs/02-product/acceptance/G-CORE-043.md |
| **Context** | docs/07-backlog/antigravity-context-pstack-wave8.md |

## Work steps

### Step 1 — Implement concept doc extractor driver and test suite
**Allowed files:** `scripts/lib/concept-doc-extractor.mjs`, `template/scripts/lib/concept-doc-extractor.mjs`, `.agents/skills/soda-concept-doc-extractor/SKILL.md`, `template/.agents/skills/soda-concept-doc-extractor/SKILL.md`, `tests/lib/concept-doc-extractor.test.mjs`  
**Actions:**
1. Implement `extractConceptsFromSource`, `generateConceptSpec`, and `validateConceptCitations` in `scripts/lib/concept-doc-extractor.mjs`.
2. Extract exported functions, classes, invariants, and architectural rationale into structured markdown specs.
3. Mirror modules to `template/`.
4. Author `.agents/skills/soda-concept-doc-extractor/SKILL.md` and mirror to `template/`.
5. Implement unit tests in `tests/lib/concept-doc-extractor.test.mjs`.
**Verification command:** `node --test tests/lib/concept-doc-extractor.test.mjs`  
**Completion gate:** Exit code 0 with 100% green test assertions and zero mocks.  
**Stop condition:** Any test failure or broken citation links.  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| framework-skills | ADD | `.agents/skills/soda-concept-doc-extractor/SKILL.md` |
| framework-skills-template | ADD | `template/.agents/skills/soda-concept-doc-extractor/SKILL.md` |
| core-lib | ADD | `scripts/lib/concept-doc-extractor.mjs` |
| core-lib-template | ADD | `template/scripts/lib/concept-doc-extractor.mjs` |
| unit-tests | ADD | `tests/lib/concept-doc-extractor.test.mjs` |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/CORE` |
| **System Archetype** | `backend-service` / `documentation-generator` |
| **Bounded Context & Domain** | Conceptual Knowledge Extraction & Mental Model Documentation Domain |
| **Ports & Adapters Topology** | Driving Inbound Ports: CLI Concept Extraction Trigger, Post-Goal Documentation Hook <br> Driven Outbound Ports: Source AST Inspector, Markdown Specification Generator |
| **State Machine & Invariants** | FSM States: SourceScanned -> EntitiesExtracted -> InvariantsCorrelated -> SpecGenerated -> CitationsValidated |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `architecture-design-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20261018_233500_antigravity_pstack_wave8_deep_context.md` |

## Contract impact
- **Schema modifications:** None; standardized Markdown specification output.

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
  trigger: "Extraction parser exception or corrupt AST input"
  command: "git checkout -- scripts/lib/concept-doc-extractor.mjs .agents/skills/soda-concept-doc-extractor/ tests/lib/concept-doc-extractor.test.mjs"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node --test tests/lib/concept-doc-extractor.test.mjs"
```

## Security & Trust Boundaries
```yaml
security:
  threat_model: "Guards against source code leaking secrets into documentation outputs"
  trust_boundary: "Source code read-only access confined to declared target files"
  tool_authorization: "Read-only file system inspection"
  sandbox_boundary: "Execution within local process memory"
  secret_handling: "Automatic redaction of tokens and keys in generated specs"
  pii_handling: "Zero PII processing"
```

## Observability & Drift Telemetry
```yaml
observability:
  metrics:
    - concepts_extracted_count
    - specs_generated_count
    - citations_validated_count
  alerts:
    - "citations_validated_count == 0"
  traces:
    - "framework.concept.extract"
```

## Resource & Cost Budget
```yaml
resource_budget:
  latency_budget: "p99 < 50ms per source file conceptual extraction"
  memory_budget: "16MB process RAM"
  compute_budget: "Local CPU host execution"
  token_budget: "0 tokens (pure deterministic algorithms)"
```

## Learning-Loop Contract
```yaml
learning_loop:
  observed_metrics: "concepts_extracted_count, citations_validated_count"
  review_schedule: "weekly"
  regression_threshold: "0 broken file citations in generated specs"
  feedback_mechanism: "Concept doc extraction scorecard"
```

## Proof Contract & Invariants
```yaml
invariants:
  - id: INV-043-001
    claim: "Conceptual documentation generation is 100% deterministic across identical source code inputs"
    type: "determinism"
    classification: executable_invariant
    test:
      command: "node --test tests/lib/concept-doc-extractor.test.mjs"
  - id: INV-043-002
    claim: "Every generated concept document includes non-empty mental models, entity definitions, and invariant declarations"
    type: "completeness"
    classification: executable_property_test
    test:
      command: "node --test tests/lib/concept-doc-extractor.test.mjs"
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
- [x] Given a source code file with exported functions and classes, when processed by the extractor, then it produces a structured mental model specification with entity definitions.
- [x] Given a generated concept document, when validated, then every referenced code link points to an existing file and valid line number.

## Test plan
- Commands from `AGENTS.md` **Standard commands**
- New/updated test files: `tests/lib/concept-doc-extractor.test.mjs`
### 1. Positive Tests
- Successfully extracts mental models and exported interfaces from ESM source files.
### 2. Negative Tests
- Identifies invalid or missing file references during citation validation.
### 3. Fail-Closed & Chaos Tests
- Bounded processing handles deeply nested or circular exports gracefully.
### 4. Temporal Causality Tests ($t \le T$)
- Document generation timestamp strictly follows source inspection.
### 5. Security & Air-Gap Checks
- Redacts detected secret patterns (API keys, passwords) from documentation output.
### 6. Invariants & System Laws Verification
- Determinism and completeness invariants verified.
### 7. Formal Verification & Solvers
- Discrete entity-relation extraction verified.
### 8. Harness Engineering & Modeling
- Verified via `tests/lib/concept-doc-extractor.test.mjs`.
### 9. Adversarial Stress & Edge Pathologies
- Massive single-file scripts (5,000+ lines) and minified bundles.
### 10. Concurrency, Race Conditions & Memory Models
- Stateless function execution guarantees concurrency safety.
### 11. Advanced Testing Paradigms & Mutation Testing
- High test assertion density with zero mocks.

## Epistemic Proof & Verification Classification
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Capability claims classified under Tripartite Epistemic Taxonomy: Formal Invariant and Deterministic Test Verification.

## Touch map
- `.agents/skills/soda-concept-doc-extractor/SKILL.md`
- `template/.agents/skills/soda-concept-doc-extractor/SKILL.md`
- `scripts/lib/concept-doc-extractor.mjs`
- `template/scripts/lib/concept-doc-extractor.mjs`
- `tests/lib/concept-doc-extractor.test.mjs`

## Notes for AI
- Read: `AGENTS.md` and [`docs/07-backlog/antigravity-context-pstack-wave8.md`](file:///docs/07-backlog/antigravity-context-pstack-wave8.md)

---

## 🏛️ Comprehensive Spec Design Appendix
> [`docs/03-architecture/specs/goals/G-CORE-043/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-043/invariants-formal-spec.md)
- Hexagonal Inbound & Outbound Ports: [`docs/03-architecture/specs/goals/G-CORE-043/architecture-spec.md`](docs/03-architecture/specs/goals/G-CORE-043/architecture-spec.md)
- Finite State Machine (FSM) Matrix: [`docs/03-architecture/specs/goals/G-CORE-043/fsm-runtime-spec.md`](docs/03-architecture/specs/goals/G-CORE-043/fsm-runtime-spec.md)
- Mathematical & Data Invariants: [`docs/03-architecture/specs/goals/G-CORE-043/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-043/invariants-formal-spec.md)
- Subagent Swarm & Git Worktree Matrix: [`docs/03-architecture/specs/goals/G-CORE-043/worktree-plan.md`](docs/03-architecture/specs/goals/G-CORE-043/worktree-plan.md)
- Codex Superintelligence Invariants: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Proof-and-Evidence Contract: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Mathematical Proof, Formal Methods & Program Verification: [`docs/03-architecture/specs/formal-verification.md`](file:///docs/03-architecture/specs/formal-verification.md)


## Closeout Notes

- **Closed Date:** 2026-10-18
- **Reason / Outcome:** Completed 100% implementation of concept-doc-extractor and tests green
