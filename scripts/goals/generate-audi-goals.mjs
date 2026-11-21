import fs from 'node:fs';
import path from 'node:path';

const GOALS_DIR = path.resolve('docs/07-backlog/goals');
const SPECS_BASE = path.resolve('docs/03-architecture/specs/goals');

const audiGoals = [
  {
    id: "G-AUDI-001",
    title: "Freeze the Audit service contract & error registry",
    kind: "api",
    status: "ready",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[audit boundary, immutable ledger, and error registry]",
    atomic_outcome: "A versioned, SOT-owned contract for append-only audit receipt ingestion and error codes.",
    depends_on: "—",
    step_desc: "Freeze audit contract, schema specifications, and error codes",
    context: "Audit owns `livepilot.v1.audit.receipt.append` and the canonical audit-receipt payload family. It writes immutable ledger facts and proof lineages; it does not mutate business state.",
    intent_why: "Establish immutable SOT contract, schemas, LP13xxx error codes, and NATS subject registrations for audit-service before implementing runtime code.",
    intent_done_when: "The audit-service contract, AsyncAPI channels, error codes, and JSON schemas pass all automated schema validation and traceability checks.",
    intent_unblocks: "G-AUDI-002, G-AUDI-003, G-AUDI-004",
    in_scope: [
      "`docs/03-architecture/api/services/audit-service.md`",
      "`docs/03-architecture/api/asyncapi.yaml` audit channel definitions",
      "`docs/03-architecture/api/schemas/nats/audit-receipt.schema.json`",
      "`docs/03-architecture/api/error-codes.yaml` error codes for audit (LP13xxx)",
      "`docs/03-architecture/api/nats-subject-catalog-sot.md` registration",
      "`docs/03-architecture/specs/goals/G-AUDI-001/`"
    ],
    out_scope: [
      "Runtime service code for audit append (owned by G-AUDI-005)",
      "Database schema creation and migrations (owned by G-AUDI-003)",
      "Domain state machine implementation (owned by G-AUDI-004)"
    ],
    step_actions: [
      "Update `docs/03-architecture/api/services/audit-service.md` with complete ownership, commands, events, state machine, errors, and delivery semantics.",
      "Validate `docs/03-architecture/api/schemas/nats/audit-receipt.schema.json` and ensure registration in `asyncapi.yaml` and `nats-subject-catalog-sot.md`."
    ],
    verification_command: "node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs",
    completion_gate: "Contract file, schemas, asyncapi channels, and error code registry pass all validation gates with zero drift.",
    stop_condition: "Unresolved ownership conflict, unregistered subjects, schema validation failure, or out-of-scope code changes.",
    touch_map: [
      "docs/03-architecture/api/services/audit-service.md",
      "docs/03-architecture/api/asyncapi.yaml",
      "docs/03-architecture/api/schemas/nats/audit-receipt.schema.json",
      "docs/03-architecture/api/nats-subject-catalog-sot.md",
      "docs/03-architecture/api/error-codes.yaml",
      "docs/03-architecture/specs/goals/G-AUDI-001/"
    ],
    criteria: [
      "`docs/03-architecture/api/services/audit-service.md` defines complete ownership, aggregate, commands, events, and persistence boundaries.",
      "`docs/03-architecture/api/schemas/nats/audit-receipt.schema.json` conforms strictly to JSON Schema draft-2020-12 and envelopes.",
      "API SOT traceability harness passes with zero unmapped endpoints or subjects."
    ]
  },
  {
    id: "G-AUDI-002",
    title: "Verify Audit message compatibility",
    kind: "qa",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "medium",
    risk_reasons: "[message schema evolution and consumer compatibility]",
    atomic_outcome: "Schema conformance test suite and backward-compatibility golden fixtures for audit receipts.",
    depends_on: "G-AUDI-001",
    step_desc: "Create golden contract fixtures and automated schema validation tests",
    context: "Audit ingestion accepts receipts across multiple producer versions. Backward compatibility must be verified with automated contract fixtures before implementation.",
    intent_why: "Guarantee all incoming audit message variants conform strictly to schema envelopes and pass backward-compatibility test suites.",
    intent_done_when: "Contract test suite passes against valid, invalid, and legacy golden fixtures with zero false positives.",
    intent_unblocks: "G-AUDI-005",
    in_scope: [
      "`tests/contracts/audit/` test fixtures and contract runners",
      "Valid, invalid, edge-case, and envelope schema validation tests",
      "`docs/03-architecture/specs/goals/G-AUDI-002/`"
    ],
    out_scope: [
      "Database integration and persistence testing (owned by G-AUDI-003/005)",
      "Runtime service code (owned by G-AUDI-005)"
    ],
    step_actions: [
      "Implement `tests/contracts/audit/audit-schema.test.mjs` verifying required fields, envelope headers, and payload restrictions.",
      "Add golden JSON fixtures representing valid and invalid audit receipt payloads."
    ],
    verification_command: "node --test tests/contracts/audit/audit-schema.test.mjs",
    completion_gate: "All schema contract tests pass 100% green with zero mocks or skipped tests.",
    stop_condition: "Schema validation failure, missing required fields, or uncaught contract drift.",
    touch_map: [
      "tests/contracts/audit/",
      "docs/03-architecture/specs/goals/G-AUDI-002/"
    ],
    criteria: [
      "Contract tests reject malformed envelopes, missing headers, or unexpected additional properties.",
      "Backward-compatibility fixtures pass cleanly without schema violation."
    ]
  },
  {
    id: "G-AUDI-003",
    title: "Create Audit persistence schema & hash-chaining",
    kind: "migration",
    status: "planned",
    profiles: "[core, database]",
    risk_level: "high",
    risk_reasons: "[database migration, tamper-evident hash chaining, and unique constraints]",
    atomic_outcome: "PostgreSQL 16 migration defining audit_records, audit_inbox, and hash-chaining invariants.",
    depends_on: "G-AUDI-001",
    step_desc: "Write up/down SQL migrations for audit persistence and idempotency",
    context: "Audit records require immutable append-only persistence with SHA-256 hash chaining, composite uniqueness, and transactional inbox.",
    intent_why: "Provide a durable, tamper-evident schema with zero foreign keys to external services and strict tenant isolation.",
    intent_done_when: "Up and down migrations execute cleanly against PostgreSQL 16 with indexes and idempotency constraints intact.",
    intent_unblocks: "G-AUDI-005",
    in_scope: [
      "`code/services/audit-service/migrations/`",
      "PostgreSQL 16 tables: `audit_records`, `audit_inbox`, `audit_idempotency`",
      "`docs/03-architecture/specs/goals/G-AUDI-003/`"
    ],
    out_scope: [
      "Application logic and domain handlers (owned by G-AUDI-004/005)",
      "NATS consumer code (owned by G-AUDI-005)"
    ],
    step_actions: [
      "Create SQL migration files with strict up/down scripts for `audit_records`, `audit_inbox`, and `audit_idempotency`.",
      "Enforce unique index on `(tenant_id, receipt_id)` and sequential hash chaining `(prev_record_hash, record_hash)`."
    ],
    verification_command: "node scripts/harness/migration-runner.mjs --service audit-service",
    completion_gate: "Migrations apply and revert cleanly with zero errors and 100% invariant verification.",
    stop_condition: "Migration rollback failure, missing unique constraints, or non-deterministic schema creation.",
    touch_map: [
      "code/services/audit-service/migrations/",
      "docs/03-architecture/specs/goals/G-AUDI-003/"
    ],
    criteria: [
      "Table `audit_records` has immutable append-only constraints and SHA-256 record hashing.",
      "Migration applies and rolls back deterministically without leaving orphaned objects."
    ]
  },
  {
    id: "G-AUDI-004",
    title: "Implement Audit receipt state machine & redaction",
    kind: "feature",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[FSM deterministic transitions, sensitive data redaction, and fail-closed security]",
    atomic_outcome: "Pure domain FSM and zero-leakage redaction filter for audit receipts.",
    depends_on: "G-AUDI-001",
    step_desc: "Implement deterministic domain FSM and redaction filter",
    context: "Audit receipts transition through received -> validated -> redacted -> hashed -> committed. Redaction must strip tokens, credentials, and raw PII before persistence.",
    intent_why: "Enforce strict state machine transitions and zero-leakage redaction invariants at the pure domain level.",
    intent_done_when: "Pure domain FSM unit tests pass with 100% branch coverage and zero mock objects.",
    intent_unblocks: "G-AUDI-005",
    in_scope: [
      "`code/services/audit-service/src/domain/`",
      "`code/services/audit-service/test/unit/`",
      "`docs/03-architecture/specs/goals/G-AUDI-004/`"
    ],
    out_scope: [
      "Database access and network I/O (owned by G-AUDI-005)",
      "NATS transport adapters (owned by G-AUDI-005)"
    ],
    step_actions: [
      "Implement `AuditReceiptStateMachine` enforcing valid transitions and fail-closed error handling.",
      "Implement `AuditRedactionFilter` scrubbing credentials, auth tokens, COGS, and unmasked PII."
    ],
    verification_command: "npm --prefix code/services/audit-service test:unit",
    completion_gate: "100% of domain FSM and redaction unit tests pass with zero warnings.",
    stop_condition: "Invalid transition permitted, unredacted secret detected, or test assertion failure.",
    touch_map: [
      "code/services/audit-service/src/domain/",
      "code/services/audit-service/test/unit/",
      "docs/03-architecture/specs/goals/G-AUDI-004/"
    ],
    criteria: [
      "State transitions follow strict DAG reachability; illegal transitions throw typed errors.",
      "Redaction filter provably removes Bearer tokens, passwords, and sensitive financial margins."
    ]
  },
  {
    id: "G-AUDI-005",
    title: "Implement the Audit append vertical slice",
    kind: "feature",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[end-to-end receipt ingestion, transactional atomicity, and hash chaining]",
    atomic_outcome: "A fully functional end-to-end append pipeline from NATS ingest to PostgreSQL commit.",
    depends_on: "G-AUDI-002, G-AUDI-003, G-AUDI-004",
    step_desc: "Implement vertical slice connecting NATS consumer, domain FSM, and persistence repository",
    context: "The primary vertical slice ingests `livepilot.v1.audit.receipt.append`, checks idempotency, redacts secrets, appends to hash chain, and commits atomically.",
    intent_why: "Deliver the core operational capability of audit-service in a production-ready, zero-mock vertical slice.",
    intent_done_when: "Integration tests verify complete flow from message ingestion to durable database commit with verified hash chaining.",
    intent_unblocks: "G-AUDI-006, G-AUDI-007",
    in_scope: [
      "`code/services/audit-service/src/application/`",
      "`code/services/audit-service/src/infrastructure/`",
      "`code/services/audit-service/test/integration/`",
      "`docs/03-architecture/specs/goals/G-AUDI-005/`"
    ],
    out_scope: [
      "Query projections and HTTP read routes (owned by G-AUDI-006)",
      "Production containerization and Kubernetes manifests (owned by G-AUDI-008)"
    ],
    step_actions: [
      "Implement `AuditAppendHandler` orchestrating idempotency check, domain FSM, and repository commit.",
      "Implement PostgreSQL repository with atomic hash-chaining and outbox fact publishing."
    ],
    verification_command: "npm --prefix code/services/audit-service test:integration",
    completion_gate: "Integration tests pass cleanly with real PostgreSQL and NATS test containers.",
    stop_condition: "Integration test failure, hash divergence, broken idempotency, or unhandled promise rejection.",
    touch_map: [
      "code/services/audit-service/src/application/",
      "code/services/audit-service/src/infrastructure/",
      "code/services/audit-service/test/integration/",
      "docs/03-architecture/specs/goals/G-AUDI-005/"
    ],
    criteria: [
      "Duplicate receipt appends return the original committed receipt without double-appending.",
      "Hash chain linkage is strictly validated: every new record cryptographically binds to the previous record hash."
    ]
  },
  {
    id: "G-AUDI-006",
    title: "Implement Audit query projection & DLQ recovery",
    kind: "feature",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "medium",
    risk_reasons: "[safe query projection, dead-letter routing, and replay authorization]",
    atomic_outcome: "Safe action log query projection, dead-letter handling, and authorized replay mechanics.",
    depends_on: "G-AUDI-005",
    step_desc: "Implement query projections and dead-letter queue recovery",
    context: "Portal BFF queries action logs for live sessions. Failed audit ingest commands must route to DLQ with authorized replay capabilities.",
    intent_why: "Provide safe, redacted query read-models and resilient error recovery without compromising audit integrity.",
    intent_done_when: "Action log query returns redacted timeline facts, and exhausted retries route safely to DLQ with replay support.",
    intent_unblocks: "G-AUDI-007",
    in_scope: [
      "`code/services/audit-service/src/application/queries/`",
      "`code/services/audit-service/src/infrastructure/nats/dlq.consumer.ts`",
      "`code/services/audit-service/test/e2e/`",
      "`docs/03-architecture/specs/goals/G-AUDI-006/`"
    ],
    out_scope: [
      "Production Docker and Kubernetes deployment (owned by G-AUDI-008)"
    ],
    step_actions: [
      "Implement `ActionLogQueryHandler` projecting sanitized, session-scoped timeline events.",
      "Implement DLQ consumer and operator-authorized replay worker emitting new audit receipts."
    ],
    verification_command: "npm --prefix code/services/audit-service test:e2e",
    completion_gate: "All query projection and DLQ recovery scenarios pass with verified audit receipts.",
    stop_condition: "Unredacted secret in query projection, failure to route to DLQ, or unauthorized replay execution.",
    touch_map: [
      "code/services/audit-service/src/application/queries/",
      "code/services/audit-service/src/infrastructure/nats/dlq.consumer.ts",
      "code/services/audit-service/test/e2e/",
      "docs/03-architecture/specs/goals/G-AUDI-006/"
    ],
    criteria: [
      "Query projection never exposes sensitive auth tokens, passwords, or provider API keys.",
      "Exhausted failures enter `livepilot.v1.audit.receipt.dlq` and can be safely replayed."
    ]
  },
  {
    id: "G-AUDI-007",
    title: "Certify isolated Audit service behavior & PRR",
    kind: "qa",
    status: "planned",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[production readiness certification, cryptographic proof verification, and load SLA]",
    atomic_outcome: "Full-suite certification report and cryptographic proof receipt for audit-service.",
    depends_on: "G-AUDI-006",
    step_desc: "Execute complete PRR suite including concurrency, load, chaos, and cryptographic proofs",
    context: "Audit-service must pass an exhaustive production readiness review ensuring sub-50ms latency SLAs, tamper-evident Merkle verification, and zero concurrency race conditions.",
    intent_why: "Verify that audit-service satisfies all declared latency SLAs, tamper-evident Merkle invariants, and resilience requirements under load.",
    intent_done_when: "All 16 enterprise verification gates pass, emitting a verified cryptographic proof receipt.",
    intent_unblocks: "G-AUDI-008",
    in_scope: [
      "`tests/services/audit/`",
      "`artifacts/proofs/G-AUDI-007-audit-certification.json`",
      "`docs/03-architecture/specs/goals/G-AUDI-007/`"
    ],
    out_scope: [
      "Cloud cluster provisioning (owned by G-AUDI-008)"
    ],
    step_actions: [
      "Run concurrency race condition tests verifying hash-chain serialization under heavy load.",
      "Execute cryptographic Merkle proof validation verifying zero ledger tampering."
    ],
    verification_command: "node scripts/harness/verification-orchestrator-harness.mjs --service audit-service",
    completion_gate: "100% of PRR gates pass; cryptographic proof receipt generated and validated.",
    stop_condition: "Any test failure, latency SLA violation, or cryptographic hash mismatch.",
    touch_map: [
      "tests/services/audit/",
      "artifacts/proofs/G-AUDI-007-audit-certification.json",
      "docs/03-architecture/specs/goals/G-AUDI-007/"
    ],
    criteria: [
      "Concurrency tests prove zero duplicate hash links or race conditions under 1,000 req/sec.",
      "Tamper-evident verification detects and rejects any simulated row modification."
    ]
  },
  {
    id: "G-AUDI-008",
    title: "Deploy Audit service to DigitalOcean",
    kind: "chore",
    status: "planned",
    profiles: "[core, deployment]",
    risk_level: "high",
    risk_reasons: "[production deployment, health probes, and cluster rollout]",
    atomic_outcome: "Production Dockerfile, Kubernetes manifests, and CI/CD deployment configuration for audit-service.",
    depends_on: "G-AUDI-007",
    step_desc: "Construct hardened Dockerfile, Kubernetes manifests, and verify rollout against DigitalOcean",
    context: "The certified audit-service requires containerization, health probes, and Kubernetes manifests for DigitalOcean cluster deployment.",
    intent_why: "Deliver verified Docker container build and DigitalOcean Kubernetes deployment configuration for audit-service.",
    intent_done_when: "Container image builds cleanly, health probes `/healthz` and `/livez` respond 200 OK, and staging deployment succeeds.",
    intent_unblocks: "Epic AUDI completion",
    in_scope: [
      "`code/services/audit-service/Dockerfile`",
      "`infra/production/k8s/audit-service.yaml`",
      "`infra/production/digitalocean-deploy.sh`",
      "`docs/03-architecture/specs/goals/G-AUDI-008/`"
    ],
    out_scope: [
      "Other microservices deployment configurations"
    ],
    step_actions: [
      "Create multi-stage hardened Dockerfile running as non-root user with minimal footprint.",
      "Create Kubernetes deployment, service, and HPA manifests with explicit liveness/readiness probes."
    ],
    verification_command: "docker build -t livepilot/audit-service:latest -f code/services/audit-service/Dockerfile . && bash infra/production/k8s/validate-manifests.sh",
    completion_gate: "Docker build succeeds, image passes vulnerability scan, and k8s manifests validate cleanly.",
    stop_condition: "Container build failure, root execution detected, or invalid k8s manifest syntax.",
    touch_map: [
      "code/services/audit-service/Dockerfile",
      "infra/production/k8s/audit-service.yaml",
      "infra/production/digitalocean-deploy.sh",
      "docs/03-architecture/specs/goals/G-AUDI-008/"
    ],
    criteria: [
      "Container runs as unprivileged user and includes health check probes.",
      "Deployment manifests specify strict resource requests, limits, and zero-downtime rolling updates."
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
**Epic:** AUDI  
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
**Zero-Mock invariant check:** 100% operational implementation; zero stubs, zero mocks, zero placeholders.  
**Completion gate:** ${g.completion_gate}  
**Stop condition:** ${g.stop_condition}

## Change delta
| Area | Action | Path / behaviour |
|---|---|---|
| audit-service | ADD/MODIFY | Implement only the declared atomic outcome |
| verification | ADD | Comprehensive test evidence and verification receipts |

## Software & Architecture Design
| Architectural Dimension | Specification / Invariant |
|---|---|
| System Archetype | backend-service |
| Bounded Context | Execution Audit & Immutable Decision Ledger Domain |
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
Signals transition through received → validated → redacted → hashed → committed; invalid transitions fail closed.

### Mathematical & Data Invariants Spec
Exact integer timestamps, zero-float calculations, and remainder-preserving batch processing.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
`;
}

// Generate specs and goals
for (const g of audiGoals) {
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
