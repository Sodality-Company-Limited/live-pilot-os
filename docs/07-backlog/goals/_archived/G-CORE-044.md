---
goal_contract:
  id: G-CORE-044
  version: 2
  kind: feature
  status: done
  profiles:
    - core
  atomicity:
    outcome_count: 1
    primary_outcome: "Implement soda-skill-authoring-compiler skill and skill validation engine."
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

# G-CORE-044: Implement soda-skill-authoring-compiler skill and skill validation engine

**Status:** done  
**Closed:** 2026-10-18  
**Kind:** feature  
**Atomic outcome:** Implement soda-skill-authoring-compiler skill and skill validation engine.  
**Epic:** CORE  
**Depends on:** G-CORE-043  
**Spec stability:** clarify done · spec check done · analyze n/a  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Implement skill authoring compiler driver and test suite | done |

### Worktree & Multi-Subagent Orchestration Plan
> [`file:///.agents/specs/worktree-orchestration.md`](.agents/specs/worktree-orchestration.md)
- Multi-agent execution partitioned across isolated Git worktrees (`.worktrees/G-CORE-044-{role}`) with disjoint touch maps.

## Context
1–3 sentences: where this goal sits. Link specs the agent must read first.
This goal introduces `soda-skill-authoring-compiler` and `scripts/lib/skill-authoring-compiler.mjs` to automate the authoring, scaffolding, schema validation, and dual-touch parity enforcement of `soda-*` agent skills complying with the AgentSkills.io standard across `.agents/skills/` and `template/.agents/skills/`. Read [`docs/07-backlog/antigravity-context-pstack-wave9.md`](file:///docs/07-backlog/antigravity-context-pstack-wave9.md) before execution.

## Intent
**Why:** Authoring and maintaining 45+ `soda-*` skills currently relies on manual copy-pasting, creating risks of schema drift, missing canonical sections, or template parity mismatches.  
**Done when:** The compiler scaffolds new skills with canonical frontmatter, validates AgentSkills.io schemas, and verifies dual-touch parity across root and template.  
**Unblocks:** `G-CORE-045` and standardized agent skill compilation across the Sodality ecosystem.  

## In
- Implementation of `scripts/lib/skill-authoring-compiler.mjs` and mirror `template/scripts/lib/skill-authoring-compiler.mjs`.
- Implementation of agent skill `.agents/skills/soda-skill-authoring-compiler/SKILL.md` and mirror `template/.agents/skills/soda-skill-authoring-compiler/SKILL.md`.
- Comprehensive unit test suite `tests/lib/skill-authoring-compiler.test.mjs` passing green with zero mocks.
- Mathematical invariant verification for compilation determinism and dual-touch parity.

## Out
- Modifying non-skill governance rules or repository workflows.
- Publishing skills to external public package registries.

## Atomicity & Zero-Mock Contract
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- **One outcome:** This goal delivers exactly one independently verifiable technical outcome: the skill authoring compiler and validator.
- **Concrete execution:** No mocks, stubs, fakes, placeholders, or string simulations in implementation or acceptance evidence.
- **Epistemic Invariants:** $\text{Executable invariant} \neq \text{formal theorem}$; exact-HEAD provenance and clean-tree via [`epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md).

### Antigravity handoff contract
When this goal is handed to Antigravity, it returns ordered atomic work steps: `### Step N — [Objective]`, Allowed files, Actions, Verification command, Completion gate, Stop condition, Zero-Mock invariant check.

## Quality priority
**Priority:** P1

## Gap analysis
| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-CORE-044 | P1 | Missing automated agent skill scaffolding, schema validation, and template parity compiler | developer | Implement `skill-authoring-compiler.mjs` with AgentSkills.io validator | `node --test tests/lib/skill-authoring-compiler.test.mjs` | open |

## How
**Stack / approach:** Node.js ES module providing `scaffoldSkill`, `validateSkillSchema`, and `verifySkillDualTouchParity` with deterministic frontmatter serialization and filesystem bitwise comparison.

## Open questions
- None.

## Knowledge links
| Type | IDs |
|---|---|
| **Context** | [`docs/07-backlog/antigravity-context-pstack-wave9.md`](file:///docs/07-backlog/antigravity-context-pstack-wave9.md) |

## Context manifest
| Kind | IDs / paths |
|---|---|
| **Acceptance** | docs/02-product/acceptance/G-CORE-044.md |
| **Context** | docs/07-backlog/antigravity-context-pstack-wave9.md |

## Work steps

### Step 1 — Implement skill authoring compiler driver and test suite
**Allowed files:** `scripts/lib/skill-authoring-compiler.mjs`, `template/scripts/lib/skill-authoring-compiler.mjs`, `.agents/skills/soda-skill-authoring-compiler/SKILL.md`, `template/.agents/skills/soda-skill-authoring-compiler/SKILL.md`, `tests/lib/skill-authoring-compiler.test.mjs`  
**Actions:**
1. Implement `scaffoldSkill`, `validateSkillSchema`, and `verifySkillDualTouchParity` in `scripts/lib/skill-authoring-compiler.mjs`.
2. Support schema validation, section rendering, and dual-touch file parity verification.
3. Mirror modules to `template/`.
4. Author `.agents/skills/soda-skill-authoring-compiler/SKILL.md` and mirror to `template/`.
5. Implement unit tests in `tests/lib/skill-authoring-compiler.test.mjs`.
**Verification command:** `node --test tests/lib/skill-authoring-compiler.test.mjs`  
**Completion gate:** Exit code 0 with 100% green test assertions and zero mocks.  
**Stop condition:** Any test failure or schema violation.  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| framework-skills | ADD | `.agents/skills/soda-skill-authoring-compiler/SKILL.md` |
| framework-skills-template | ADD | `template/.agents/skills/soda-skill-authoring-compiler/SKILL.md` |
| core-lib | ADD | `scripts/lib/skill-authoring-compiler.mjs` |
| core-lib-template | ADD | `template/scripts/lib/skill-authoring-compiler.mjs` |
| unit-tests | ADD | `tests/lib/skill-authoring-compiler.test.mjs` |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | Base integration branch: `feature/CORE` |
| **System Archetype** | `backend-service` / `skill-compiler` |
| **Bounded Context & Domain** | Skill Lifecycle Engineering & Governance Domain |
| **Ports & Adapters Topology** | Driving Inbound Ports: CLI Skill Scaffold Command, Ecosystem Parity Linter Hook <br> Driven Outbound Ports: File System Writer, Template Parity Validator, AgentSkills.io Schema Validator |
| **State Machine & Invariants** | FSM States: InputReceived -> SchemaValidated -> SkillRendered -> ParityVerified -> ArtifactsWritten |
| **Zero-Mock & Conformance Gate** | 100% Concrete Compilable Implementations; Verified via `architecture-design-conformance-harness.mjs` |
| **Socratic 5-Why Blueprint** | Linked Dialectic Report: `docs/06_raw/20261019_002500_antigravity_pstack_wave9_deep_context.md` |

## Contract impact
- **Schema modifications:** None; standardized AgentSkills.io frontmatter format.

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
  trigger: "Skill compilation schema validation error or write failure"
  command: "git checkout -- scripts/lib/skill-authoring-compiler.mjs .agents/skills/soda-skill-authoring-compiler/ tests/lib/skill-authoring-compiler.test.mjs"
  scope: "Files declared in Touch map"
  reversible: true
  data_recovery: "Point-in-time recovery via git working tree restoration"
  verification: "node --test tests/lib/skill-authoring-compiler.test.mjs"
```

## Security & Trust Boundaries
```yaml
security:
  threat_model: "Guards against path traversal in skill names and injection of unapproved triggers"
  trust_boundary: "Skill names sanitized to lowercase alphanumeric kebab-case"
  tool_authorization: "Read and write access confined strictly to .agents/skills/ and template/.agents/skills/"
  sandbox_boundary: "Execution within local Node.js process"
  secret_handling: "Zero credential or token storage in skill metadata"
  pii_handling: "Zero PII processing"
```

## Observability & Drift Telemetry
```yaml
observability:
  metrics:
    - skills_compiled_count
    - skills_validated_count
    - parity_violations_count
  alerts:
    - "parity_violations_count > 0"
  traces:
    - "framework.skill.compile"
```

## Resource & Cost Budget
```yaml
resource_budget:
  latency_budget: "p99 < 20ms per skill compilation"
  memory_budget: "16MB process RAM"
  compute_budget: "Local CPU host execution"
  token_budget: "0 tokens (pure deterministic algorithms)"
```

## Learning-Loop Contract
```yaml
learning_loop:
  observed_metrics: "skills_compiled_count, parity_violations_count"
  review_schedule: "weekly"
  regression_threshold: "0 schema invalid skills in repository"
  feedback_mechanism: "Skill compilation scorecard"
```

## Proof Contract & Invariants
```yaml
invariants:
  - id: INV-044-001
    claim: "Skill compilation from a declared configuration object is 100% deterministic"
    type: "determinism"
    classification: executable_invariant
    test:
      command: "node --test tests/lib/skill-authoring-compiler.test.mjs"
  - id: INV-044-002
    claim: "Every registered skill exists in both .agents/skills/ and template/.agents/skills/ with bitwise byte identity"
    type: "completeness"
    classification: executable_property_test
    test:
      command: "node --test tests/lib/skill-authoring-compiler.test.mjs"
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
- [x] Given a raw skill specification with metadata fields, when processed by the compiler, then it generates a canonical `SKILL.md` compliant with AgentSkills.io standards and standard architectural sections.
- [x] Given an authored skill, when validated for ecosystem parity, then it verifies dual-touch existence across `.agents/skills/` and `template/.agents/skills/`.

## Test plan
- Commands from `AGENTS.md` **Standard commands**
- New/updated test files: `tests/lib/skill-authoring-compiler.test.mjs`
### 1. Positive Tests
- Accurately renders canonical frontmatter and standard markdown sections from valid options.
### 2. Negative Tests
- Rejects invalid skill names containing uppercase or illegal characters.
### 3. Fail-Closed & Chaos Tests
- Throws validation error if required fields (name, description, version, triggers, touches) are missing.
### 4. Temporal Causality Tests ($t \le T$)
- Ingestion precedes compilation and writing.
### 5. Security & Air-Gap Checks
- Sanitizes skill name preventing path traversal.
### 6. Invariants & System Laws Verification
- Determinism and dual-touch parity invariants verified.
### 7. Formal Verification & Solvers
- Discrete schema field constraints verified.
### 8. Harness Engineering & Modeling
- Verified via `tests/lib/skill-authoring-compiler.test.mjs`.
### 9. Adversarial Stress & Edge Pathologies
- Deep multiline descriptions and complex trigger sets.
### 10. Concurrency, Race Conditions & Memory Models
- Stateless pure functions guarantee concurrency safety.
### 11. Advanced Testing Paradigms & Mutation Testing
- High test assertion density with zero mocks.

## Epistemic Proof & Verification Classification
> [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Capability claims classified under Tripartite Epistemic Taxonomy: Formal Invariant and Deterministic Test Verification.

## Touch map
- `.agents/skills/soda-skill-authoring-compiler/SKILL.md`
- `template/.agents/skills/soda-skill-authoring-compiler/SKILL.md`
- `scripts/lib/skill-authoring-compiler.mjs`
- `template/scripts/lib/skill-authoring-compiler.mjs`
- `tests/lib/skill-authoring-compiler.test.mjs`

## Notes for AI
- Read: `AGENTS.md` and [`docs/07-backlog/antigravity-context-pstack-wave9.md`](file:///docs/07-backlog/antigravity-context-pstack-wave9.md)

---

## 🏛️ Comprehensive Spec Design Appendix
> [`docs/03-architecture/specs/goals/G-CORE-044/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-044/invariants-formal-spec.md)
- Hexagonal Inbound & Outbound Ports: [`docs/03-architecture/specs/goals/G-CORE-044/architecture-spec.md`](docs/03-architecture/specs/goals/G-CORE-044/architecture-spec.md)
- Finite State Machine (FSM) Matrix: [`docs/03-architecture/specs/goals/G-CORE-044/fsm-runtime-spec.md`](docs/03-architecture/specs/goals/G-CORE-044/fsm-runtime-spec.md)
- Mathematical & Data Invariants: [`docs/03-architecture/specs/goals/G-CORE-044/invariants-formal-spec.md`](docs/03-architecture/specs/goals/G-CORE-044/invariants-formal-spec.md)
- Subagent Swarm & Git Worktree Matrix: [`docs/03-architecture/specs/goals/G-CORE-044/worktree-plan.md`](docs/03-architecture/specs/goals/G-CORE-044/worktree-plan.md)
- Codex Superintelligence Invariants: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Proof-and-Evidence Contract: [`docs/03-architecture/specs/epistemic-proof-hierarchy.md`](file:///docs/03-architecture/specs/epistemic-proof-hierarchy.md)
- Mathematical Proof, Formal Methods & Program Verification: [`docs/03-architecture/specs/formal-verification.md`](file:///docs/03-architecture/specs/formal-verification.md)


## Closeout Notes

- **Closed Date:** 2026-10-18
- **Reason / Outcome:** Completed 100% implementation of skill-authoring-compiler and tests green
