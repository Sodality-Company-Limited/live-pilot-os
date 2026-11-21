---
goal_contract:
  id: G-CORE-065
  version: 2
  kind: api
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "one versioned intent/risk contract module"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [service boundary and event compatibility]}
  reversibility: {level: reversible}
  external_dependencies: []
  failure_policy:
    dependency_unavailable: fail_closed
    invalid_input: reject
    verification_failure: defer
    timeout: reconcile_then_fail
  rollback:
    trigger: "Contract validation regression, schema incompatibility, or invariant violation"
    command: "git revert --no-edit <verified G-CORE-065 revision>"
    scope: "Files declared in the G-CORE-065 Touch map"
    reversible: true
    verification: "node docs/03-architecture/specs/goals/G-CORE-065/contract-validation.test.mjs && node scripts/architecture/check-sot.mjs"
  proof_contract:
    invariants:
      - id: INV-CORE-065-001
        statement: "Every approved event schema preserves session, tenant, correlation, causation, and evidence lineage."
        classification: executable_invariant
        verification: "node docs/03-architecture/specs/goals/G-CORE-065/contract-validation.test.mjs"
      - id: INV-CORE-065-002
        statement: "Unknown schema versions, missing evidence, unsafe raw text, and out-of-range scores fail closed."
        classification: executable_property_test
        verification: "node docs/03-architecture/specs/goals/G-CORE-065/contract-validation.test.mjs"
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-065: Freeze the Intent/Risk service contract
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** api  
**Atomic outcome:** A versioned, executable contract module for `intent-risk-service`.  
**Epic:** CORE  
**Depends on:** —  
**Spec stability:** clarify done | spec check done | analyze done

## Context
The architecture names `intent-risk-service` as the owner of intent and moderation facts, while the API catalog records several internal event pairs whose schemas are still pending. This goal freezes only the service contract.

## Intent
**Why:** Prevent implementation from inventing event fields, lifecycle, or error semantics.  
**Done when:** Intent detected/deferred, risk detected, and severity-ranked envelopes validate with compatibility tests.  
**Unblocks:** G-CORE-066 and G-CORE-067.

## In
- Versioned NATS envelopes, payload schemas, event ownership, error/retry semantics, redaction, and coverage registration.

## Out
- Domain algorithms, PostgreSQL migrations, runtime deployment, UI/BFF, and external marketplace mutation.

## How
Contract-first JSON Schema and AsyncAPI/NATS references grounded in the API catalog and F01 flow SOTs.

## Open questions
- [x] Pilot policy assumption recorded in `docs/07-backlog/clarifications/CLARIFICATION-G-CORE-065.md`; production calibration remains out of scope.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-001; REQ-LP-002 |
| SOT | `docs/03-architecture/api/api-operation-catalog-sot.md`; `docs/03-architecture/api/nats-subject-catalog-sot.md` |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Architecture | `docs/03-architecture/overview.md`; `docs/03-architecture/technical-specifications-sot.md` |
| Flows | F01.1-001..008; F01.2-001..007 |

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable contract module.
- **Concrete execution:** schemas and compatibility checks are executable; no placeholder fields.
- **Fail closed:** unknown versions, invalid evidence, and unsafe payloads are rejected.

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CORE-065`; no subagents; only declared contract paths.

## Work steps
### Step 1 — publish the contract module
**Allowed files:** `docs/03-architecture/api/services/intent-risk-service.md`, `docs/03-architecture/api/schemas/nats/intent-risk*.schema.json`, `docs/03-architecture/api/asyncapi.yaml`, `docs/03-architecture/contracts/flows/coverage.yaml`, `docs/03-architecture/specs/goals/G-CORE-065/`  
**Actions:**
1. Define the three event families and register owner, producers, consumers, schema revision, redaction, retry, DLQ, and replay rules.
2. Produce the verification evidence and stop on any failed gate.
**Verification command:** `node scripts/architecture/check-sot.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/contract-check/error-code-registry.mjs`  
**Completion gate:** All schemas validate and every contract has one owner and an executable verification command.  
**Stop condition:** Any invented field, missing error code, or uncovered flow.
**Zero-Mock invariant check:** Contract validation must exercise the real JSON Schemas and repository SOT checks; no mocks, stubs, placeholders, or fabricated provider outcomes.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Contract | ADD/CHANGE | Intent/risk service contract and NATS schemas |
| Coverage | CHANGE | Register service contract ownership and verification |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | `feature/G-CORE-065` |
| **System Archetype** | `event-stream` |
| **Bounded Context & Domain** | Signals and decisioning / Intent-Risk |
| **Ports & Adapters Topology** | Inbound versioned NATS commands; outbound JetStream, audit, and projection events |
| **State Machine & Invariants** | RECEIVED → VALIDATED → COMMITTED → PUBLISHED; invalid/unknown never succeeds |
| **Zero-Mock & Conformance Gate** | `architecture-design-conformance-harness.mjs` plus schema tests |
| **Socratic 5-Why Blueprint** | Contract rationale recorded in the goal evidence receipt |

## Contract impact
- Add versioned intent/risk event schemas; no public browser route.

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Software & Architecture Design specified by AI Agent.
- [x] Acceptance criteria testable and touch map real.
- [x] No `[NEEDS CLARIFICATION]` left before ready.

## Acceptance criteria
- [x] `telemetry.intent.detected.v1`, `telemetry.intent.deferred.v1`, `telemetry.risk.detected.v1`, and `risk.severity.ranked.v1` have schemas with correlation, causation, session scope, policy/model revision, evidence, and mode label.
- [x] Invalid versions, missing evidence, oversized payloads, and unsafe raw text are rejected by executable tests.
- [x] Coverage and API traceability checks pass.

## Test plan
- Positive/negative JSON Schema validation, additive compatibility, error-code registry, redaction, replay metadata, and flow coverage checks.

## Touch map
- `docs/03-architecture/api/services/intent-risk-service.md`
- `docs/03-architecture/api/schemas/nats/intent-risk*.schema.json`
- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/contracts/flows/coverage.yaml`
- `docs/03-architecture/specs/goals/G-CORE-065/`

## Failure Policy & Rollback Contract

The contract fails closed on unavailable dependencies, invalid input, failed
verification, and timeout/unknown outcomes. A revision-bound revert restores the
declared contract paths; the post-rollback verification command must pass before
the goal can return to execution.

## Security & Trust Boundaries

```yaml
security:
  threat_model: "Reject forged session or tenant scope, unsupported schema versions, oversized or unsafe payloads, and raw evidence leakage."
  trust_boundary: "Only authenticated internal NATS producers and the intent-risk-service owner may create or publish these facts."
  tool_authorization: "No external tools or marketplace mutations are authorized by this contract goal."
  sandbox_boundary: "Contract validation runs as a bounded local process and cannot access production systems."
  secret_handling: "Schemas and evidence references contain no credentials, tokens, or provider payloads."
  pii_handling: "Evidence is redacted or hashed; raw text is not an allowed schema property."
```

## Observability & Drift Telemetry

```yaml
observability:
  metrics:
    - "intent_risk_contract_validation_total{event_type,outcome}"
    - "intent_risk_deferred_total{reason}"
  alerts:
    - "contract_validation_failure_rate > 0"
    - "unknown_or_deferred_outcome_without_evidence > 0"
  traces:
    - "intent-risk.contract.validate"
    - "intent-risk.contract.publish"
  dashboards:
    - "Intent/Risk contract health and fail-closed outcomes"
```

## Learning-Loop Contract

```yaml
learning_loop:
  observed_metrics: "Validation failures, deferred/rejected reasons, schema revision usage, and redaction failures."
  review_schedule: "Review after each contract revision and at the pilot evidence checkpoint."
  regression_threshold: "Any new validation failure, unknown outcome without evidence, or incompatible schema change blocks progression."
  feedback_mechanism: "Feed redacted failure reasons and compatibility findings into the next contract or calibration goal; never silently tune production policy here."
```

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
| 1 | Implement the declared atomic outcome | current |

Read the architecture, technical, quality, testing, API, F01 flow, and deployment SOTs before execution. Do not implement the service in this goal.

## Comprehensive Spec Design Appendix
### Mathematical & Data Invariants
Service scope, monotonic revisions, idempotency, UTC timestamps, bounded payloads, and explicit unknown/deferred states are verified as executable invariants; monetary arithmetic is out of scope for this service.

FSM: `docs/03-architecture/specs/goals/G-CORE-065/G-CORE-065-fsm-runtime-spec.md`  
Invariants: `docs/03-architecture/specs/goals/G-CORE-065/G-CORE-065-invariants-formal-spec.md`  
Ports: contract table above.

## Epistemic Proof & Evidence Classification
Contract validation is empirical executable evidence; it does not prove provider availability.
