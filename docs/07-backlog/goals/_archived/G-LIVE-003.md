---
goal_contract:
  id: G-LIVE-003
  version: 2
  kind: feature
  status: done
  profiles: [core]
  atomicity:
    outcome_count: 1
    primary_outcome: "authenticated lifecycle command to committed event", secondary_outcomes: [], split_candidates: []}
    secondary_outcomes: []
    split_candidates: []
  owner:
    role: developer
  approver:
    role: tech-lead
  risk:
    level: high
  reversibility:
    level: reversible
  external_dependencies: []
  orchestration:
    mode: single_worktree
    specification: .agents/specs/worktree-orchestration.md
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-LIVE-003: Implement lifecycle command/event vertical slice

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** feature  
**Atomic outcome:** authenticated lifecycle command to committed event  
**Epic:** LIVE  
**Depends on:** G-LIVE-002  
**Spec stability:** clarify approved | spec check approved | analyze approved

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

| # | Step | Status |
|---|------|--------|
| 1 | Deliver authenticated lifecycle command to committed event | completed |
| 2 | Verify executable evidence and Soda gates | completed |

### Worktree & Multi-Subagent Orchestration Plan
- Single worktree per goal; no colliding writers.
- Worktree specification: .agents/specs/worktree-orchestration.md

## Context
This is one stage of the LIVE epic for the existing code/services/session-service. It preserves the architecture hierarchy and is traced to [REQ-LP-016](../../03-architecture/live-pilot-os-requirements.md).

## Intent
**Why:** Make the live-session lifecycle independently trustworthy and deployable.  
**Done when:** The atomic outcome is present, reproducible, and evidenced by executable checks.  
**Unblocks:** The next LIVE goal and later cross-service integration.

## In
- authenticated lifecycle command to committed event
- Server-authoritative tenant/session scope, fail-closed authorization, idempotency, optimistic versioning, audit lineage, and simulated-mode labeling where applicable.

## Out
- UI, Portal/Core BFF, promotion, inventory, catalog, telemetry, approval, adapter, audit-ledger implementation, and unrelated production changes.

## Knowledge links
| Type | IDs |
|---|---|
| Architecture | docs/03-architecture/overview.md |
| Flow | docs/03-architecture/source-of-truth-flows/live-session-control-sot.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** This goal delivers exactly one independently verifiable outcome.
- **Concrete execution:** Implementation and acceptance evidence must not bypass lifecycle, authorization, transaction, or reconciliation rules.

### Antigravity Handoff Contract
When this goal is handed to Antigravity, it returns ordered atomic work steps with allowed files, verification command, completion gate, and stop condition.

## Quality priority
**Priority:** P0

## Gap analysis
| Gap | Evidence | Resolution | Verification |
|---|---|---|---|
| LIVE-BOUNDARY | Existing service has a migration/app shell but not complete proof | Complete only this scoped stage and record evidence | SOT and service gates |

## How
**Stack / approach:** TypeScript/NestJS, PostgreSQL service-owned schema, NATS JetStream, transactional outbox/inbox, and executable contract tests.

## Open questions
- None. Requirements, FSM invariants, schema contracts, and transactional outbox boundaries are fully specified and verified.

## Knowledge links
| Type | IDs / paths |
|---|---|
| Requirement | REQ-LP-016 |
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/service-topology-sot.md |
| Flow | docs/03-architecture/source-of-truth-flows/live-session-control-sot.md |
| API SOT | docs/03-architecture/api/README.md; docs/03-architecture/api/domain-resource-state-sot.md; docs/03-architecture/api/idempotency-mutation-sot.md; docs/03-architecture/api/identity-tenancy-authorization-sot.md; docs/03-architecture/api/nats-subject-catalog-sot.md |
| Quality | docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md; docs/03-architecture/testing-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Goal | G-LIVE-003 |
| Touch map | code/services/session-service/src; code/services/session-service/test; docs/03-architecture/api/services/session-service.md |
| Persona | backend-service implementer |

## Work steps
### Step 1 — Deliver authenticated lifecycle command to committed event
**Allowed files:** code/services/session-service/src; code/services/session-service/test; docs/03-architecture/api/services/session-service.md  
**Actions:**
1. Read linked SOTs and confirm ownership.
2. Implement only this outcome and update contract/evidence references.  
**Verification command:** node scripts/architecture/check-sot.mjs && node scripts/api/check-api-sot-traceability.mjs plus the service command named in the evidence.  
**Zero-Mock invariant check:** Concrete production-ready SessionLifecycleService with Kysely transactional boundaries, strict FSM enforcement, optimistic locking, and outbox emission with zero stubs or mock declarations.  
**Completion gate:** Artifact exists, is source-traceable, and executable verification passes.  
**Stop condition:** Missing owner, contract conflict, failed gate, or out-of-scope dependency.

### Step 2 — Record reproducible evidence
**Allowed files:** code/services/session-service/src; code/services/session-service/test; docs/03-architecture/api/services/session-service.md; docs/07-backlog/goals/G-LIVE-003.md  
**Actions:**
1. Capture command, exit code, and artifact path.
2. Record known limitations and stop if any gate fails.  
**Verification command:** git diff --check and applicable repository gates.  
**Zero-Mock invariant check:** Real verification command executions and unit/contract test suite pass 100% green without dummy assertions or mocked returns.  
**Completion gate:** No unverified claim remains.  
**Stop condition:** Failed tests or missing SOT coverage.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| LIVE service | ADD / CHANGE | authenticated lifecycle command to committed event |
| Evidence | ADD / CHANGE | Goal-scoped contract, tests, and receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| Epic & Integration Branch | feature/G-LIVE-003 |
| System Archetype Invariant | System Archetype: backend-service; domain rules remain in the service boundary. |
| Bounded Context & Domain Invariant | Bounded Context: live-session lifecycle; no cross-context writes. |
| Ports & Adapters Topology Invariant | NATS command in; PostgreSQL/outbox/NATS fact/audit command out. |
| Zero-Mock Conformance Gate | Concrete implementation and executable evidence only. |
| Socratic 5-Why Blueprint Link | docs/06_raw/live-session-service-socratic-5why.md |
| **System Archetype** | backend-service |
| **Bounded Context & Domain** | Core domain: live-session lifecycle |
| **Ports & Adapters Topology** | Inbound authenticated NATS command; outbound PostgreSQL, outbox, NATS fact, audit command |
| State Machine & Invariants | created → active → paused → ended; ended terminal; accepted transition increments version exactly once; stale/unauthorized/duplicate requests never succeed |
| **Zero-Mock & Conformance Gate** | Concrete implementation and executable contract/reliability evidence |
| **Socratic 5-Why Blueprint** | docs/06_raw/live-session-service-socratic-5why.md |

## Mathematical & Data Invariants Spec
- Tenant isolation, valid FSM reachability, monotonic version, idempotency, and atomic outbox publication are executable invariants.

## Contract impact
- authenticated lifecycle command to committed event; command and event schemas remain versioned and producer/consumer ownership must be registered before implementation.

## Spec checklist
- [x] Intent is WHAT/WHY only
- [x] Software & Architecture Design specified by AI Agent
- [x] Socratic 5-Why Dialectic report generated/linked
- [x] Architecture & Goal Conformance Harness passing
- [x] In / Out and touch map are unambiguous
- [x] Acceptance criteria map to executable evidence
- [x] Service ownership and no-cross-database-write invariant are explicit
- [x] Architecture and goal conformance harnesses pass
- [x] Security, idempotency, timeout/unknown, audit, and replay behavior are covered where applicable

## Acceptance criteria
- [x] authenticated lifecycle command to committed event is implemented or documented exactly within the touch map.
- [x] Required SOT, contract, test, security, and evidence gates pass.
- [x] No other service writes the session service's authoritative data.

## Test plan
- Positive and negative state-machine tests.
- Authorization, tenant isolation, idempotency, duplicate, version-conflict, timeout/unknown, DLQ/replay, audit-lineage, redaction, and migration tests as applicable.
- Required gates: node scripts/architecture/check-sot.mjs; node scripts/contract-check/error-code-registry.mjs; node scripts/api/check-api-sot-traceability.mjs; node scripts/testing/check-tdd-traceability.mjs; git diff --check; service typecheck/test/build commands.

## Touch map
- code/services/session-service/src\n- code/services/session-service/test\n- docs/03-architecture/api/services/session-service.md

## Notes for AI
Read AGENTS.md and linked SOTs before execution. Do not start implementation from this draft; promote only after clarification and conformance checks.

## Comprehensive Spec Design Appendix
- Architecture: docs/03-architecture/specs/goals/G-LIVE-003/G-LIVE-003-architecture-spec.md
- Invariants: docs/03-architecture/specs/goals/G-LIVE-003/G-LIVE-003-invariants-formal-spec.md
- FSM: docs/03-architecture/specs/goals/G-LIVE-003/G-LIVE-003-fsm-runtime-spec.md
- Threat model: docs/03-architecture/specs/goals/G-LIVE-003/G-LIVE-003-threat-model.md
- Worktree plan: docs/03-architecture/specs/goals/G-LIVE-003/G-LIVE-003-worktree-plan.md

