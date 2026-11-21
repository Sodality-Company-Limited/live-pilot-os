---
goal_contract:
  id: G-CORE-059
  version: 2
  kind: feature
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Produce F01 moderation risk signals"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: moderation-service-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["Safety classification"]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-051, G-CORE-057, G-CORE-061]
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-059: Produce F01 moderation risk signals
**Status:** draft
**Kind:** feature
**Atomic outcome:** F01 chat moderation identifies supported risk patterns and emits severity-ranked, auditable risk signals.
**Epic:** CORE
**Depends on:** G-CORE-051, G-CORE-057, G-CORE-061
**Spec stability:** clarify pending | spec check pending | analyze pending
## Context
F01.2 covers spam, toxicity, scams, off-platform attempts, coordinated behavior, escalation, and audit lineage.
## Intent
**Why:** Unsafe content must not reach normal host guidance.
**Done when:** risk type, severity, handling, confidence, evidence, and audit lineage are contract-valid.
**Unblocks:** compliance and safe projections.
## In
- Moderation classification and escalation signal.
## Out
- Final operator control, content deletion, platform mutation.
## Atomicity & Zero-Mock Contract
- One risk-signal outcome.
## Quality priority
**Priority:** P0
## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| Moderation runtime absent | F01.2 flows | Add bounded risk classifier | service tests |
## How
Use approved moderation policy and JEV adapter boundary.
## Open questions
- [ ] [NEEDS CLARIFICATION: severity threshold calibration set]
## Knowledge links
| Type | Path |
|---|---|
| Flow | docs/03-architecture/source-of-truth-flows/features/F01-live-chat-telemetry/flows/f01-2-flow-005-rank-risk-severity.md |
| Satellite | docs/03-architecture/specs/goals/G-CORE-059/G-CORE-059-architecture-spec.md |
## Context manifest
| Kind | Path |
|---|---|
| Error | docs/03-architecture/api/error-codes.yaml |
## Work steps
### Step 1 — Emit ranked moderation risk
**Allowed files:** `code/apps/services/intent-risk-service/src/moderation.ts`, `code/apps/services/intent-risk-service/test/moderation.spec.ts`
**Actions:** classify risk, rank severity, redact evidence, and emit escalation/audit lineage.
1. Validate the approved contract and boundary inputs.
2. Preserve lineage and emit explicit failure state.
**Verification command:** `npx vitest run code/apps/services/intent-risk-service/test/moderation.spec.ts`
**Completion gate:** high-risk content is never emitted as normal guidance.
**Stop condition:** missing policy authority.
## Change delta
| Area | Action | Path |
|---|---|---|
| Moderation | ADD | code/apps/services/intent-risk-service/src/moderation.ts |
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Epic & Integration Branch | `epic/CORE`; `feature/G-CORE-059` |
| System Archetype | backend-service |
| Bounded Context & Domain | chat safety |
| Ports & Adapters Topology | telemetry → moderation → risk subject/audit |
| State Machine & Invariants | safe/flagged/escalated/unknown |
| Zero-Mock & Conformance Gate | policy and adversarial tests |
## Contract impact
- Publishes registered `telemetry.risk.detected` binding.
## Spec checklist
- [ ] Goal and architecture harnesses pass
## Acceptance criteria
- [ ] Supported risk patterns include evidence and severity.
- [ ] Cross-session and low-confidence cases fail closed or defer.
- [ ] Audit lineage is preserved.
## Test plan
- Positive risk patterns; negative benign text; adversarial evasion and provider timeout.
## Epistemic Proof & Evidence Classification
Executable safety evidence plus empirical calibration evidence.
## Touch map
- code/apps/services/intent-risk-service/src/moderation.ts
- code/apps/services/intent-risk-service/test/moderation.spec.ts
## Notes for AI
Do not silently drop risk or expose raw chat to downstream UI.
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
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-059/G-CORE-059-architecture-spec.md |

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
