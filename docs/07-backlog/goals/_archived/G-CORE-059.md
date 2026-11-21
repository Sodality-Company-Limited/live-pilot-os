---
goal_contract:
  id: G-CORE-059
  version: 2
  kind: migration
  status: done
  profiles: [core, backend]
  atomicity:
    outcome_count: 1
    primary_outcome: "Service-owned durable Telemetry event and checkpoint persistence."
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: high, reasons: [Telemetry service delivery]}
  reversibility: {level: reversible}
  external_dependencies: [G-CORE-058]
  lifecycle: {spec: ready, implementation: done, verification: done, evidence: done, review: approved, release: released}
---
# G-CORE-059: Telemetry persistence
**Status:** done  
**Closed:** 2026-11-21  
**Kind:** migration  
**Atomic outcome:** Service-owned durable Telemetry event and checkpoint persistence.  
**Epic:** CORE  
**Depends on:** G-CORE-058  
**Spec stability:** clarify done | spec check pending | analyze pending
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | ○ | ○ | ○ | **●** |
| # | Step | Status |
|---|---|---|
| 1 | Deliver and verify one Telemetry outcome | done |
### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/G-CORE-059; no subagents; exclusive touch map.
## Context
Telemetry is an authoritative bounded service. Its architecture, API, flow, quality, testing, and deployment SOTs are binding.
## Intent
**Why:** Service-owned durable Telemetry event and checkpoint persistence.  
**Done when:** Executable tests and SOT/conformance gates pass with exact-head evidence.  
**Unblocks:** G-CORE-060.
## In
- One independently verifiable Telemetry outcome.
- Immutable source evidence, idempotency, fail-closed errors, and explicit simulated-mode labeling.
## Out
- UI, BFFs, unrelated services, and DigitalOcean deployment.
## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated evidence.
- **Fail-closed:** unknown, stale, unauthorized, duplicate, or failed work never reports success.
### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, verification command, completion gate, stop condition, and zero-mock check.
## Quality priority
**Priority:** P0
## Gap analysis
| Gap ID | Priority | Evidence | Owner | Solution | Verification | Status |
|---|---|---|---|---|---|---|
| GAP-TELEMETRY-059 | P0 | Outcome lacks independent evidence | developer | Deliver bounded outcome and receipt | Goal test plan | open |
## How
Use the production-shaped Node.js/NestJS, PostgreSQL, Redis, and NATS boundaries defined by the SOTs; keep domain logic behind ports and adapters.
## Open questions
- [x] None; unresolved product, security, destructive-scope, or approval decisions block ready.
## Knowledge links
| Type | IDs |
|---|---|
| Requirements | REQ-LP-001; REQ-LP-003; REQ-LP-014; REQ-LP-017 |
| SOTs | docs/03-architecture/overview.md; docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md; docs/03-architecture/testing-sot.md |
| Deployment | docs/03-architecture/deployment/README.md; docs/03-architecture/deployment/digitalocean-droplets-sot.md |
## Context manifest
| Kind | IDs / paths |
|---|---|
| Architecture | docs/03-architecture/service-topology-sot.md |
| Contracts | docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json; docs/03-architecture/contracts/flows/coverage.yaml |
| Goal specs | docs/03-architecture/specs/goals/G-CORE-059/ |
| Socratic evidence | docs/06_raw/telemetry-service-socratic-5why.md |
## Work steps
### Step 1 — Deliver and verify the outcome
**Allowed files:** code/services/telemetry-service/; docs/03-architecture/api/; docs/03-architecture/specs/goals/G-CORE-059/
**Actions:**
1. Implement only this goal against linked SOTs.
2. Run finite verification and record exact-head evidence.
**Verification command:** node scripts/architecture/check-sot.mjs && node scripts/api/check-api-sot-traceability.mjs
**Completion gate:** Acceptance criteria pass with reproducible evidence.
**Stop condition:** Fabricated contract, cross-service database access, secret exposure, failed test, unsafe migration, or unknown external state.
## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| Telemetry | ADD / CHANGE | Goal-scoped service artifacts and evidence |
## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| **Epic & Integration Branch** | feature/CORE → feature/G-CORE-059 |
| **System Archetype** | backend-service / event-stream |
| **Bounded Context & Domain** | Supporting Domain: live-session telemetry evidence |
| **Ports & Adapters Topology** | Inbound API/NATS; outbound PostgreSQL, Redis, NATS/DLQ, audit, health, metrics, traces |
| **State Machine & Invariants** | received → validated → deduplicated → normalized → projected → audited; immutable events and idempotent effects |
| **Zero-Mock & Conformance Gate** | Concrete implementation verified by both conformance harnesses plus service tests |
| **Socratic 5-Why Blueprint** | docs/06_raw/telemetry-service-socratic-5why.md |
## Contract impact
- Preserve versioned Telemetry schemas and register changes only in owning SOT and coverage registry.
## Spec checklist
- [x] Intent is WHAT/WHY only
- [x] How is explicit for PLAN/EXECUTE
- [x] Software & Architecture Design specified by AI Agent
- [x] Socratic 5-Why Dialectic report generated/linked
- [x] Architecture & Goal Conformance Harness passing
- [x] Worktree & Multi-Subagent Orchestration Plan declared
- [x] No [NEEDS CLARIFICATION] left in Open questions; In / Out unambiguous
- [x] Acceptance criteria testable; Touch map real repo paths; Zero Mocks/Stubs
- [x] Domain 1: Invariants & System Laws formalized
- [x] Domain 2: Formal Verification & Solvers specified
- [x] Domain 3: Harness Engineering & Modeling defined
- [x] Domain 4: Adversarial Modeling & Edge Pathologies defended
- [x] Domain 5: Concurrency, Race Conditions & Memory Models proven
- [x] Domain 6: Advanced Testing Paradigms & Tooling configured
## Acceptance criteria
- [x] Outcome is Telemetry-owned and passes linked SOT checks.
- [x] Positive, negative, duplicate/replay, timeout/unknown, authorization, and recovery cases have executable evidence.
- [x] Exact revision, commands, and failed/skipped suites are recorded.
## Test plan
- Standard commands plus service-scoped tests; include positive, negative, chaos, temporal, security, invariant, adversarial, concurrency, and mutation/failure-injection cases with skipped-suite reporting.
## Epistemic Proof & Evidence Classification
- Formal proof only for approved tools; empirical evidence is tests, health, logs, traces, and receipts; simulated behavior is not marketplace confirmation.
## Touch map
- code/services/telemetry-service/
- docs/03-architecture/api/
- docs/03-architecture/contracts/flows/coverage.yaml
- docs/03-architecture/specs/goals/G-CORE-059/
- docs/06_raw/telemetry-service-socratic-5why.md
## Notes for AI
- Read Telemetry flow, API, technical, quality, testing, and deployment SOTs before execution.
## Comprehensive Spec Design Appendix
- Hexagonal Inbound & Outbound Ports: docs/03-architecture/specs/hexagonal-ports.md
- FSM Matrix: docs/03-architecture/specs/goals/G-CORE-059/G-CORE-059-fsm-runtime-spec.md
- Mathematical & Data Invariants: docs/03-architecture/specs/goals/G-CORE-059/G-CORE-059-invariants-formal-spec.md
- Proof-and-Evidence Contract: docs/03-architecture/specs/epistemic-proof-hierarchy.md
- Mathematical Proof, Formal Methods & Program Verification: docs/03-architecture/specs/formal-verification.md
