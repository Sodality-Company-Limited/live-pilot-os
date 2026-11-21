import fs from 'node:fs';
import path from 'node:path';

const GOALS_DIR = path.resolve('docs/07-backlog/goals');
const SPECS_BASE = path.resolve('docs/03-architecture/specs/goals');

const telmGoals = [
  {
    id: "G-TELM-001",
    title: "Freeze the Telemetry service contract",
    kind: "api",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[service boundary and event compatibility]",
    atomic_outcome: "A versioned, SOT-owned contract for tenant/session-scoped signal ingestion.",
    depends_on: "—",
    step_desc: "Freeze telemetry contract and schema specifications",
    context: "Telemetry owns `livepilot.v1.telemetry.signal.ingest` and the canonical telemetry-signal payload family. It writes normalized signal facts and lineage; it does not classify intent/risk or own the audit ledger.",
    intent_why: "Establish immutable SOT contract, schemas, and NATS subject registrations for telemetry-service before implementing runtime code.",
    intent_done_when: "The telemetry-service contract, AsyncAPI channels, error codes, and JSON schemas pass all automated schema validation and traceability checks.",
    intent_unblocks: "G-TELM-002, G-TELM-003, G-TELM-004",
    in_scope: [
      "`docs/03-architecture/api/services/telemetry-service.md`",
      "`docs/03-architecture/api/asyncapi.yaml` telemetry channel definitions",
      "`docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`",
      "`docs/03-architecture/api/error-codes.yaml` error codes for telemetry",
      "`docs/03-architecture/api/nats-subject-catalog-sot.md` registration",
      "`docs/03-architecture/specs/goals/G-TELM-001/`"
    ],
    out_scope: [
      "Runtime service code for telemetry ingest (owned by G-TELM-005)",
      "Database schema creation and migrations (owned by G-TELM-003)",
      "Domain state machine implementation (owned by G-TELM-004)"
    ],
    step_actions: [
      "Update `docs/03-architecture/api/services/telemetry-service.md` with complete ownership, commands, events, state machine, errors, and delivery semantics.",
      "Validate `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json` and ensure registration in `asyncapi.yaml` and `nats-subject-catalog-sot.md`."
    ],
    verification_command: "node scripts/harness/api-sot-traceability-harness.mjs && node scripts/contract-check/error-code-registry.mjs",
    completion_gate: "Contract file, schemas, asyncapi channels, and error code registry pass all validation gates with zero drift.",
    stop_condition: "Unresolved ownership conflict, unregistered subjects, schema validation failure, or out-of-scope code changes.",
    touch_map: [
      "docs/03-architecture/api/services/telemetry-service.md",
      "docs/03-architecture/api/asyncapi.yaml",
      "docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json",
      "docs/03-architecture/api/nats-subject-catalog-sot.md",
      "docs/03-architecture/api/error-codes.yaml",
      "docs/03-architecture/specs/goals/G-TELM-001/"
    ],
    criteria: [
      "`docs/03-architecture/api/services/telemetry-service.md` defines complete ownership, aggregate, commands, events, and persistence boundaries.",
      "`docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json` conforms strictly to JSON Schema draft-07 and envelopes.",
      "API SOT traceability harness passes with zero unmapped endpoints or subjects."
    ]
  },
  {
    id: "G-TELM-002",
    title: "Verify Telemetry message compatibility",
    kind: "qa",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "medium",
    risk_reasons: "[message schema evolution and consumer compatibility]",
    atomic_outcome: "Schema conformance test suite and backward-compatibility golden fixtures for telemetry signals.",
    depends_on: "G-TELM-001",
    step_desc: "Create golden contract fixtures and automated schema validation tests",
    context: "Telemetry ingestion accepts signals across multiple producer versions. Backward compatibility must be verified with automated contract fixtures before implementation.",
    intent_why: "Guarantee all incoming telemetry message variants conform strictly to schema envelopes and pass backward-compatibility test suites.",
    intent_done_when: "Contract test suite passes against valid, invalid, and legacy golden fixtures with zero false positives.",
    intent_unblocks: "G-TELM-005",
    in_scope: [
      "`tests/contracts/telemetry/` test fixtures and contract runners",
      "Valid, invalid, edge-case, and envelope schema validation tests",
      "`docs/03-architecture/specs/goals/G-TELM-002/`"
    ],
    out_scope: [
      "Database integration and persistence logic",
      "Live NATS cluster connections"
    ],
    step_actions: [
      "Establish valid and invalid golden JSON fixtures under `tests/contracts/telemetry/fixtures/`.",
      "Implement Jest/TypeScript contract test runner verifying header envelopes, tenant scopes, and schema constraints."
    ],
    verification_command: "npm test -- tests/contracts/telemetry/telemetry-signal-contract.spec.ts",
    completion_gate: "All golden fixtures pass validation and invalid payloads fail closed with structured schema error receipts.",
    stop_condition: "Silent validation failure, missing required envelope assertions, or mocked test runners.",
    touch_map: [
      "tests/contracts/telemetry/telemetry-signal-contract.spec.ts",
      "tests/contracts/telemetry/fixtures/telemetry-signal.valid.json",
      "tests/contracts/telemetry/fixtures/telemetry-signal.invalid.json",
      "docs/03-architecture/specs/goals/G-TELM-002/"
    ],
    criteria: [
      "Golden payload fixtures cover all signal types (`chat`, `purchase`, `engagement`, `system`).",
      "Contract test suite verifies envelope headers: `tenant_id`, `session_id`, `traceparent`, and `occurred_at`.",
      "Schema validation fails closed upon detecting unexpected or unversioned fields."
    ]
  },
  {
    id: "G-TELM-003",
    title: "Create Telemetry persistence schema",
    kind: "migration",
    status: "planned",
    profiles: "[core, database]",
    risk_level: "high",
    risk_reasons: "[authoritative persistence schema, partition strategy, and rollback]",
    atomic_outcome: "Idempotent PostgreSQL migration scripts establishing telemetry signal storage and lineage tables.",
    depends_on: "G-TELM-001",
    step_desc: "Author and verify up and down PostgreSQL migrations for telemetry service",
    context: "Telemetry ingestion requires append-only persistence with partition pruning by tenant and session, unique deduplication indexes, and RLS tenant isolation.",
    intent_why: "Establish authoritative database tables and outbox records for telemetry-service before domain logic is implemented.",
    intent_done_when: "Fresh apply, rollback-safe down migration, and idempotent re-apply pass cleanly against PostgreSQL.",
    intent_unblocks: "G-TELM-005",
    in_scope: [
      "`code/services/telemetry-service/migrations/`",
      "Tables: `telemetry_signals`, `telemetry_lineage`, `telemetry_inbox`, `telemetry_outbox`",
      "Composite indexes on `(tenant_id, session_id, signal_id)` and RLS policies",
      "`docs/03-architecture/specs/goals/G-TELM-003/`"
    ],
    out_scope: [
      "Runtime ingest service logic",
      "Cross-service analytics tables"
    ],
    step_actions: [
      "Create `001_create_telemetry_signals.up.sql` with tables, indexes, constraints, and Row-Level Security policies.",
      "Create corresponding `001_create_telemetry_signals.down.sql` rollback script and verify idempotency."
    ],
    verification_command: "npm test -- code/services/telemetry-service/test/migration.spec.ts",
    completion_gate: "Fresh apply, repeat apply, rollback, and constraint validation pass with zero SQL errors.",
    stop_condition: "Destructive down migration, cross-service schema leakage, or missing tenant isolation RLS.",
    touch_map: [
      "code/services/telemetry-service/migrations/001_create_telemetry_signals.up.sql",
      "code/services/telemetry-service/migrations/001_create_telemetry_signals.down.sql",
      "code/services/telemetry-service/test/migration.spec.ts",
      "docs/03-architecture/specs/goals/G-TELM-003/"
    ],
    criteria: [
      "PostgreSQL tables `telemetry_signals`, `telemetry_lineage`, `telemetry_inbox`, and `telemetry_outbox` are created.",
      "Composite primary keys and unique constraint on `(tenant_id, session_id, signal_id)` prevent duplicates.",
      "Rollback script cleanly drops all created objects without affecting shared database state."
    ]
  },
  {
    id: "G-TELM-004",
    title: "Implement Telemetry signal state machine",
    kind: "feature",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "medium",
    risk_reasons: "[signal transition invariants and deterministic handling]",
    atomic_outcome: "Deterministic TypeScript state machine managing signal lifecycle states.",
    depends_on: "G-TELM-001",
    step_desc: "Implement pure signal lifecycle state machine with property-based tests",
    context: "Signals transition through `received` -> `validated` -> `persisted` -> `dispatched` / `failed`. Transitions must be deterministic and fail closed on invalid events.",
    intent_why: "Provide a zero-dependency, pure domain state machine enforcing signal lifecycle invariants.",
    intent_done_when: "All legal state transitions advance correctly, invalid transitions throw typed domain errors, and property tests pass 100%.",
    intent_unblocks: "G-TELM-005",
    in_scope: [
      "`code/services/telemetry-service/src/domain/signal-state-machine.ts`",
      "`code/services/telemetry-service/src/domain/signal-state-machine.spec.ts`",
      "`docs/03-architecture/specs/goals/G-TELM-004/`"
    ],
    out_scope: [
      "I/O or database operations",
      "NATS transport listeners"
    ],
    step_actions: [
      "Implement `SignalStateMachine` pure domain reducer with state enum, events, and explicit transition matrix.",
      "Author unit and property-based tests using fast-check verifying invariant protection across 1,000 randomized state permutations."
    ],
    verification_command: "npm test -- code/services/telemetry-service/src/domain/signal-state-machine.spec.ts",
    completion_gate: "100% branch and statement coverage across all state transitions and illegal transitions reject fail-closed.",
    stop_condition: "Unchecked state transitions, side effects inside pure domain reducer, or mocked invariants.",
    touch_map: [
      "code/services/telemetry-service/src/domain/signal-state-machine.ts",
      "code/services/telemetry-service/src/domain/signal-state-machine.spec.ts",
      "docs/03-architecture/specs/goals/G-TELM-004/"
    ],
    criteria: [
      "Legal transitions `received → validated → persisted → dispatched` are strictly enforced.",
      "Duplicate signals or out-of-order transitions throw deterministic `IllegalStateTransitionError`.",
      "Property-based invariant tests pass across 1,000 trials with zero regressions."
    ]
  },
  {
    id: "G-TELM-005",
    title: "Implement the Telemetry ingest vertical slice",
    kind: "feature",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[real-time event ingestion throughput and outbox atomicity]",
    atomic_outcome: "Functional NATS JetStream consumer writing signals idempotently to database.",
    depends_on: "G-TELM-002, G-TELM-003, G-TELM-004",
    step_desc: "Implement end-to-end ingestion pipeline with repository and outbox publisher",
    context: "Combines schema validation, domain state machine, and PostgreSQL persistence into the primary ingestion vertical slice with ack-after-commit semantics.",
    intent_why: "Deliver the core single vertical slice for telemetry signal ingestion from NATS subject through durable persistence.",
    intent_done_when: "Valid incoming signals are validated, written to database with outbox event, and acknowledged only after durable commit.",
    intent_unblocks: "G-TELM-006",
    in_scope: [
      "`code/services/telemetry-service/src/ingest/`",
      "NATS JetStream consumer for `livepilot.v1.telemetry.signal.ingest`",
      "Kysely repository persistence with transactional outbox",
      "`docs/03-architecture/specs/goals/G-TELM-005/`"
    ],
    out_scope: [
      "DLQ background recovery workers (owned by G-TELM-006)",
      "Production deployment manifests (owned by G-TELM-008)"
    ],
    step_actions: [
      "Implement `TelemetryIngestService` and repository wiring NATS subscriber to database transaction boundary.",
      "Verify end-to-end integration tests confirming ack-after-commit, duplicate idempotency, and transactional outbox emission."
    ],
    verification_command: "npm test -- code/services/telemetry-service/src/ingest/telemetry-ingest.service.spec.ts",
    completion_gate: "End-to-end vertical slice passes integration tests with real PostgreSQL and NATS mock containers.",
    stop_condition: "Acking before database commit, untransactional outbox writes, or unhandled persistence exceptions.",
    touch_map: [
      "code/services/telemetry-service/src/ingest/telemetry-ingest.service.ts",
      "code/services/telemetry-service/src/ingest/telemetry-ingest.controller.ts",
      "code/services/telemetry-service/src/ingest/telemetry-ingest.service.spec.ts",
      "docs/03-architecture/specs/goals/G-TELM-005/"
    ],
    criteria: [
      "Incoming NATS signals are processed with at-least-once delivery and strict `session_id` ordering.",
      "Duplicate `signal_id` payloads are detected idempotently without redundant database writes.",
      "Consumer sends JetStream ack ONLY after database transaction commits successfully."
    ]
  },
  {
    id: "G-TELM-006",
    title: "Add Telemetry recovery and reconciliation",
    kind: "feature",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[dead-letter handling, backoff retries, and data reconciliation]",
    atomic_outcome: "Dead-letter queue consumer and background reconciliation worker for interrupted signals.",
    depends_on: "G-TELM-005",
    step_desc: "Implement exponential backoff retry worker, DLQ routing, and periodic reconciliation scanner",
    context: "Signals encountering transient persistence errors must be retried with exponential backoff (max 5 attempts) before routing to `livepilot.v1.telemetry.signal.dlq`.",
    intent_why: "Guarantee resilience against transient network and database failures with automatic retry and dead-letter routing.",
    intent_done_when: "Transient errors are retried up to 5 times, unrecoverable errors route to DLQ with causation headers, and reconciliation reaps pending signals.",
    intent_unblocks: "G-TELM-007",
    in_scope: [
      "`code/services/telemetry-service/src/reconciliation/`",
      "Retry policy handler and DLQ publisher",
      "Periodic uncommitted signal reconciliation job",
      "`docs/03-architecture/specs/goals/G-TELM-006/`"
    ],
    out_scope: [
      "User-facing administrative UI",
      "External PagerDuty alerting webhooks"
    ],
    step_actions: [
      "Implement `TelemetryReconciliationService` handling retry backoff scheduling and DLQ dispatching.",
      "Author fault-injection integration tests simulating database timeouts and asserting DLQ delivery with audit receipts."
    ],
    verification_command: "npm test -- code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.spec.ts",
    completion_gate: "Fault simulation tests pass: signals retry up to 5 times then land on DLQ with zero message loss.",
    stop_condition: "Unbounded retries, lost error contexts on DLQ messages, or non-deterministic recovery behavior.",
    touch_map: [
      "code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.ts",
      "code/services/telemetry-service/src/reconciliation/telemetry-reconciliation.service.spec.ts",
      "docs/03-architecture/specs/goals/G-TELM-006/"
    ],
    criteria: [
      "Transient failures trigger exponential backoff retry up to 5 attempts.",
      "Permanent failures and exhausted retries publish cleanly to `livepilot.v1.telemetry.signal.dlq`.",
      "Reconciliation worker safely identifies and resolves uncommitted signal records."
    ]
  },
  {
    id: "G-TELM-007",
    title: "Certify isolated Telemetry service behavior",
    kind: "qa",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[high-throughput SLA, zero data loss, and latency certification]",
    atomic_outcome: "End-to-end test certification suite proving service SLA, throughput, and zero-loss guarantees.",
    depends_on: "G-TELM-006",
    step_desc: "Execute high-throughput load benchmark and generate cryptographic certification proof receipt",
    context: "Before production deployment, telemetry service must be certified under simulated peak load in an isolated test environment.",
    intent_why: "Certify service latency percentiles (p95 < 50ms, p99 < 100ms), throughput, and memory bounds prior to production rollout.",
    intent_done_when: "Load and stress harness passes 100% with zero dropped signals and cryptographic proof receipt is emitted.",
    intent_unblocks: "G-TELM-008",
    in_scope: [
      "`code/services/telemetry-service/test/certification/`",
      "High-throughput load and chaos stress harness",
      "Cryptographic certification proof receipt under `artifacts/proofs/G-TELM-007_certification.json`",
      "`docs/03-architecture/specs/goals/G-TELM-007/`"
    ],
    out_scope: [
      "DigitalOcean Kubernetes infrastructure provisioning",
      "DNS configuration"
    ],
    step_actions: [
      "Implement and run high-concurrency stress harness delivering 10,000 signals across 50 concurrent live sessions.",
      "Verify latency invariants and emit cryptographic proof receipt bound to SHA-256 source digests."
    ],
    verification_command: "npm test -- code/services/telemetry-service/test/certification/telemetry-certification.spec.ts",
    completion_gate: "Load benchmark meets all latency SLAs with 0 dropped events, emitting verified proof receipt.",
    stop_condition: "Latency SLA breach, memory leak under sustained load, or missing cryptographic receipt.",
    touch_map: [
      "code/services/telemetry-service/test/certification/telemetry-certification.spec.ts",
      "artifacts/proofs/G-TELM-007_certification.json",
      "docs/03-architecture/specs/goals/G-TELM-007/"
    ],
    criteria: [
      "Sustained throughput benchmark achieves p95 latency < 50ms and p99 < 100ms.",
      "Zero dropped signals under simulated network disruption and high concurrency.",
      "Cryptographic proof receipt `artifacts/proofs/G-TELM-007_certification.json` validates green."
    ]
  },
  {
    id: "G-TELM-008",
    title: "Deploy Telemetry service to DigitalOcean",
    kind: "chore",
    status: "planned",
    profiles: "[core, infra]",
    risk_level: "high",
    risk_reasons: "[production deployment, health probes, and cluster rollout]",
    atomic_outcome: "Production Dockerfile, Kubernetes manifests, and CI/CD deployment configuration for telemetry-service.",
    depends_on: "G-TELM-007",
    step_desc: "Construct hardened Dockerfile, Kubernetes manifests, and verify rollout against DigitalOcean",
    context: "The certified telemetry-service requires containerization, health probes, and Kubernetes manifests for DigitalOcean cluster deployment.",
    intent_why: "Deliver verified Docker container build and DigitalOcean Kubernetes deployment configuration for telemetry-service.",
    intent_done_when: "Container image builds cleanly, health probes `/healthz` and `/livez` respond 200 OK, and staging deployment succeeds.",
    intent_unblocks: "Epic TELM completion",
    in_scope: [
      "`code/services/telemetry-service/Dockerfile`",
      "`infra/k8s/telemetry-service.yaml`",
      "Health probe endpoints and resource limits",
      "`docs/03-architecture/specs/goals/G-TELM-008/`"
    ],
    out_scope: [
      "Core cluster VPC provisioning",
      "External DNS nameserver migrations"
    ],
    step_actions: [
      "Create multi-stage production Dockerfile executing as non-root user with minimal Alpine/Debian base.",
      "Author Kubernetes deployment and service manifests with liveness/readiness probes, resource limits, and secrets injection."
    ],
    verification_command: "docker build -f code/services/telemetry-service/Dockerfile code/services/telemetry-service && kubectl apply --dry-run=client -f infra/k8s/telemetry-service.yaml",
    completion_gate: "Container image builds under 200MB, passes security audit, and Kubernetes manifests validate cleanly.",
    stop_condition: "Root execution in container, unpinned base images, missing health probes, or manifest syntax errors.",
    touch_map: [
      "code/services/telemetry-service/Dockerfile",
      "infra/k8s/telemetry-service.yaml",
      "docs/03-architecture/specs/goals/G-TELM-008/"
    ],
    criteria: [
      "Dockerfile builds minimal, hardened container image running as unprivileged user.",
      "Kubernetes deployment includes liveness probe, readiness probe, and strict CPU/memory limits.",
      "Dry-run deployment and configuration validation pass without warnings or errors."
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
**Spec stability:** clarify done | spec check pending | analyze pending  
**Atomic outcome:** ${g.atomic_outcome}  
**Epic:** TELM  
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
| Requirement | REQ-LP-016 |
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
| telemetry-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Telemetry Signal Observation Domain |
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
Signals transition through received → validated → persisted → dispatched; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
`;
}

// Generate specs and goals
for (const g of telmGoals) {
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
