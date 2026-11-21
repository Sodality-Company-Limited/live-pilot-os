---
goal_contract:
  id: G-CORE-058
  version: 2
  kind: feature
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Produce confidence-aware F01 intent and product-entity signals"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: intent-service-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["AI output and catalog grounding"]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-051, G-CORE-057, G-CORE-061]
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-058: Produce confidence-aware F01 intent and product-entity signals
**Status:** draft
**Kind:** feature
**Atomic outcome:** Approved chat inputs yield typed intent signals grounded in the approved catalog, with low-confidence and unresolved states explicit.
**Epic:** CORE
**Depends on:** G-CORE-051, G-CORE-057, G-CORE-061
**Spec stability:** clarify pending | spec check pending | analyze pending
## Context
F01.1 covers product interest/questions, entity resolution, unsupported claims, repeated questions, and uncertainty.
## Intent
**Why:** Downstream decisions need typed evidence rather than raw model output.
**Done when:** intent, entity, confidence, evidence, and refusal states are published under the F01 schema.
**Unblocks:** dashboard and downstream recommendation consumers.
## In
- Intent classification, catalog-grounded entity resolution, confidence threshold, refusal.
## Out
- Promotion execution, unsupported claims, direct UI answer generation.
## Atomicity & Zero-Mock Contract
- One signal-producing capability; provider behavior remains mode-labeled.
## Quality priority
**Priority:** P1
## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| F01 classifier runtime absent | F01.1 flows | Add service boundary and evidence envelope | service tests |
## How
Use JEV/OpenAI adapter contract plus approved catalog facts and explicit confidence policy.
## Open questions
- [ ] [NEEDS CLARIFICATION: Thai/multilingual threshold values]
## Knowledge links
| Type | Path |
|---|---|
| Flows | docs/03-architecture/source-of-truth-flows/features/F01-live-chat-telemetry/flows/f01-1-flow-005-resolve-product-entity.md |
| Satellite | docs/03-architecture/specs/goals/G-CORE-058/G-CORE-058-architecture-spec.md |
## Context manifest
| Kind | Path |
|---|---|
| JEV | docs/03-architecture/jev-agent-runtime-sot.md |
## Work steps
### Step 1 — Emit grounded intent signals
**Allowed files:** `code/apps/services/intent-risk-service/src/intent.ts`, `code/apps/services/intent-risk-service/test/intent.spec.ts`
**Actions:** classify supported intents, resolve approved catalog entities, attach confidence/evidence, refuse unsupported or ambiguous claims.
1. Validate the approved contract and boundary inputs.
2. Preserve lineage and emit explicit failure state.
**Verification command:** `npx vitest run code/apps/services/intent-risk-service/test/intent.spec.ts`
**Completion gate:** low-confidence output cannot become an actionable verified signal.
**Stop condition:** provider or catalog contract unavailable.
## Change delta
| Area | Action | Path |
|---|---|---|
| Intent service | ADD | code/apps/services/intent-risk-service/src/intent.ts |
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Epic & Integration Branch | `epic/CORE`; `feature/G-CORE-058` |
| System Archetype | backend-service |
| Bounded Context & Domain | chat intent and entity resolution |
| Ports & Adapters Topology | telemetry → JEV/OpenAI adapter → catalog → NATS signal |
| State Machine & Invariants | classified/unresolved/refused/low-confidence |
| Zero-Mock & Conformance Gate | mode-labeled adapter and contract tests |
## Contract impact
- Publishes registered `telemetry.intent.detected` bindings only.
## Spec checklist
- [ ] Goal and architecture harnesses pass
## Acceptance criteria
- [ ] Supported intent types carry confidence and evidence.
- [ ] Unknown SKU and unsupported claims are explicit refusals.
- [ ] No raw provider output or PII is emitted.
## Test plan
- Positive supported intent; negative unsupported/ambiguous; provider timeout and stale catalog.
## Epistemic Proof & Evidence Classification
Empirical classifier evidence plus executable contract invariants.
## Touch map
- code/apps/services/intent-risk-service/src/intent.ts
- code/apps/services/intent-risk-service/test/intent.spec.ts
## Notes for AI
Never invent a SKU or treat low confidence as verified.
## Comprehensive Spec Design Appendix
See the five goal satellites.
+
#### Plan

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|---|---|
| 1 | Contract and implementation boundary | pending |
| 2 | Verification and evidence | pending |

### Worktree & Multi-Subagent Orchestration Plan
- Integration branch: `epic/CORE`.
- Each implementation goal runs on `feature/G-xxx` with disjoint touch maps; wave scheduling uses `soda-os goal waves CORE`.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps, allowed files, verification command, completion gate, and stop condition without expanding the touch map.

### Mathematical & Data Invariants Spec
- F01 state is session-scoped, lineage-bearing, idempotent, and explicit about stale, pending, unknown, and rejected outcomes.
- No raw PII, provider credential, or unverified model output crosses a public boundary.

### Architecture Invariants
- **System Archetype** | The declared system archetype remains within the goal's single layer.
- **Bounded Context & Domain Invariant** | Ownership stays with the named F01 context.
- **Ports & Adapters Topology Invariant** | Cross-boundary calls use approved HTTP/NATS contracts only.
- **Zero-Mock Conformance Gate** | Verification exercises concrete behavior and explicit failure states.
- **Socratic 5-Why Blueprint Link** | Rationale is recorded in the goal satellite architecture specification.

### Checklist: Software & Architecture Design
- [ ] Software & Architecture Design specified by AI Agent
- [ ] Socratic 5-Why Dialectic Report generated/linked
- [ ] Architecture & Goal Conformance Harness passing

+
## Conformance Addendum

## Knowledge links
| Type | IDs |
|---|---|
| F01 authority | REQ-LP-001; F01 flow IDs |
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-058/G-CORE-058-architecture-spec.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Feature | F01 |
| Contract | docs/03-architecture/api/README.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** This goal delivers exactly one independently verifiable outcome.
- **Concrete execution:** 100% concrete implementation and executable evidence; zero placeholders, stubs, or fake success.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Declared outcome | ADD / CHANGE | The goal touch map and approved contract boundary |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **System Archetype** | Single-layer F01 backend boundary |
| **Bounded Context & Domain** | F01 observation and signal analysis |
| **Ports & Adapters Topology** | Approved HTTP/NATS/provider ports only |
| **State Machine & Invariants** | Explicit accepted, rejected, pending, unknown, stale, and reconciled states |
| **Zero-Mock & Conformance Gate** | Concrete behavior verified by goal and architecture harnesses |
| **Socratic 5-Why Blueprint** | Recorded in this goal's architecture satellite |

## Spec checklist
- [ ] Software & Architecture Design specified by AI Agent
- [ ] Socratic 5-Why Dialectic report generated/linked
- [ ] Architecture & Goal Conformance Harness passing

### 1. Positive Tests
- Valid contract input produces the declared outcome.
### 2. Negative Tests
- Invalid scope, schema, or capability is rejected.
### 3. Fail-Closed & Chaos Tests
- Timeout, dependency outage, stale input, and unknown result remain explicit.
### 4. Temporal Causality Tests
- Event time and causation lineage are monotonic or explicitly reconciled.
### 5. Security & Air-Gap Checks
- No public boundary bypass, secret leakage, or cross-session data.
