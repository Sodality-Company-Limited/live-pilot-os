---
goal_contract:
  id: G-MARG-003
  version: 2
  kind: api
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Versioned JSON schemas, AsyncAPI channel definitions, NATS subject catalog rows, and executable contract tests."
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: medium, reasons: [message schema evolution, consumer compatibility, and contract validation]}
  reversibility: {level: reversible}
  external_dependencies: []
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released, learning: done}
---

# G-MARG-003: Register Margin NATS Schemas, AsyncAPI channels, and Contract Tests

**Status:** done  
**Closed:** 2026-11-21  
**Kind:** api  
**Atomic outcome:** Versioned JSON schemas, AsyncAPI channel definitions, NATS subject catalog rows, and executable contract tests.  
**Epic:** MARG  
**Depends on:** G-MARG-001  
**Blocks:** G-MARG-004  
**Spec stability:** clarify approved | spec check approved | analyze approved

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | Create JSON schemas, update AsyncAPI catalog, register error codes, and implement contract test suite | ready |

## Worktree & Multi-Subagent Orchestration Plan
Single worktree on `feature/G-MARG-003`; bounded implementer followed by independent Codex reviewer; no child agents.

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents `.git/index.lock` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | `.` *(primary repo root)* | `feature/G-MARG-003` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | `docs/07-backlog/goals/G-MARG-003.md` | `INIT` → `DISPATCH` → `JOIN` → `VERIFY` → `CLEANUP` |
| **Subagent-1 (Implementer)** | `.worktrees/G-MARG-003-impl` | `feature/G-MARG-003-impl` | Step 1: Production source implementation & domain logic | `code/**` (scoped implementation files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-2 (Verifier/Test)** | `.worktrees/G-MARG-003-test` | `feature/G-MARG-003-test` | Step 2: Zero-mock unit & integration test suites | `tests/**` (scoped test files) | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |
| **Subagent-3 (Socratic/Archivist)** | `.worktrees/G-MARG-003-arch` | `feature/G-MARG-003-arch` | Socratic 5-Why dialectic, baseline freeze & audit log | `docs/06_raw/**`, `docs/wiki/**` | `PROVISION` → `EXECUTE` → `WAIT_FOR_JOIN` → `PRUNE` |

## Context
Margin Policy communicates via NATS request/reply for synchronous margin evaluation and JetStream events for verdict publishing and re-evaluation triggers.

## Intent
**Why:** Lock message envelopes, payload contracts, and error code mappings before writing runtime service handlers.  
**Done when:** JSON schemas pass draft-07 linting, AsyncAPI and NATS subject catalog are registered, and contract test suite passes.  
**Unblocks:** G-MARG-004

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
- docs/03-architecture/api/schemas/nats/margin-evaluation-request.schema.json
- docs/03-architecture/api/schemas/nats/margin-evaluation-reply.schema.json
- docs/03-architecture/api/schemas/nats/margin-verdict-recorded.schema.json
- docs/03-architecture/api/asyncapi.yaml
- docs/03-architecture/api/nats-subject-catalog-sot.md
- docs/03-architecture/api/error-codes.yaml
- tests/contracts/margin/
- docs/03-architecture/specs/goals/G-MARG-003/

## Out
- Runtime business logic implementation (owned by G-MARG-004)
- Database connection pooling (owned by G-MARG-004)

## Open questions
- [x] None; unresolved architectural decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | BR-F03-009, BR-F03-010, BR-F03-011, BR-F03-012, BR-F03-013 |
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/service-topology-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md |
| Deployment | docs/03-architecture/deployment/README.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated evidence.
- **Fail closed:** unknown, stale, unauthorized, or failed work cannot report success.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Work steps
### Step 1 — Create JSON schemas, update AsyncAPI catalog, register error codes, and implement contract test suite
**Allowed files:** `docs/03-architecture/api/schemas/nats/margin-evaluation-request.schema.json`, `docs/03-architecture/api/schemas/nats/margin-evaluation-reply.schema.json`, `docs/03-architecture/api/schemas/nats/margin-verdict-recorded.schema.json`, `docs/03-architecture/api/asyncapi.yaml`, `docs/03-architecture/api/nats-subject-catalog-sot.md`, `docs/03-architecture/api/error-codes.yaml`, `tests/contracts/margin/`, `docs/03-architecture/specs/goals/G-MARG-003/`  
**Actions:**
1. Author JSON Schemas for margin evaluation request/reply and verdict recorded event with strict integer money constraints.
2. Register subjects in docs/03-architecture/api/nats-subject-catalog-sot.md and channels in asyncapi.yaml, and run contract tests.
**Verification command:** node scripts/contract-check/error-code-registry.mjs  
**Completion gate:** JSON schemas validate cleanly, error codes LP04xxx are registered, and contract test fixtures execute 100% green.  
**Stop condition:** Unregistered subject, schema validation error, or floating-point number in JSON schema definition.**Zero-Mock invariant check:** Real production code only; zero mocks, zero stubs, zero simulated bypasses.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| margin-policy-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Margin Protection and Deterministic Economic Policy |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [x] Intent is WHAT/WHY only.
- [x] Touch map is real and bounded.
- [x] Acceptance criteria and verification command are executable.
- [x] Architecture and goal conformance harnesses pass.

## Acceptance criteria
- [x] JSON Schemas enforce live_session_id, correlation_id, causation_id, and minor-unit financial properties.
- [x] AsyncAPI and NATS subject catalog rows are complete with DLQ and ordering keys.
- [x] Contract tests verify additive field compatibility and reject malformed envelopes.

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
- `docs/03-architecture/api/schemas/nats/margin-evaluation-request.schema.json`
- `docs/03-architecture/api/schemas/nats/margin-evaluation-reply.schema.json`
- `docs/03-architecture/api/schemas/nats/margin-verdict-recorded.schema.json`
- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/api/nats-subject-catalog-sot.md`
- `docs/03-architecture/api/error-codes.yaml`
- `tests/contracts/margin/`
- `docs/03-architecture/specs/goals/G-MARG-003/`

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer minor units, zero-float calculations, and remainder-preserving arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
