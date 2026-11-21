---
goal_contract:
  id: G-CORE-057
  version: 2
  kind: api
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "versioned JEV/Copilot proposal contract"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [agent boundary and event compatibility]}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-057: Define the JEV/Copilot proposal contract
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** api  
**Atomic outcome:** A versioned, executable contract for typed Copilot proposals, deferrals, evidence, and provider receipts.  
**Epic:** CORE  
**Depends on:** —  
**Traceability:** REQ-LP-001, REQ-LP-004, REQ-LP-009; `jev-agent-runtime-sot.md`; `openai-provider-sot.md`; `api/services/README.md`

## In
- Suggestion/HostCue/PromotionProposal result types, evidence references, confidence, expiry, defer reasons, provider metadata, and the `SIMULATED` label.
- NATS subject/schema registration for `copilot.suggestion.created`.

## Out
- Runtime code, PostgreSQL, provider calls, UI, margin decisions, approvals, inventory, voucher issuance, and deployment.

## Work steps
### Step 1 — publish the contract
**Allowed files:** `docs/03-architecture/api/services/jev-copilot-service.md`, `docs/03-architecture/api/schemas/nats/jev-copilot-proposal.schema.json`, `docs/03-architecture/api/asyncapi.yaml`, `docs/03-architecture/contracts/flows/coverage.yaml`, `docs/03-architecture/specs/goals/G-CORE-057/`
**Actions:**
1. Define only SOT-backed fields and bind the subject, owner, schema hash, compatibility, and retry/DLQ rules.
2. Record authorization, audit, and redaction requirements in the contract.
**Verification command:** `node scripts/architecture/check-sot.mjs && node scripts/api/check-api-sot-traceability.mjs`
**Completion gate:** Contract checks pass and no proposal field grants approval, stock, money, or execution authority.
**Stop condition:** Any invented payload, missing evidence lineage, or missing flow ownership.

## Acceptance criteria
- [x] Typed proposal and deferral schemas validate positive and negative fixtures.
- [x] Subject catalog and flow coverage identify one owner, producer, consumers, hash, retry/DLQ, and verification command.
- [x] Contract explicitly rejects provider output as approval or execution.

## Test plan
Schema validation, additive compatibility, unknown/refusal/defer cases, redaction, and subject-catalog checks.

## Touch map
- `docs/03-architecture/api/services/jev-copilot-service.md`
- `docs/03-architecture/api/schemas/nats/jev-copilot-proposal.schema.json`
- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/contracts/flows/coverage.yaml`
- `docs/03-architecture/specs/goals/G-CORE-057/`

## Kind Metadata
**Kind:** feature

## Spec Stability Metadata
**Spec stability:** clarify pending | spec check pending | analyze pending

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Implement the declared atomic outcome | done |

## Worktree & Multi-Subagent Orchestration Plan
Single dedicated feature/G-CORE-057 branch; one bounded implementer; no local merge or production deployment.

## Intent Section
**Why:** Deliver the single Catalog capability defined by the linked SOTs.
**Done when:** The declared outcome has reproducible green evidence.
**Unblocks:** The next Catalog goal in dependency order.

## Intent Why Invariant
The outcome is required by the Catalog service ownership SOT and is independently verifiable.

## Intent Done When Invariant
Done means all acceptance criteria and the stated verification command pass on the exact revision.

## Intent Unblocks Invariant
Downstream Catalog goals may not start until this goal's evidence is green.

## How
Implement only the declared outcome using the linked SOTs and real repository contracts.

## Open Questions
- [x] None; unresolved SOT decisions block promotion to ready.

## Knowledge Links Table
| Type | IDs |
|---|---|
| Requirement | REQ-LP-004; REQ-LP-005; REQ-LP-016 |

## Context Manifest Table
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/overview.md; docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md |

## Atomicity & Zero-Mock Contract
- Exactly one independently verifiable outcome.
- No stubs, placeholders, fabricated evidence, or hidden external mutations.

## Antigravity Handoff Contract
Return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Change Delta Table
| Area | Action | Path / behaviour |
|---|---|---|
| Catalog | ADD | Goal-scoped contract, implementation, test, or deployment artifact |

## Software & Architecture Design Section
| Dimension | Specification |
|---|---|
| System archetype | backend-service / event-stream / deployment as scoped |
| Bounded context | Catalog service |
| Ports and adapters | inbound Catalog capability; outbound PostgreSQL/NATS/telemetry ports as applicable |
| State machine | draft → approved → stale/withdrawn; invalid transitions fail closed |
| Conformance | architecture and SOT harnesses must pass |

## Spec Checklist
- [x] Intent is WHAT/WHY only.
- [x] Acceptance criteria and touch map are real and testable.
- [x] Authorization, idempotency, audit, failure, and rollback invariants are explicit.

## Test Plan
- Positive, negative, stale, unauthorized, replay, timeout/unknown, and recovery cases appropriate to this goal.
- Run the verification command stated in the work step.

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, linked API/flow authority, and deployment authority before execution.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM Matrix)
See the goal FSM satellite specification.

### Mathematical & Data Invariants Spec
See the invariants satellite specification.

### Hexagonal Ports & Adapters Spec
Keep service-owned state behind explicit ports; do not bypass boundaries.

## Notes for AI
Read architecture, technical, software-quality, testing, JEV, OpenAI, identity, NATS, error, idempotency, and persistence SOTs before execution. Keep status planned until clarify/spec-check/analyze pass.
**Spec stability:** clarify pending | spec check pending | analyze pending

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:------:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|---|---|
| 1 | Implement the declared atomic outcome | done |

## Context
This goal is one bounded step in the JEV/Copilot service chain and is grounded in the linked SOTs.

## Intent
**Why:** Establish one independently verifiable JEV/Copilot capability without crossing service boundaries.  
**Done when:** The listed acceptance criteria and verification command pass with reproducible evidence.  
**Unblocks:** The next goal in the dependency chain.

## How
Contract-first, fail-closed implementation within the declared touch map.

## Open questions
- [ ] None; unresolved decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-001; REQ-LP-004; REQ-LP-009 |
| SOT | docs/03-architecture/jev-agent-runtime-sot.md; docs/03-architecture/testing-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/technical-specifications-sot.md |
| Deployment | docs/03-architecture/deployment/README.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no placeholders, fabricated evidence, or silent provider success.
- **Fail closed:** unknown, stale, unauthorized, malformed, timed-out, or unreconciled work cannot report success.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic work steps with allowed files, verification command, completion gate, stop condition, and zero-mock invariant check.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| JEV/Copilot service | CHANGE | Implement only the declared atomic outcome |
| Verification | ADD | Positive, negative, replay, timeout, and fail-closed evidence |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service / event-stream / deployment as scoped |
| Bounded Context & Domain | JEV/Copilot agentic core |
| Ports & Adapters Topology | Inbound contract; explicit PostgreSQL, NATS, provider, audit, and telemetry ports where applicable |
| State Machine & Invariants | received -> validating -> proposed or deferred -> persisted -> published or DLQ; unknown never succeeds |
| Zero-Mock & Conformance Gate | Concrete implementation and executable verification |

## Contract impact
- Only the contract or service-owned paths named in this goal are in scope.

## Spec checklist
- [ ] Intent is WHAT/WHY only.
- [ ] Acceptance criteria are testable and touch map paths are explicit.
- [ ] Security, failure, idempotency, audit, and rollback invariants are explicit.
- [ ] Architecture and goal conformance harness passes.

## Notes for AI
Read the architecture, technical, quality, testing, API, JEV, provider, and deployment SOTs before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
See the goal-specific FSM satellite specification.

### Mathematical & Data Invariants Spec
See the goal-specific invariants satellite specification.

### Hexagonal Ports & Adapters Spec
All external boundaries remain behind explicit ports; no service reads another service's tables.

## Epistemic Proof & Evidence Classification
Executable tests provide empirical evidence; they do not prove provider availability or absence of all defects.
### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-CORE-057; no subagents; only the declared touch map.
| **System Archetype** | backend-service / event-stream / deployment as scoped |
| **Bounded Context & Domain** | JEV/Copilot agentic core |
| **Ports & Adapters Topology** | Explicit inbound and outbound ports; no cross-service table access |
| **Zero-Mock & Conformance Gate** | Concrete implementation and executable verification |
| **Socratic 5-Why Blueprint** | Derive from linked SOT evidence during PLAN |

- [ ] Software & Architecture Design specified by AI Agent.
- [ ] Socratic 5-Why Dialectic report generated/linked before ready.
- [ ] Architecture & Goal Conformance Harness passing.
