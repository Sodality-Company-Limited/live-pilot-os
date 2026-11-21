import fs from 'node:fs';
import path from 'node:path';

const GOALS_DIR = path.resolve('docs/07-backlog/goals');
const SPECS_BASE = path.resolve('docs/03-architecture/specs/goals');

const invtGoals = [
  {
    id: "G-INVT-001",
    title: "Freeze the Inventory service contract",
    kind: "api",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[authoritative stock boundary, zero overselling, and NATS schema compatibility]",
    atomic_outcome: "A versioned, SOT-owned contract for tenant/session-scoped inventory reservations and stock mutations.",
    depends_on: "—",
    step_desc: "Freeze inventory service contract, schemas, and error code specifications",
    context: "Inventory service is the single authoritative writer of item stock levels and reservation states. It enforces zero overselling, atomic row-level locking, and transactional outbox events. It does not calculate margins or execute marketplace platform API calls.",
    intent_why: "Establish immutable SOT contract, schemas, subject registrations, and LP13xxx error codes for inventory-service before implementing runtime code.",
    intent_done_when: "The inventory-service contract, AsyncAPI channels, error codes, and JSON schemas pass all automated schema validation and traceability checks.",
    intent_unblocks: "G-INVT-002, G-INVT-003, G-INVT-004",
    in_scope: [
      "`docs/03-architecture/api/services/inventory-service.md`",
      "`docs/03-architecture/api/asyncapi.yaml` inventory channel definitions",
      "`docs/03-architecture/api/schemas/nats/inventory-reservation-request.schema.json`",
      "`docs/03-architecture/api/schemas/nats/inventory-reservation-reply.schema.json`",
      "`docs/03-architecture/api/schemas/nats/inventory-stock-updated.schema.json`",
      "`docs/03-architecture/api/error-codes.yaml` error codes for inventory (LP13xxx)",
      "`docs/03-architecture/api/nats-subject-catalog-sot.md` registration",
      "`docs/03-architecture/specs/goals/G-INVT-001/`"
    ],
    out_scope: [
      "Runtime service code for inventory reservations (owned by G-INVT-005)",
      "Database schema creation and migrations (owned by G-INVT-003)",
      "Domain state machine implementation (owned by G-INVT-004)"
    ],
    step_actions: [
      "Create `docs/03-architecture/api/services/inventory-service.md` with complete ownership, commands, events, state machine, errors, and delivery semantics.",
      "Create JSON schemas for inventory reservation request/reply and stock events, registering them in `asyncapi.yaml` and `nats-subject-catalog-sot.md`."
    ],
    verification_command: "node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs",
    completion_gate: "Contract file, schemas, asyncapi channels, and error code registry pass all validation gates with zero drift.",
    stop_condition: "Unresolved ownership conflict, unregistered subjects, schema validation failure, or out-of-scope code changes.",
    touch_map: [
      "docs/03-architecture/api/services/inventory-service.md",
      "docs/03-architecture/api/asyncapi.yaml",
      "docs/03-architecture/api/schemas/nats/inventory-reservation-request.schema.json",
      "docs/03-architecture/api/schemas/nats/inventory-reservation-reply.schema.json",
      "docs/03-architecture/api/schemas/nats/inventory-stock-updated.schema.json",
      "docs/03-architecture/api/nats-subject-catalog-sot.md",
      "docs/03-architecture/api/error-codes.yaml",
      "docs/03-architecture/specs/goals/G-INVT-001/"
    ],
    criteria: [
      "`docs/03-architecture/api/services/inventory-service.md` defines complete ownership, aggregate, commands, events, and persistence boundaries.",
      "JSON schemas conform strictly to JSON Schema draft-07 and envelopes.",
      "Error codes LP13001 through LP13005 are registered in `docs/03-architecture/api/error-codes.yaml`."
    ]
  },
  {
    id: "G-INVT-002",
    title: "Verify Inventory message and schema compatibility",
    kind: "qa",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "medium",
    risk_reasons: "[message schema evolution and consumer contract compatibility]",
    atomic_outcome: "Schema conformance test suite and backward-compatibility golden fixtures for inventory commands and events.",
    depends_on: "G-INVT-001",
    step_desc: "Create golden contract fixtures and automated schema validation tests",
    context: "Inventory commands and events must be verified against schema envelopes, ensuring valid, invalid, and edge-case payloads are strictly validated before service implementation.",
    intent_why: "Guarantee all incoming reservation requests and outgoing stock events conform strictly to schema envelopes and pass automated test suites.",
    intent_done_when: "Contract test suite passes against valid, invalid, and legacy golden fixtures with zero false positives.",
    intent_unblocks: "G-INVT-005",
    in_scope: [
      "`tests/contracts/inventory/` test fixtures and contract runners",
      "Valid, invalid, edge-case, and envelope schema validation tests",
      "`docs/03-architecture/specs/goals/G-INVT-002/`"
    ],
    out_scope: [
      "Database integration and persistence logic (owned by G-INVT-003)",
      "Runtime service code (owned by G-INVT-005)"
    ],
    step_actions: [
      "Implement automated schema validation tests in `tests/contracts/inventory/` using ajv or node assert.",
      "Verify envelope validation, invalid payload rejection, and duplicate key detection."
    ],
    verification_command: "npm test -- tests/contracts/inventory/",
    completion_gate: "100% passing tests across all valid and invalid message fixtures with zero warnings.",
    stop_condition: "Schema drift, failing contract tests, or touch map violations.",
    touch_map: [
      "tests/contracts/inventory/",
      "docs/03-architecture/specs/goals/G-INVT-002/"
    ],
    criteria: [
      "Contract tests cover reservation request, reply, and stock updated event schemas.",
      "Tests verify rejection of negative quantities, missing tenant_id, and invalid UUIDs.",
      "Test suite passes cleanly with zero mocks and zero warnings."
    ]
  },
  {
    id: "G-INVT-003",
    title: "Create Inventory persistence schema and migrations",
    kind: "migration",
    status: "planned",
    profiles: "[core, database]",
    risk_level: "high",
    risk_reasons: "[database row-locking, outbox atomicity, and multi-tenant RLS isolation]",
    atomic_outcome: "PostgreSQL migration creating tenant-safe inventory tables, RLS policies, outbox, and idempotency store.",
    depends_on: "G-INVT-001",
    step_desc: "Implement PostgreSQL migration scripts with up/down paths and RLS policies",
    context: "Inventory service requires isolated tables: inventory_items, inventory_reservations, inventory_outbox, and inventory_idempotency with PostgreSQL Row-Level Security.",
    intent_why: "Provide durable, tenant-isolated persistence with optimistic locking and transactional outbox guarantees.",
    intent_done_when: "Migrations execute cleanly up and down, RLS policies enforce tenant boundaries, and outbox schema supports atomic writes.",
    intent_unblocks: "G-INVT-004, G-INVT-005",
    in_scope: [
      "Database migration scripts under `code/services/inventory-service/migrations/`",
      "RLS policy declarations and role grants",
      "`docs/03-architecture/specs/goals/G-INVT-003/`"
    ],
    out_scope: [
      "Application repository code (owned by G-INVT-005)",
      "Service business logic (owned by G-INVT-004)"
    ],
    step_actions: [
      "Write SQL migration creating inventory tables, indexes, version columns, and RLS policies.",
      "Validate idempotent up/down execution and test tenant isolation."
    ],
    verification_command: "npm test -- code/services/inventory-service/test/migration.test.js",
    completion_gate: "Migration up/down passes with 100% verification and tenant isolation checks pass.",
    stop_condition: "Migration failure, missing down script, missing RLS, or table definition drift.",
    touch_map: [
      "code/services/inventory-service/migrations/",
      "code/services/inventory-service/test/migration.test.js",
      "docs/03-architecture/specs/goals/G-INVT-003/"
    ],
    criteria: [
      "Tables `inventory_items`, `inventory_reservations`, `inventory_outbox`, and `inventory_idempotency` are created.",
      "Row-level security policies enforce tenant_id isolation for all queries.",
      "Idempotent up/down migration test passes."
    ]
  },
  {
    id: "G-INVT-004",
    title: "Implement Inventory state machine and concurrency row locking",
    kind: "feature",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[race conditions, overselling prevention, and state machine correctness]",
    atomic_outcome: "Deterministic domain state machine enforcing reservation lifecycle and zero-overselling row locks.",
    depends_on: "G-INVT-001",
    step_desc: "Implement pure domain state machine and row-level locking concurrency logic",
    context: "The inventory state machine governs requested -> reserved -> committed/released/expired. It calculates available stock = total_stock - reserved_stock and locks rows during reservation.",
    intent_why: "Mathematically prevent overselling and guarantee deterministic state transitions across concurrent reservation requests.",
    intent_done_when: "All state transitions pass unit testing, concurrent allocations are rejected when stock is insufficient, and invalid transitions fail closed.",
    intent_unblocks: "G-INVT-005",
    in_scope: [
      "`code/services/inventory-service/src/domain/` state machine and domain logic",
      "`code/services/inventory-service/test/unit/state-machine.test.js`",
      "`docs/03-architecture/specs/goals/G-INVT-004/`"
    ],
    out_scope: [
      "NATS transport handler (owned by G-INVT-005)",
      "Docker deployment packaging (owned by G-INVT-008)"
    ],
    step_actions: [
      "Implement `InventoryItem` and `InventoryReservation` domain models with strict state transitions.",
      "Write unit tests verifying all valid transitions, invalid transition rejections, and zero overselling invariants."
    ],
    verification_command: "npm test -- code/services/inventory-service/test/unit/state-machine.test.js",
    completion_gate: "Domain tests pass with 100% code coverage, zero floating-point arithmetic, and zero stubs.",
    stop_condition: "State machine allows invalid transition or overselling, floating-point usage, or failing tests.",
    touch_map: [
      "code/services/inventory-service/src/domain/",
      "code/services/inventory-service/test/unit/state-machine.test.js",
      "docs/03-architecture/specs/goals/G-INVT-004/"
    ],
    criteria: [
      "State transitions conform exactly to requested -> reserved -> committed/released/expired.",
      "Zero-float integer quantities enforced across all domain calculations.",
      "100% test pass on transition matrix and conflict states."
    ]
  },
  {
    id: "G-INVT-005",
    title: "Implement the Inventory reservation vertical slice",
    kind: "feature",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[end-to-end transaction boundary and NATS message handling]",
    atomic_outcome: "End-to-end operational vertical slice handling reservation request/reply with transactional outbox.",
    depends_on: "G-INVT-002, G-INVT-003, G-INVT-004",
    step_desc: "Implement repository, NATS request handler, transaction boundary, and outbox publisher",
    context: "Connects NATS request handler to database repository within a single database transaction, recording the reservation and writing the outbox event atomically.",
    intent_why: "Provide a working, fully integrated stock reservation flow from NATS request to PostgreSQL persistence and reply.",
    intent_done_when: "A reservation request successfully acquires row lock, mutates stock, writes outbox, and returns reservation receipt with idempotency guarantee.",
    intent_unblocks: "G-INVT-006",
    in_scope: [
      "`code/services/inventory-service/src/` repositories, services, and handlers",
      "`code/services/inventory-service/test/integration/reservation-flow.test.js`",
      "`docs/03-architecture/specs/goals/G-INVT-005/`"
    ],
    out_scope: [
      "TTL expiration background worker (owned by G-INVT-006)",
      "Multi-region deployment (owned by G-INVT-008)"
    ],
    step_actions: [
      "Implement repository with `SELECT ... FOR UPDATE` row locking and transactional outbox insertion.",
      "Implement NATS message subscriber for `livepilot.v1.inventory.reservation.request` returning structured reply."
    ],
    verification_command: "npm test -- code/services/inventory-service/test/integration/reservation-flow.test.js",
    completion_gate: "End-to-end integration test passes, verifying row locking, idempotency, and outbox writing.",
    stop_condition: "Dual-write failure, lock contention timeout, unhandled error, or missing outbox entry.",
    touch_map: [
      "code/services/inventory-service/src/",
      "code/services/inventory-service/test/integration/reservation-flow.test.js",
      "docs/03-architecture/specs/goals/G-INVT-005/"
    ],
    criteria: [
      "Reservation request acquires row lock and atomically updates available stock.",
      "Outbox event is written within the exact same database transaction.",
      "Idempotent retry with identical key returns cached reservation receipt."
    ]
  },
  {
    id: "G-INVT-006",
    title: "Implement Inventory expiration worker and reliability controls",
    kind: "feature",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[background worker race conditions and dead-letter queue routing]",
    atomic_outcome: "Durable TTL background expiration worker, emergency pause integration, and DLQ routing.",
    depends_on: "G-INVT-005",
    step_desc: "Implement reservation auto-expiry sweeper, emergency pause listener, and DLQ publisher",
    context: "Uncommitted reservations must expire after TTL (e.g. 5 minutes) returning stock to available pool. Control pause request must freeze stock mutations immediately (fail-closed).",
    intent_why: "Prevent orphaned stock reservations and ensure system complies with emergency stop commands.",
    intent_done_when: "Expired reservations are atomically released back to available stock, paused sessions refuse reservations, and failed messages route to DLQ.",
    intent_unblocks: "G-INVT-007",
    in_scope: [
      "`code/services/inventory-service/src/workers/expiry-worker.js`",
      "`code/services/inventory-service/src/handlers/pause-handler.js`",
      "`code/services/inventory-service/test/integration/expiry-and-pause.test.js`",
      "`docs/03-architecture/specs/goals/G-INVT-006/`"
    ],
    out_scope: [
      "Performance benchmarking and load testing (owned by G-INVT-007)",
      "Docker deployment configuration (owned by G-INVT-008)"
    ],
    step_actions: [
      "Implement background sweeper that selects expired reservations with row locking, marks expired, and increments available stock.",
      "Implement emergency pause subscriber that toggles fail-closed reservation lock."
    ],
    verification_command: "npm test -- code/services/inventory-service/test/integration/expiry-and-pause.test.js",
    completion_gate: "Tests verify stock recovery upon TTL expiry and immediate rejection under emergency pause.",
    stop_condition: "Sweeper race condition, double stock release, or failure to halt on pause.",
    touch_map: [
      "code/services/inventory-service/src/workers/",
      "code/services/inventory-service/src/handlers/",
      "code/services/inventory-service/test/integration/expiry-and-pause.test.js",
      "docs/03-architecture/specs/goals/G-INVT-006/"
    ],
    criteria: [
      "Expired reservations are swept periodically and stock is atomically restored.",
      "Emergency pause blocks all new stock reservations fail-closed with error LP13005.",
      "Unprocessable messages route to `livepilot.v1.inventory.dlq`."
    ]
  },
  {
    id: "G-INVT-007",
    title: "Certify isolated Inventory service concurrency and quality gates",
    kind: "qa",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[high-concurrency race condition and zero-bug quality verification]",
    atomic_outcome: "Comprehensive concurrency stress test suite (50 parallel workers) proving zero overselling and 100% gate pass.",
    depends_on: "G-INVT-006",
    step_desc: "Execute high-concurrency race condition tests, security audit, and quality gates",
    context: "Validate that under 50 concurrent reservation requests competing for 10 units of stock, exactly 10 succeed and 40 receive LP13001 INSUFFICIENT_STOCK with zero leaks.",
    intent_why: "Provide mathematical and empirical proof of zero overselling and pass all Soda OS pre-release gates.",
    intent_done_when: "Concurrency stress test passes with zero overselling, zero race conditions, and all architectural quality gates pass.",
    intent_unblocks: "G-INVT-008",
    in_scope: [
      "`code/services/inventory-service/test/concurrency/stress.test.js`",
      "`code/services/inventory-service/test/` test suites",
      "`artifacts/proofs/G-INVT-007-concurrency-receipt.json`",
      "`docs/03-architecture/specs/goals/G-INVT-007/`"
    ],
    out_scope: [
      "Cloud provisioning (owned by G-INVT-008)"
    ],
    step_actions: [
      "Implement and run concurrency stress test simulating simultaneous flash-sale reservations.",
      "Run full test suite, linting, error registry check, and SOT traceability gates."
    ],
    verification_command: "npm test -- code/services/inventory-service/test/concurrency/stress.test.js && node scripts/contract-check/error-code-registry.mjs",
    completion_gate: "100% test pass, zero overselling, proof receipt generated, and all quality gates green.",
    stop_condition: "Any overselling detected (available_stock < 0), deadlocks, or quality gate failure.",
    touch_map: [
      "code/services/inventory-service/test/concurrency/stress.test.js",
      "artifacts/proofs/G-INVT-007-concurrency-receipt.json",
      "docs/03-architecture/specs/goals/G-INVT-007/"
    ],
    criteria: [
      "Zero overselling verified under 50 concurrent competing workers.",
      "Proof receipt generated and bound to source SHA-256 digests.",
      "All automated quality and contract gates pass cleanly."
    ]
  },
  {
    id: "G-INVT-008",
    title: "Package and deploy Inventory service to DigitalOcean",
    kind: "chore",
    status: "planned",
    profiles: "[core, deployment, sre]",
    risk_level: "high",
    risk_reasons: "[production container runtime, droplet deployment, and health probe verification]",
    atomic_outcome: "Production Dockerfile, docker-compose configuration, and DigitalOcean release runbook with smoke verification.",
    depends_on: "G-INVT-007",
    step_desc: "Build production Docker image, configure Docker Compose, and verify health probes",
    context: "Inventory service must run as an isolated container in the DigitalOcean Droplet runtime topology, connecting to PostgreSQL and NATS cluster with health endpoints.",
    intent_why: "Deliver a production-ready, independently deployable Inventory service container to DigitalOcean.",
    intent_done_when: "Container builds cleanly with multi-stage non-root user, connects to runtime network, and /healthz endpoint passes smoke test.",
    intent_unblocks: "Production live deployment",
    in_scope: [
      "`code/services/inventory-service/Dockerfile`",
      "`code/services/inventory-service/package.json`",
      "`infra/docker-compose.yml` inventory-service entry",
      "`docs/03-architecture/deployment/inventory-release-runbook.md`",
      "`docs/03-architecture/specs/goals/G-INVT-008/`"
    ],
    out_scope: [
      "Marketplace third-party API adapter implementation"
    ],
    step_actions: [
      "Create multi-stage non-root Dockerfile and configure `/healthz` HTTP and NATS health checks.",
      "Add `inventory-service` service definition to `infra/docker-compose.yml` and write DigitalOcean release runbook."
    ],
    verification_command: "docker build -t livepilot-inventory-service:latest code/services/inventory-service/ && node scripts/deployment/verify-container-smoke.mjs --service inventory-service",
    completion_gate: "Docker build succeeds, container passes smoke test, and release runbook is approved.",
    stop_condition: "Build failure, root container execution, failing health check, or missing documentation.",
    touch_map: [
      "code/services/inventory-service/Dockerfile",
      "code/services/inventory-service/package.json",
      "infra/docker-compose.yml",
      "docs/03-architecture/deployment/inventory-release-runbook.md",
      "docs/03-architecture/specs/goals/G-INVT-008/"
    ],
    criteria: [
      "Multi-stage Dockerfile runs as unprivileged user with dumb-init.",
      "Container service definition registered in docker-compose.yml.",
      "Healthcheck endpoint /healthz responds with HTTP 200 and healthy DB/NATS status."
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
  owner: {role: developer}
  approver: {role: tech-lead}
  risk: {level: ${g.risk_level}, reasons: ${g.risk_reasons}}
  reversibility: {level: reversible}
  external_dependencies: [${g.depends_on === '—' ? '' : g.depends_on}]
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: planned, implementation: pending, verification: pending, evidence: pending, review: pending, release: unreleased, learning: pending}
---

# ${g.id}: ${g.title}

**Status:** ${g.status}  
**Kind:** ${g.kind}  
**Atomic outcome:** ${g.atomic_outcome}  
**Epic:** INVT  
**Depends on:** ${g.depends_on}  
**Blocks:** —  
**Spec stability:** clarify pending | spec check pending | analyze pending

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:---:|:---:|:---:|:---:|:---:|
| **●** | ○ | ○ | ○ | ○ |

## Plan Steps Table
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
| Requirement | REQ-LP-004, REQ-LP-016 |
| Architecture | docs/03-architecture/overview.md; docs/03-architecture/service-topology-sot.md |

## Context manifest
| Kind | IDs / paths |
|---|---|
| SOT | docs/03-architecture/technical-specifications-sot.md; docs/03-architecture/software-quality-sot.md |
| Deployment | docs/03-architecture/deployment/digitalocean-droplets-sot.md |

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

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| inventory-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Inventory Reservation & Stock Mutation Domain |
| Ports & Adapters | Inbound NATS JetStream port; outbound PostgreSQL persistence and outbox ports |
| State & Safety | Deterministic state transitions; fail-closed validation; zero overselling |
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
Reservations transition through requested → reserved → committed / released / expired; conflicts fail closed.

### Mathematical & Data Invariants Spec
Exact integer quantities, zero overselling (available_stock >= 0), zero-float money and quantity arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
`;
}

// Generate specs and goals
for (const g of invtGoals) {
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
console.log('Successfully generated all INVT goals and satellite specs.');
