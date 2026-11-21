---
goal_contract:
  id: G-CORE-066
  version: 2
  kind: feature
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "one deterministic intent/risk domain engine"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [moderation safety and false-clear risk]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-065]
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-066: Implement deterministic intent and risk domain decisions
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** A pure, deterministic engine that classifies supported intents and ranks risk without authorizing consequential actions.  
**Epic:** CORE  
**Depends on:** G-CORE-065  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Context
F01 defines product, price, question, stock/size, voucher, complaint, spam, toxic, unresolved, and moderation-risk outcomes. The engine must preserve uncertainty and never treat risk as ordinary interest.

## Intent
**Why:** Make safety and classification behavior reproducible before I/O exists.  
**Done when:** Pure tests prove deterministic outcomes, explainability, redaction, and fail-closed uncertainty.  
**Unblocks:** G-CORE-068.

## In
- Intent taxonomy, risk categories, confidence thresholds as versioned input, severity mapping, unresolved/deferred outcomes, and product-resolution uncertainty.

## Out
- Persistence, NATS, HTTP, model/provider calls, operator UI, and DigitalOcean.

## How
Pure functions with explicit policy/pattern-set versions and no network or database access.

## Open questions
- [x] Pilot risk categories, severity precedence, score bands, and handling are recorded in `docs/07-backlog/clarifications/CLARIFICATION-G-CORE-065.md`.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-001; REQ-LP-002 |
| Flows | F01.1-FLOW-001..008; F01.2-FLOW-001..005 |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | `docs/03-architecture/source-of-truth-flows/features/F01-live-chat-telemetry/flows/` |
| Quality | `docs/03-architecture/testing-sot.md`; `docs/03-architecture/software-quality-sot.md` |

## Atomicity & Zero-Mock Contract
- **One outcome:** one pure decision engine.
- **Concrete execution:** deterministic fixtures are domain inputs, not production mocks.
- **Fail closed:** low confidence, missing policy, unsupported language, and unresolved SKU produce explicit deferred/rejected states.

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CORE-066`; no subagents; one domain module plus tests.

## Work steps
### Step 1 — implement the pure decision engine
**Allowed files:** `code/**/intent-risk*`, `tests/**/intent-risk*`, `docs/03-architecture/specs/goals/G-CORE-066/`  
**Actions:**
1. Implement taxonomy/risk decisions and exhaustive boundary/property tests.
2. Produce the verification evidence and stop on any failed gate.
**Verification command:** `npm test -- --runInBand`  
**Completion gate:** All supported flows have deterministic outputs and unsafe/uncertain inputs cannot produce actionable success.  
**Stop condition:** Any test depends on network, time, mutable global state, or an unapproved threshold.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Domain | ADD | Pure intent/risk classifier and severity policy |
| Tests | ADD | Deterministic, adversarial, property, and redaction tests |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | `feature/G-CORE-066` |
| **System Archetype** | `backend-service` |
| **Bounded Context & Domain** | Signals and decisioning / Intent-Risk |
| **Ports & Adapters Topology** | Pure inbound decision function; zero outbound I/O |
| **State Machine & Invariants** | classified/deferred/rejected; no low-confidence action trigger |
| **Zero-Mock & Conformance Gate** | Unit/property suite with no network or persistence doubles |
| **Socratic 5-Why Blueprint** | Derive from F01 safety flows during PLAN |

## Contract impact
- Consumes G-CORE-065 payload shapes; emits no transport side effects.

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Software & Architecture Design specified by AI Agent.
- [x] Threshold clarification closed before ready.

## Acceptance criteria
- [x] All REQ-LP-001 intent classes and F01.2 risk categories map to explicit typed outcomes.
- [x] Low confidence, missing policy, unresolved product, unsupported language, and redaction failure are never classified as safe/actionable.
- [x] Repeated identical input plus versioned policy produces byte-equivalent output.

## Test plan
- Positive taxonomy matrix; negative malformed/unsupported inputs; fail-closed policy absence; boundary confidence; adversarial text; property determinism.

## Touch map
- `code/**/intent-risk*`
- `tests/**/intent-risk*`
- `docs/03-architecture/specs/goals/G-CORE-066/`

## Notes for AI
- [ ] Software & Architecture Design specified by AI Agent
- [ ] Socratic 5-Why Dialectic report generated/linked in Knowledge links or Raw Docs
- [ ] Architecture & Goal Conformance Harness passing
### Antigravity handoff contract
When this goal is handed to Antigravity, it returns ordered atomic work steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check. The repository's LivePilot authority remains Codex.

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|---|---|
| 1 | Implement the declared atomic outcome | done |

Do not add model/provider integration. JEV and external moderation are separate bounded contracts.

## Comprehensive Spec Design Appendix
### Mathematical & Data Invariants
Service scope, monotonic revisions, idempotency, UTC timestamps, bounded payloads, and explicit unknown/deferred states are verified as executable invariants; monetary arithmetic is out of scope for this service.

FSM: `docs/03-architecture/specs/goals/G-CORE-066/G-CORE-066-fsm-runtime-spec.md`  
Invariants: `docs/03-architecture/specs/goals/G-CORE-066/G-CORE-066-invariants-formal-spec.md`  
Ports: pure function only.

## Epistemic Proof & Evidence Classification
Determinism and safety are executable empirical evidence; no accuracy target is inferred because the brief explicitly leaves it unapproved.
