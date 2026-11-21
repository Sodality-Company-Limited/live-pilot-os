---
goal_contract:
  id: G-CORE-068
  version: 2
  kind: feature
  status: done
  profiles: [core, backend, security]
  atomicity:
    outcome_count: 1
    primary_outcome: "one authenticated idempotent intent/risk service handler"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: critical, reasons: [authorization, replay, NATS delivery, fail-closed safety]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-066, G-CORE-067]
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-068: Wire the Intent/Risk service handler
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** An authenticated, idempotent NATS handler that commits and publishes intent/risk results.  
**Epic:** CORE  
**Depends on:** G-CORE-066, G-CORE-067  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Context
This is the service boundary: session/tenant authorization, schema validation, pure decision invocation, PostgreSQL transaction, outbox publication, retry/DLQ, and explicit unknown/deferred states.

## Intent
**Why:** Turn the contract and domain engine into one safe service-owned operation.  
**Done when:** Real DB/NATS tests prove exactly-once semantic processing, auth rejection, replay safety, timeout handling, and audit lineage.  
**Unblocks:** G-CORE-069.

## In
- NATS request/reply and JetStream consumer, authorization context, idempotency, transaction boundary, retry/DLQ, correlation/causation, metrics/log redaction, and graceful shutdown.

## Out
- Public BFF/gateway, UI, cross-service orchestration, external platform mutation, and production apply.

## How
Hexagonal handler using the G-CORE-066 domain port and G-CORE-067 persistence/outbox ports.

## Open questions
- [x] [NEEDS CLARIFICATION: Confirm concrete Node/Nest service package location and NATS consumer bootstrap from the implementation baseline.]

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-001; REQ-LP-002 |
| Flows | F01.1-FLOW-008; F01.2-FLOW-005; F01-INTEGRATION-003 |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Security | `docs/03-architecture/api/identity-tenancy-authorization-sot.md`; `docs/03-architecture/api/idempotency-mutation-sot.md` |
| Testing | `docs/03-architecture/testing-sot.md` |

## Atomicity & Zero-Mock Contract
- **One outcome:** one complete handler boundary.
- **Concrete execution:** real contract-shaped DB/NATS integration tests; failure injection is deterministic and bounded.
- **Fail closed:** missing identity, policy, evidence, or commit receipt cannot return success.

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-CORE-068`; no subagents; handler touch map only.

## Work steps
### Step 1 — implement the handler boundary
**Allowed files:** `code/**/intent-risk-service/**`, `tests/**/intent-risk-service/**`, `docs/03-architecture/specs/goals/G-CORE-068/`  
**Actions:**
1. Add authorization/context validation, deduplication, domain invocation, transaction/outbox commit, publish/ack, retry/DLQ, and redacted observability.
2. Produce the verification evidence and stop on any failed gate.
**Verification command:** `npm test -- --runInBand`  
**Completion gate:** Integration and adversarial suites pass for auth, replay, duplicate delivery, stale revisions, outage, timeout, DLQ, and audit causality.  
**Stop condition:** Any success without durable commit, blind retry after unknown outcome, or secret/PII leakage.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Service | ADD | Intent/risk NATS handler and lifecycle |
| Verification | ADD | Contract, integration, security, and chaos tests |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | `feature/G-CORE-068` |
| **System Archetype** | `backend-service` / `event-stream` |
| **Bounded Context & Domain** | Signals and decisioning / Intent-Risk |
| **Ports & Adapters Topology** | NATS inbound; domain, PostgreSQL, outbox, audit, telemetry outbound |
| **State Machine & Invariants** | RECEIVED → VALIDATED → PROCESSING → COMMITTED → PUBLISHED; deferred/rejected/reconcile explicit |
| **Zero-Mock & Conformance Gate** | Real DB/NATS contract and adversarial evidence |
| **Socratic 5-Why Blueprint** | Derive from handler failure modes during PLAN |

## Contract impact
- Implements G-CORE-065 contracts and G-CORE-067 persistence; no public route.

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Software & Architecture Design specified by AI Agent.
- [x] Runtime package location clarification closed before ready.

## Acceptance criteria
- [x] Unauthorized or cross-session messages are rejected before persistence/publication.
- [x] Same idempotency key/fingerprint returns the original receipt without duplicate facts/events; mismatch returns conflict.
- [x] DB/NATS failures produce bounded retry, DLQ, deferred, or reconciliation-required states with no false success.
- [x] Correlation, causation, policy/model revision, redacted evidence, and mode label are preserved end to end.

## Test plan
- Schema/contract, real PostgreSQL/NATS integration, auth/RLS, duplicate/out-of-order, timeout/unknown, DLQ/replay authorization, graceful shutdown, and redaction tests.

## Touch map
- `code/**/intent-risk-service/**`
- `tests/**/intent-risk-service/**`
- `docs/03-architecture/specs/goals/G-CORE-068/`

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

This is the service-completion gate. Do not repair other services or begin cross-service integration here.

## Comprehensive Spec Design Appendix
### Mathematical & Data Invariants
Service scope, monotonic revisions, idempotency, UTC timestamps, bounded payloads, and explicit unknown/deferred states are verified as executable invariants; monetary arithmetic is out of scope for this service.

FSM: `docs/03-architecture/specs/goals/G-CORE-068/G-CORE-068-fsm-runtime-spec.md`  
Invariants: `docs/03-architecture/specs/goals/G-CORE-068/G-CORE-068-invariants-formal-spec.md`  
Threat model: `docs/03-architecture/specs/goals/G-CORE-068/G-CORE-068-threat-model.md`.

## Epistemic Proof & Evidence Classification
`PASS-SIMULATED` may certify core handler behavior only; it cannot certify external platform availability.
