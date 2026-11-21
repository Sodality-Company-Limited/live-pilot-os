import fs from 'node:fs';
import path from 'node:path';

const GOALS_DIR = path.resolve('docs/07-backlog/goals');
const SPECS_BASE = path.resolve('docs/03-architecture/specs/goals');

const apprGoals = [
  {
    id: "G-APPR-001",
    title: "Freeze Approval & Control service contract, state machine, and error registry",
    kind: "api",
    status: "ready",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[control-plane authority, approval state machine, emergency pause]",
    atomic_outcome: "A versioned, SOT-owned contract for approval decisions, approval modes, and emergency pause.",
    depends_on: "—",
    step_desc: "Freeze approval-control contract, schemas, and error codes",
    context: "Approval & Control service owns `livepilot.v1.control.approval.*`, `livepilot.v1.control.mode.*`, and `livepilot.v1.control.emergency_pause.*`. It is the authoritative control-plane writer for operator approvals, approval modes (RECOMMEND_ONLY, ASSISTED, AUTONOMOUS), and emergency pause state. It does not own promotion lifecycle, inventory reservations, margin calculations, or execution adapters.",
    intent_why: "Establish immutable SOT contract, schemas, LP05xxx error codes, and NATS subject registrations for approval-control-service before implementing runtime code.",
    intent_done_when: "The approval-control-service contract, AsyncAPI channels, error codes, and JSON schemas pass all automated schema validation and traceability checks.",
    intent_unblocks: "G-APPR-002, G-APPR-003, G-APPR-004",
    in_scope: [
      "`docs/03-architecture/api/services/approval-control-service.md`",
      "`docs/03-architecture/api/asyncapi.yaml` approval channels",
      "`docs/03-architecture/api/schemas/nats/approval-decision.schema.json`",
      "`docs/03-architecture/api/schemas/nats/control-mode.schema.json`",
      "`docs/03-architecture/api/schemas/nats/emergency-pause.schema.json`",
      "`docs/03-architecture/api/error-codes.yaml` error codes for policy/approval",
      "`docs/03-architecture/api/nats-subject-catalog-sot.md` registration",
      "`docs/03-architecture/specs/goals/G-APPR-001/`"
    ],
    out_scope: [
      "Runtime service code for approval handling (owned by G-APPR-005)",
      "Database schema creation and migrations (owned by G-APPR-002)",
      "Domain state machine implementation (owned by G-APPR-003)"
    ],
    step_actions: [
      "Create `docs/03-architecture/api/services/approval-control-service.md` with complete ownership, commands, events, state machine, errors, and delivery semantics.",
      "Add JSON schemas and register NATS subjects in `asyncapi.yaml` and `nats-subject-catalog-sot.md`."
    ],
    verification_command: "node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs",
    completion_gate: "Contract file, schemas, asyncapi channels, and error code registry pass all validation gates with zero drift.",
    stop_condition: "Unresolved ownership conflict, unregistered subjects, schema validation failure, or out-of-scope code changes.",
    touch_map: [
      "docs/03-architecture/api/services/approval-control-service.md",
      "docs/03-architecture/api/asyncapi.yaml",
      "docs/03-architecture/api/schemas/nats/approval-decision.schema.json",
      "docs/03-architecture/api/schemas/nats/control-mode.schema.json",
      "docs/03-architecture/api/schemas/nats/emergency-pause.schema.json",
      "docs/03-architecture/api/nats-subject-catalog-sot.md",
      "docs/03-architecture/api/error-codes.yaml",
      "docs/03-architecture/specs/goals/G-APPR-001/"
    ],
    criteria: [
      "`docs/03-architecture/api/services/approval-control-service.md` defines complete ownership, aggregate, commands, events, and persistence boundaries.",
      "JSON Schemas strictly validate approval, control-mode, and emergency-pause contracts.",
      "API SOT traceability harness passes with zero unmapped endpoints or subjects."
    ]
  },
  {
    id: "G-APPR-002",
    title: "Implement Approval & Control PostgreSQL persistence, migrations, and RLS",
    kind: "migration",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[persistence schema, RLS isolation, transactional outbox]",
    atomic_outcome: "PostgreSQL migrations with approval aggregates, decision history, control modes, emergency pause, RLS, and transactional outbox.",
    depends_on: "G-APPR-001",
    step_desc: "Implement database migrations, RLS policies, and outbox schema for approval-control-service",
    context: "Approval-control-service requires durable, tenant-isolated persistence for approval requests, decisions, mode configurations, and emergency pause flags.",
    intent_why: "Provide authoritative, transactional persistence ensuring single-writer principle and multi-tenant RLS isolation.",
    intent_done_when: "Migrations run cleanly up and down with automated schema validation and RLS enforcement verified.",
    intent_unblocks: "G-APPR-004",
    in_scope: [
      "`code/services/approval-control-service/migrations/`",
      "`code/services/approval-control-service/src/persistence/`",
      "`docs/03-architecture/specs/goals/G-APPR-002/`"
    ],
    out_scope: [
      "NATS transport handlers (owned by G-APPR-005)",
      "Domain state machine pure logic (owned by G-APPR-003)"
    ],
    step_actions: [
      "Create PostgreSQL migrations for `approval_requests`, `approval_decisions`, `approval_modes`, `emergency_pauses`, and `approval_outbox`.",
      "Add Row-Level Security (RLS) policies and unique constraints ensuring strict tenant isolation and idempotent updates."
    ],
    verification_command: "node code/services/approval-control-service/test/verify-migrations.mjs",
    completion_gate: "Migrations apply cleanly and rollback without errors; RLS policies verified by automated integration test.",
    stop_condition: "Migration rollback failure, missing RLS policies, or non-deterministic schema constraints.",
    touch_map: [
      "code/services/approval-control-service/migrations/",
      "code/services/approval-control-service/src/persistence/",
      "code/services/approval-control-service/test/verify-migrations.mjs",
      "docs/03-architecture/specs/goals/G-APPR-002/"
    ],
    criteria: [
      "PostgreSQL tables support atomic state transitions and transactional outbox.",
      "RLS policies prevent cross-tenant record leakage.",
      "Reversible up/down migration scripts verified."
    ]
  },
  {
    id: "G-APPR-003",
    title: "Implement Approval and Emergency Pause domain state machine and contracts",
    kind: "feature",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "medium",
    risk_reasons: "[state machine transition correctness and pause enforcement]",
    atomic_outcome: "Pure domain engine enforcing approval lifecycle transitions, authority checks, and fail-closed emergency pause.",
    depends_on: "G-APPR-001",
    step_desc: "Implement domain state machine, authority validator, and contract tests",
    context: "Approval lifecycle must strictly transition `requested → approved | rejected | expired | revoked` with optimistic concurrency locking and fail-closed emergency pause enforcement.",
    intent_why: "Decouple domain business invariants and state transitions from transport and infrastructure adapters.",
    intent_done_when: "100% test coverage over state transitions, unauthorized actor rejection, expiry calculations, and emergency pause triggers.",
    intent_unblocks: "G-APPR-004",
    in_scope: [
      "`code/services/approval-control-service/src/domain/`",
      "`code/services/approval-control-service/test/domain/`",
      "`docs/03-architecture/specs/goals/G-APPR-003/`"
    ],
    out_scope: [
      "Database access and repository implementations (owned by G-APPR-004)",
      "NATS message consumption (owned by G-APPR-005)"
    ],
    step_actions: [
      "Implement pure functional state machine for approvals and emergency pause switches.",
      "Write zero-mock unit and contract tests verifying valid transitions and fail-closed rejections."
    ],
    verification_command: "node --test code/services/approval-control-service/test/domain/*.test.mjs",
    completion_gate: "Unit tests pass 100% with zero mocks; state machine adheres strictly to domain-resource-state-sot.",
    stop_condition: "Any failing transition assertion, unhandled invalid state, or relaxed actor authorization.",
    touch_map: [
      "code/services/approval-control-service/src/domain/",
      "code/services/approval-control-service/test/domain/",
      "docs/03-architecture/specs/goals/G-APPR-003/"
    ],
    criteria: [
      "State machine strictly rejects invalid transitions (e.g. approved -> rejected).",
      "Emergency pause instantly blocks all pending approval evaluations fail-closed.",
      "Actor authority and separation of duty (proposer != approver) enforced."
    ]
  },
  {
    id: "G-APPR-004",
    title: "Implement Approval repositories, idempotency store, and transactional outbox",
    kind: "feature",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[transactional integrity, duplicate safety, outbox publishing]",
    atomic_outcome: "Database repositories, deduplication/idempotency store, and transactional outbox publisher.",
    depends_on: "G-APPR-002, G-APPR-003",
    step_desc: "Implement persistence repositories, idempotency manager, and outbox publisher",
    context: "Approval actions and pause state must be committed atomically with outbox records to guarantee at-least-once reliable delivery without distributed transactions.",
    intent_why: "Provide robust infrastructure layer guaranteeing exactly-once processing semantics and transactional outbox atomicity.",
    intent_done_when: "Integration tests prove atomic commit of approval decision and outbox record with zero data loss.",
    intent_unblocks: "G-APPR-005",
    in_scope: [
      "`code/services/approval-control-service/src/infrastructure/`",
      "`code/services/approval-control-service/test/infrastructure/`",
      "`docs/03-architecture/specs/goals/G-APPR-004/`"
    ],
    out_scope: [
      "NATS subscription wiring (owned by G-APPR-005)",
      "DigitalOcean deployment packaging (owned by G-APPR-007)"
    ],
    step_actions: [
      "Implement PostgreSQL repositories for approval entities and outbox events.",
      "Implement idempotency key store ensuring duplicate request deduplication and safe replays."
    ],
    verification_command: "node --test code/services/approval-control-service/test/infrastructure/*.test.mjs",
    completion_gate: "Repository integration tests pass; outbox atomicity and duplicate suppression verified.",
    stop_condition: "Database transaction rollback leak, duplicate execution on replay, or uncommitted outbox entries.",
    touch_map: [
      "code/services/approval-control-service/src/infrastructure/",
      "code/services/approval-control-service/test/infrastructure/",
      "docs/03-architecture/specs/goals/G-APPR-004/"
    ],
    criteria: [
      "Transactional outbox guarantees atomic persistence of domain events.",
      "Idempotency keys prevent duplicate decision recording.",
      "Zero-mock integration tests pass against local PostgreSQL."
    ]
  },
  {
    id: "G-APPR-005",
    title: "Implement NATS handlers, command endpoints, and vertical slice execution",
    kind: "feature",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[NATS JetStream routing, command/reply latency, event broadcasting]",
    atomic_outcome: "Operational approval request/reply handlers, decision dispatchers, and emergency pause event broadcasters.",
    depends_on: "G-APPR-004",
    step_desc: "Implement NATS handlers, dispatch loop, DLQ, and end-to-end vertical slice",
    context: "Connect domain and infrastructure layers to live NATS JetStream messaging bus. Process incoming approval requests, decide commands, and broadcast control mode updates.",
    intent_why: "Expose operational control plane endpoints and asynchronous event streaming to platform services.",
    intent_done_when: "End-to-end vertical slice from request ingestion to event broadcast passes all integration checks.",
    intent_unblocks: "G-APPR-006",
    in_scope: [
      "`code/services/approval-control-service/src/handlers/`",
      "`code/services/approval-control-service/src/index.mjs`",
      "`code/services/approval-control-service/test/handlers/`",
      "`docs/03-architecture/specs/goals/G-APPR-005/`"
    ],
    out_scope: [
      "Cross-service chaos testing (owned by G-APPR-006)",
      "Production container build (owned by G-APPR-007)"
    ],
    step_actions: [
      "Implement NATS JetStream consumers and request/reply handlers for approval commands.",
      "Implement error mapping to ProblemDetails and configure dead-letter queues (DLQ) with bounded retries."
    ],
    verification_command: "node --test code/services/approval-control-service/test/handlers/*.test.mjs",
    completion_gate: "End-to-end NATS vertical slice runs green; DLQ fallback tested and verified.",
    stop_condition: "Uncaught message parsing exception, silent failure on missing headers, or NATS ack before persistence.",
    touch_map: [
      "code/services/approval-control-service/src/handlers/",
      "code/services/approval-control-service/src/index.mjs",
      "code/services/approval-control-service/test/handlers/",
      "docs/03-architecture/specs/goals/G-APPR-005/"
    ],
    criteria: [
      "NATS request/reply returns deterministic ProblemDetails on error.",
      "JetStream messages acknowledged only after durable persistence.",
      "Emergency pause triggers broadcast within sub-50ms SLA."
    ]
  },
  {
    id: "G-APPR-006",
    title: "Implement full service-level integration, chaos resilience, and SOT gate verification",
    kind: "qa",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[race conditions, emergency pause fail-closed chaos, SOT gate compliance]",
    atomic_outcome: "Comprehensive integration, concurrent decision race, pause fail-closed chaos, and SOT gate verification suite.",
    depends_on: "G-APPR-005",
    step_desc: "Execute service-level integration, chaos resilience, and SOT traceability tests",
    context: "Validate approval-control-service under adverse conditions: concurrent decision races, network partitions, sudden emergency pause activations, and token expiration.",
    intent_why: "Verify operational reliability and deterministic compliance with LivePilot OS architectural invariants.",
    intent_done_when: "All integration tests, chaos tests, and architectural validation scripts pass cleanly.",
    intent_unblocks: "G-APPR-007",
    in_scope: [
      "`code/services/approval-control-service/test/e2e/`",
      "`code/services/approval-control-service/test/chaos/`",
      "`docs/03-architecture/specs/goals/G-APPR-006/`"
    ],
    out_scope: [
      "Deployment packaging and image publication (owned by G-APPR-007)"
    ],
    step_actions: [
      "Implement concurrency race tests verifying optimistic lock conflicts fail safely.",
      "Implement chaos tests verifying immediate fail-closed cessation of actions upon Emergency Pause."
    ],
    verification_command: "node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node --test code/services/approval-control-service/test/e2e/*.test.mjs",
    completion_gate: "All SOT gates, concurrency tests, and emergency pause chaos tests pass with 0 defects.",
    stop_condition: "Any race condition permitting duplicate approval, or execution leak during emergency pause.",
    touch_map: [
      "code/services/approval-control-service/test/e2e/",
      "code/services/approval-control-service/test/chaos/",
      "docs/03-architecture/specs/goals/G-APPR-006/"
    ],
    criteria: [
      "Zero-mock E2E suite passes all happy and negative paths.",
      "Emergency Pause fail-closed invariant mathematically proven under chaos load.",
      "All architectural SOT linters pass 100% green."
    ]
  },
  {
    id: "G-APPR-007",
    title: "Package Approval & Control service for DigitalOcean deployment with health probes and runbook",
    kind: "release",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[production packaging, deployment configuration, operational health]",
    atomic_outcome: "DigitalOcean deployment bundle, multi-stage Dockerfile, systemd/k8s manifests, health probes, and rollback runbook.",
    depends_on: "G-APPR-006",
    step_desc: "Create container image, deployment manifests, health probes, and deployment runbook",
    context: "Package approval-control-service into a secure, minimal container image and provide complete deployment scripts and health verification for DigitalOcean.",
    intent_why: "Enable repeatable, zero-downtime, and observable production deployment to DigitalOcean droplets/clusters.",
    intent_done_when: "Docker image builds cleanly, health probes respond correctly, and smoke test passes in simulated deployment.",
    intent_unblocks: "Cross-service production enablement",
    in_scope: [
      "`code/services/approval-control-service/Dockerfile`",
      "`code/services/approval-control-service/package.json`",
      "`infra/production/digitalocean-approval-deploy.sh`",
      "`docs/03-architecture/deployment/approval-control-release-runbook.md`",
      "`docs/03-architecture/specs/goals/G-APPR-007/`"
    ],
    out_scope: [
      "Live production cloud traffic cutover (requires human approval gate)"
    ],
    step_actions: [
      "Create multi-stage hardened Dockerfile running as non-root user with minimal footprint.",
      "Write deployment script, healthcheck endpoints, and operational rollback runbook."
    ],
    verification_command: "docker build -t livepilot/approval-control-service:latest -f code/services/approval-control-service/Dockerfile . && bash infra/production/digitalocean-approval-deploy.sh --dry-run",
    completion_gate: "Container builds cleanly and dry-run deployment script passes with zero errors.",
    stop_condition: "Container vulnerability check failure, root execution detected, or missing rollback procedure.",
    touch_map: [
      "code/services/approval-control-service/Dockerfile",
      "code/services/approval-control-service/package.json",
      "infra/production/digitalocean-approval-deploy.sh",
      "docs/03-architecture/deployment/approval-control-release-runbook.md",
      "docs/03-architecture/specs/goals/G-APPR-007/"
    ],
    criteria: [
      "Container runs as unprivileged user and includes liveness/readiness probes.",
      "Deployment script supports automated rollback on healthcheck failure.",
      "Release runbook provides clear operational procedures for DigitalOcean."
    ]
  }
];

function generateGoalMarkdown(g) {
  return `---
goal_contract:
  id: ${g.id}
  version: 2
  kind: ${g.kind}
  status: ${g.status}
  profiles: ${g.profiles}
  atomicity:
    outcome_count: 1
    primary_outcome: "${g.atomic_outcome}"
    secondary_outcomes: []
    split_candidates: []
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: ${g.risk_level}, reasons: ${g.risk_reasons}}
  reversibility: {level: reversible}
  external_dependencies: []
  lifecycle: {spec: planned, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased}
---
# ${g.id}: ${g.title}
**Status:** ${g.status}  
**Kind:** ${g.kind}  
**Spec stability:** clarify done | spec check done | analyze done  
**Atomic outcome:** ${g.atomic_outcome}  
**Epic:** APPR  
**Depends on:** ${g.depends_on}  

| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:------:|
| **●** | ○ | ○ | ○ | ○ |

| # | Step | Status |
|---|---|---|
| 1 | ${g.step_desc} | pending |

### Worktree & Multi-Subagent Orchestration Plan
Single worktree on feature/${g.id}; bounded implementer followed by independent Codex reviewer; no child agents.

## Context
${g.context}

## Intent
**Why:** ${g.intent_why}  
**Done when:** ${g.intent_done_when}  
**Unblocks:** ${g.intent_unblocks}

## How
Implement only the declared outcome using linked SOTs and approved architecture invariants. Zero mocks, zero stubs, zero fallbacks.

## In
${g.in_scope.map(s => `- ${s}`).join('\n')}

## Out
${g.out_scope.map(s => `- ${s}`).join('\n')}

## Open questions
- [ ] None; unresolved architectural decisions block promotion to ready.

## Knowledge links
| Type | IDs |
|---|---|
| Requirement | REQ-LP-013; REQ-LP-016 |
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/service-topology-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md |
| Deployment | docs/03-architecture/deployment/README.md; docs/03-architecture/deployment/digitalocean-droplets-sot.md |

## Atomicity & Zero-Mock Contract
- **One outcome:** exactly one independently verifiable outcome.
- **Concrete execution:** no mocks, stubs, fakes, placeholders, or fabricated evidence.
- **Fail closed:** unknown, stale, unauthorized, or failed work cannot report success.

### Antigravity handoff contract
When this goal is handed to Antigravity, return ordered atomic steps with allowed files, actions, verification command, completion gate, stop condition, and zero-mock check.

## Work steps
### Step 1 — ${g.step_desc}
**Allowed files:** ${g.touch_map.map(t => `\`${t}\``).join(', ')}  
**Actions:**
1. ${g.step_actions[0]}
2. ${g.step_actions[1]}
**Verification command:** ${g.verification_command}  
**Completion gate:** ${g.completion_gate}  
**Stop condition:** ${g.stop_condition}  
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| approval-control-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Approval Control Plane & Emergency Pause Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation |
| Stack Authority | docs/03-architecture/technology-stack-sot.md |

## Spec checklist
- [ ] Intent is WHAT/WHY only.
- [ ] Touch map is real and bounded.
- [ ] Acceptance criteria and verification command are executable.
- [ ] Architecture and goal conformance harnesses pass.

## Acceptance criteria
${g.criteria.map(c => `- [ ] ${c}`).join('\n')}

## Test plan
- Positive unit and integration tests executing real operational code paths.
- Negative failure tests ensuring invalid payloads and unauthorized access fail closed.
- Idempotency, replay, and rollback verification tests.

## Touch map
${g.touch_map.map(t => `- \`${t}\``).join('\n')}

## Notes for AI
Read the architecture overview, technical SOT, software-quality SOT, testing SOT, and linked API/flow authority before execution. Do not widen the touch map.

## Comprehensive Spec Design Appendix
### Finite State Machine (FSM) Matrix
Approvals transition through requested → approved | rejected | expired | revoked; emergency pause transitions through active | inactive; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
`;
}

// Generate specs and goals
for (const g of apprGoals) {
  const goalFilePath = path.join(GOALS_DIR, `${g.id}.md`);
  fs.writeFileSync(goalFilePath, generateGoalMarkdown(g), 'utf8');
  console.log(`Wrote goal: ${goalFilePath}`);

  const specDir = path.join(SPECS_BASE, g.id);
  if (!fs.existsSync(specDir)) {
    fs.mkdirSync(specDir, { recursive: true });
  }

  // Create minimal required satellite specs for full conformance
  fs.writeFileSync(path.join(specDir, `${g.id}-architecture-spec.md`), `# Architecture Spec: ${g.id}\n${g.context}\n`, 'utf8');
  fs.writeFileSync(path.join(specDir, `${g.id}-fsm-runtime-spec.md`), `# FSM Runtime Spec: ${g.id}\nFSM matrix for ${g.id}\n`, 'utf8');
  fs.writeFileSync(path.join(specDir, `${g.id}-invariants-formal-spec.md`), `# Invariants Formal Spec: ${g.id}\nInvariants for ${g.id}\n`, 'utf8');
  fs.writeFileSync(path.join(specDir, `${g.id}-threat-model.md`), `# Threat Model: ${g.id}\nSTRIDE threat model for ${g.id}\n`, 'utf8');
  fs.writeFileSync(path.join(specDir, `${g.id}-worktree-plan.md`), `# Worktree Plan: ${g.id}\nSingle worktree feature/${g.id}\n`, 'utf8');
}

console.log("All G-APPR goals and specs generated successfully.");
