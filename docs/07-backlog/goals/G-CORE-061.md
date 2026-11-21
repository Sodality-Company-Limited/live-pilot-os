---
goal_contract:
  id: G-CORE-061
  version: 2
  kind: feature
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Integrate the JEV/OpenAI adapter for F01 analysis"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: llm-adapter-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["Third-party provider boundary"]}
  reversibility: {level: reversible}
  external_dependencies: []
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-061: Integrate the JEV/OpenAI adapter for F01 analysis
**Status:** draft
**Kind:** feature
**Atomic outcome:** F01 intent/moderation requests use a bounded, redacted, mode-labeled JEV/OpenAI adapter with timeout and unknown handling.
**Epic:** CORE
**Depends on:** —
**Spec stability:** clarify pending | spec check pending | analyze pending
## Context
F01 classification is AI-assisted but must not expose PII, credentials, or unsupported provider certainty.
## Intent
**Why:** Provide a governed provider port for F01 services.
**Done when:** request redaction, timeout, retry, mode labeling, and output validation are executable.
**Unblocks:** G-CORE-058 and G-CORE-059.
## In
- JEV/OpenAI adapter port and provider contract.
## Out
- Prompt taxonomy, domain policy, direct model output exposure.
## Atomicity & Zero-Mock Contract
- One adapter boundary outcome; simulated mode remains explicit.
## Quality priority
**Priority:** P0
## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| F01 provider adapter not bounded | JEV/OpenAI SOT | Add redacted adapter port | adapter tests |
## How
Use JEV runtime and OpenAI provider SOTs, with no secret or raw-PII propagation.
## Open questions
- [ ] [NEEDS CLARIFICATION: selected provider model and latency budget]
## Knowledge links
| Type | Path |
|---|---|
| JEV | docs/03-architecture/jev-agent-runtime-sot.md |
| Satellite | docs/03-architecture/specs/goals/G-CORE-061/G-CORE-061-architecture-spec.md |
## Context manifest
| Kind | Path |
|---|---|
| Provider | docs/03-architecture/openai-provider-sot.md |
## Work steps
### Step 1 — Add governed F01 provider adapter
**Allowed files:** `code/apps/adapters/jev-openai/src/f01-adapter.ts`, `code/apps/adapters/jev-openai/test/f01-adapter.spec.ts`
**Actions:** redact input, bound timeout, validate output, label simulated/sandbox/confirmed mode, and return explicit unknown.
1. Validate the approved contract and boundary inputs.
2. Preserve lineage and emit explicit failure state.
**Verification command:** `npx vitest run code/apps/adapters/jev-openai/test/f01-adapter.spec.ts`
**Completion gate:** secrets/PII cannot enter provider payloads or output contracts.
**Stop condition:** provider authority or mode semantics missing.
## Change delta
| Area | Action | Path |
|---|---|---|
| Adapter | ADD | code/apps/adapters/jev-openai/src/f01-adapter.ts |
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Epic & Integration Branch | `epic/CORE`; `feature/G-CORE-061` |
| System Archetype | backend-service |
| Bounded Context & Domain | governed AI adapter |
| Ports & Adapters Topology | F01 service → JEV → OpenAI/provider |
| State Machine & Invariants | accepted/timeout/unknown/rejected; mode visible |
| Zero-Mock & Conformance Gate | provider contract tests; no secret fixtures |
## Contract impact
- Provides an internal adapter port; no public API.
## Spec checklist
- [ ] Goal and architecture harnesses pass
## Acceptance criteria
- [ ] Input redaction and output schema validation pass.
- [ ] Timeout/unknown is explicit and bounded.
- [ ] Mode label is preserved end to end.
## Test plan
- Positive validated result; negative PII/secret/provider schema; timeout and outage.
## Epistemic Proof & Evidence Classification
Executable adapter evidence; provider result remains empirical.
## Touch map
- code/apps/adapters/jev-openai/src/f01-adapter.ts
- code/apps/adapters/jev-openai/test/f01-adapter.spec.ts
## Notes for AI
The adapter cannot make policy, approval, or execution decisions.
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
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-061/G-CORE-061-architecture-spec.md |

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
