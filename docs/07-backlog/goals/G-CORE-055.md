---
goal_contract:
  id: G-CORE-055
  version: 2
  kind: api
  status: draft
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "Enforce the KrakenD boundary for Feature 01 Core BFF routes"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: api-gateway-engineer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: ["Ingress exposure"]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-050, G-CORE-052]
  orchestration: {mode: multi_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: draft, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---
# G-CORE-055: Enforce the KrakenD boundary for Feature 01 Core BFF routes
**Status:** draft
**Kind:** api
**Atomic outcome:** KrakenD routes only authenticated, rate-limited internal F01 traffic and cannot expose Core BFF routes publicly.
**Epic:** CORE
**Depends on:** G-CORE-050, G-CORE-052
**Spec stability:** clarify pending | spec check pending | analyze pending
## Context
Route-prefixing SOT defines KrakenD as the edge boundary and Core BFF as private `/internal/v1/core/*`.
## Intent
**Why:** Prevent public or browser access to the orchestration boundary.
**Done when:** Config and boundary tests prove route, auth, rate, correlation, and no-public-exposure rules.
**Unblocks:** deployable Core BFF ingress.
## In
- `docker/krakend/krakend.json` F01 route policy and tests.
## Out
- Core BFF handlers, domain authorization, UI.
## Atomicity & Zero-Mock Contract
- One gateway policy outcome.
## Quality priority
**Priority:** P0
## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| Existing gateway config has no F01 Core BFF proof | docker/krakend/krakend.json | Add contract-backed route policy | gateway harness |
## How
Apply route-prefixing and API gateway contract SOT.
## Open questions
- [ ] [NEEDS CLARIFICATION: production workload identity issuer and rate budget]
## Knowledge links
| Type | Path |
|---|---|
| Gateway | docs/03-architecture/api/route-prefixing-and-boundary-invariant.md |
| Satellite | docs/03-architecture/specs/goals/G-CORE-055/G-CORE-055-architecture-spec.md |
## Context manifest
| Kind | Path |
|---|---|
| Gateway config | docker/krakend/krakend.json |
## Work steps
### Step 1 — Add and verify private F01 route policy
**Allowed files:** `docker/krakend/krakend.json`, `tests/security/core-bff-krakend-boundary.spec.ts`
**Actions:** configure only approved private routes and reject browser/public ingress.
1. Validate the approved contract and boundary inputs.
2. Preserve lineage and emit explicit failure state.
**Verification command:** `node scripts/architecture/check-sot.mjs`
**Completion gate:** boundary test proves no public Core BFF exposure.
**Stop condition:** route prefix or issuer ambiguity.
## Change delta
| Area | Action | Path |
|---|---|---|
| Gateway | CHANGE | docker/krakend/krakend.json |
## Software & Architecture Design
| Dimension | Specification |
|---|---|
| Epic & Integration Branch | `epic/CORE`; `feature/G-CORE-055` |
| System Archetype | api-gateway |
| Bounded Context & Domain | ingress boundary |
| Ports & Adapters Topology | external gateway → private Core BFF |
| State Machine & Invariants | authenticated/denied/rate-limited; never public |
| Zero-Mock & Conformance Gate | config and boundary tests |
## Contract impact
- Implements route-prefixing rules for existing Core BFF operations.
## Spec checklist
- [ ] Goal and architecture harnesses pass
## Acceptance criteria
- [ ] Public/browser direct access is rejected.
- [ ] Auth, rate, correlation, and route version rules are explicit.
## Test plan
- Positive internal request; negative public/browser/invalid identity; rate-limit failure.
## Epistemic Proof & Evidence Classification
Executable boundary evidence.
## Touch map
- docker/krakend/krakend.json
- tests/security/core-bff-krakend-boundary.spec.ts
## Notes for AI
KrakenD routes and protects; it does not implement F01 business policy.
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
| Architecture satellite | docs/03-architecture/specs/goals/G-CORE-055/G-CORE-055-architecture-spec.md |

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
