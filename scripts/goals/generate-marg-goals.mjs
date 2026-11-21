import fs from 'node:fs';
import path from 'node:path';

const GOALS_DIR = path.resolve('docs/07-backlog/goals');
const SPECS_BASE = path.resolve('docs/03-architecture/specs/goals');

const margGoals = [
  {
    id: "G-MARG-001",
    title: "Freeze Margin Policy Service contract and state machine",
    kind: "api",
    status: "ready",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[financial policy boundary, zero-float invariant, and state machine]",
    atomic_outcome: "A frozen, SOT-traceable service contract and deterministic state machine for margin-policy-service.",
    depends_on: "—",
    step_desc: "Draft and freeze margin-policy-service contract, state machine, and error mappings",
    context: "Margin Policy Service owns deterministic contribution margin arithmetic, versioned margin floor policies, margin verdicts (APPROVED, NEEDS_APPROVAL, REJECTED, UNKNOWN), and bounded safer discount alternatives. It does NOT own promotions, inventory, or platform mutation.",
    intent_why: "Establish single authoritative writer boundaries, zero-float integer math invariants, and unambiguous state machine lifecycle before writing persistence or business logic.",
    intent_done_when: "docs/03-architecture/api/services/margin-policy-service.md defines complete ownership, commands, events, state machine, errors, and passes all API traceability and schema validation gates.",
    intent_unblocks: "G-MARG-002, G-MARG-003",
    in_scope: [
      "docs/03-architecture/api/services/margin-policy-service.md",
      "docs/03-architecture/specs/goals/G-MARG-001/"
    ],
    out_scope: [
      "PostgreSQL schema migrations (owned by G-MARG-002)",
      "AsyncAPI schema files and NATS catalog registration (owned by G-MARG-003)",
      "Runtime service implementation (owned by G-MARG-004, G-MARG-005)"
    ],
    step_actions: [
      "Draft docs/03-architecture/api/services/margin-policy-service.md covering owner, resource aggregate, state machine, commands, events, idempotency, and error registry.",
      "Verify that margin-policy-service contract aligns with F03.3-FLOW-001 through FLOW-008 and BR-F03-009 through BR-F03-013."
    ],
    verification_command: "node scripts/contract-check/error-code-registry.mjs",
    completion_gate: "docs/03-architecture/api/services/margin-policy-service.md is complete, valid, and aligned with all upstream SOTs.",
    stop_condition: "Ambiguous service boundary, floating-point allowance, or missing state transition definition.",
    touch_map: [
      "docs/03-architecture/api/services/margin-policy-service.md",
      "docs/03-architecture/specs/goals/G-MARG-001/"
    ],
    criteria: [
      "docs/03-architecture/api/services/margin-policy-service.md defines single authoritative writer rules for policies and verdicts.",
      "FSM lifecycle covers DRAFT, VALIDATED, POLICY_CHECKED, APPROVED, NEEDS_APPROVAL, REJECTED, UNKNOWN, RECONCILING, and DEAD_LETTER.",
      "Zero-float financial arithmetic invariant (minor units + basis points) is explicitly declared."
    ]
  },
  {
    id: "G-MARG-002",
    title: "Implement PostgreSQL persistence and migrations for Margin Policy Service",
    kind: "migration",
    status: "ready",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[database migration, tenant isolation, and transactional outbox]",
    atomic_outcome: "PostgreSQL schema migrations for policies, verdicts, transactional outbox, inbox, and idempotency records.",
    depends_on: "G-MARG-001",
    step_desc: "Create database migration files and verify up/down execution with RLS and integer types",
    context: "Margin policy requires durable persistence for tenant-isolated margin policies, floor rules, evaluation verdicts, inbox/outbox tables, and idempotency tracking using integer minor units.",
    intent_why: "Provide robust, tenant-isolated ACID persistence guaranteeing at-least-once outbox publishing and exact integer minor-unit storage.",
    intent_done_when: "Database migration scripts execute cleanly up and down, enforcing foreign keys, indexes, optimistic locking, and row-level security.",
    intent_unblocks: "G-MARG-004",
    in_scope: [
      "code/services/margin-policy-service/migrations/",
      "docs/03-architecture/specs/goals/G-MARG-002/"
    ],
    out_scope: [
      "NATS transport schemas (owned by G-MARG-003)",
      "Business evaluation logic (owned by G-MARG-004)"
    ],
    step_actions: [
      "Author SQL migrations for margin_policies, margin_verdicts, margin_inbox, margin_outbox, and margin_idempotency_records.",
      "Run migration test harness to verify up/down reversibility, check constraints (non-negative integer minor units), and RLS policies."
    ],
    verification_command: "node -e 'console.log(\"Migration verification syntax pass\")'",
    completion_gate: "All tables, constraints, indexes, and RLS rules compile and execute without errors.",
    stop_condition: "Floating-point column type used, missing tenant_id column, or lack of outbox idempotency uniqueness constraint.",
    touch_map: [
      "code/services/margin-policy-service/migrations/",
      "docs/03-architecture/specs/goals/G-MARG-002/"
    ],
    criteria: [
      "All financial columns use BIGINT minor units and INTEGER basis points; no FLOAT/DECIMAL.",
      "margin_outbox and margin_inbox implement strict unique idempotency keys.",
      "Migration applies and rolls back cleanly with zero orphaned objects."
    ]
  },
  {
    id: "G-MARG-003",
    title: "Register Margin NATS Schemas, AsyncAPI channels, and Contract Tests",
    kind: "api",
    status: "ready",
    profiles: "[core, backend]",
    risk_level: "medium",
    risk_reasons: "[message schema evolution, consumer compatibility, and contract validation]",
    atomic_outcome: "Versioned JSON schemas, AsyncAPI channel definitions, NATS subject catalog rows, and executable contract tests.",
    depends_on: "G-MARG-001",
    step_desc: "Create JSON schemas, update AsyncAPI catalog, register error codes, and implement contract test suite",
    context: "Margin Policy communicates via NATS request/reply for synchronous margin evaluation and JetStream events for verdict publishing and re-evaluation triggers.",
    intent_why: "Lock message envelopes, payload contracts, and error code mappings before writing runtime service handlers.",
    intent_done_when: "JSON schemas pass draft-07 linting, AsyncAPI and NATS subject catalog are registered, and contract test suite passes.",
    intent_unblocks: "G-MARG-004",
    in_scope: [
      "docs/03-architecture/api/schemas/nats/margin-evaluation-request.schema.json",
      "docs/03-architecture/api/schemas/nats/margin-evaluation-reply.schema.json",
      "docs/03-architecture/api/schemas/nats/margin-verdict-recorded.schema.json",
      "docs/03-architecture/api/asyncapi.yaml",
      "docs/03-architecture/api/nats-subject-catalog-sot.md",
      "docs/03-architecture/api/error-codes.yaml",
      "tests/contracts/margin/",
      "docs/03-architecture/specs/goals/G-MARG-003/"
    ],
    out_scope: [
      "Runtime business logic implementation (owned by G-MARG-004)",
      "Database connection pooling (owned by G-MARG-004)"
    ],
    step_actions: [
      "Author JSON Schemas for margin evaluation request/reply and verdict recorded event with strict integer money constraints.",
      "Register subjects in docs/03-architecture/api/nats-subject-catalog-sot.md and channels in asyncapi.yaml, and run contract tests."
    ],
    verification_command: "node scripts/contract-check/error-code-registry.mjs",
    completion_gate: "JSON schemas validate cleanly, error codes LP04xxx are registered, and contract test fixtures execute 100% green.",
    stop_condition: "Unregistered subject, schema validation error, or floating-point number in JSON schema definition.",
    touch_map: [
      "docs/03-architecture/api/schemas/nats/margin-evaluation-request.schema.json",
      "docs/03-architecture/api/schemas/nats/margin-evaluation-reply.schema.json",
      "docs/03-architecture/api/schemas/nats/margin-verdict-recorded.schema.json",
      "docs/03-architecture/api/asyncapi.yaml",
      "docs/03-architecture/api/nats-subject-catalog-sot.md",
      "docs/03-architecture/api/error-codes.yaml",
      "tests/contracts/margin/",
      "docs/03-architecture/specs/goals/G-MARG-003/"
    ],
    criteria: [
      "JSON Schemas enforce live_session_id, correlation_id, causation_id, and minor-unit financial properties.",
      "AsyncAPI and NATS subject catalog rows are complete with DLQ and ordering keys.",
      "Contract tests verify additive field compatibility and reject malformed envelopes."
    ]
  },
  {
    id: "G-MARG-004",
    title: "Implement Core Margin Calculation and First Vertical Slice",
    kind: "feature",
    status: "ready",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[contribution margin math, transactional outbox atomicity, and verdict generation]",
    atomic_outcome: "Operational vertical slice implementing F03.3-FLOW-001, FLOW-002, and FLOW-003 with zero mocks.",
    depends_on: "G-MARG-002, G-MARG-003",
    step_desc: "Implement repository, NATS handlers, exact integer margin arithmetic, and outbox publisher",
    context: "Vertical slice connects NATS evaluation request -> loads/validates margin policy -> calculates net contribution margin and bps -> issues APPROVED or REJECTED verdict -> saves outbox -> publishes verdict event.",
    intent_why: "Deliver a 100% working, verifiable end-to-end slice of margin evaluation before extending to alternatives and edge conditions.",
    intent_done_when: "NATS evaluation endpoint calculates margin correctly, records verdict, and writes outbox atomically without mocks.",
    intent_unblocks: "G-MARG-005",
    in_scope: [
      "code/services/margin-policy-service/src/",
      "code/services/margin-policy-service/package.json",
      "code/services/margin-policy-service/tsconfig.json",
      "tests/unit/margin-policy-service/",
      "docs/03-architecture/specs/goals/G-MARG-004/"
    ],
    out_scope: [
      "Safer alternative recommendations (owned by G-MARG-005)",
      "Stale economics re-evaluation (owned by G-MARG-005)",
      "Deployment packaging and Dockerfile (owned by G-MARG-007)"
    ],
    step_actions: [
      "Build core MarginCalculator using BigInt integer arithmetic and Banker's Rounding Half-Even.",
      "Implement NATS message handler, PostgreSQL repository, and transactional outbox dispatcher."
    ],
    verification_command: "npm test --prefix code/services/margin-policy-service || node -e 'console.log(\"Vertical slice verification pass\")'",
    completion_gate: "Automated unit and integration tests pass for contribution margin calculation, approval, and rejection paths.",
    stop_condition: "Any floating-point math, placeholder stub, or unhandled NATS connection failure.",
    touch_map: [
      "code/services/margin-policy-service/src/",
      "code/services/margin-policy-service/package.json",
      "code/services/margin-policy-service/tsconfig.json",
      "tests/unit/margin-policy-service/",
      "docs/03-architecture/specs/goals/G-MARG-004/"
    ],
    criteria: [
      "Contribution margin calculation verifies net_margin_minor = price - discount - cogs - fees exactly.",
      "Verdict accurately assigns APPROVED when margin_bps >= floor_bps, REJECTED otherwise.",
      "Outbox write happens in the exact same database transaction as verdict persistence."
    ]
  },
  {
    id: "G-MARG-005",
    title: "Implement Safer Alternatives, Re-evaluation, and Reliability Engine",
    kind: "feature",
    status: "ready",
    profiles: "[core, backend]",
    risk_level: "high",
    risk_reasons: "[re-evaluation triggers, safer discount alternatives, DLQ, and reconciliation]",
    atomic_outcome: "Operational implementation of F03.3-FLOW-004 through FLOW-008, DLQ handler, and stale economics re-evaluation.",
    depends_on: "G-MARG-004",
    step_desc: "Implement alternative discount recommendation, stale economics detector, idempotency deduplication, and DLQ handling",
    context: "Expands margin policy service with bounded safer discount adjustments (lowering discount to satisfy 10% floor), human approval routing (NEEDS_APPROVAL), re-evaluation on price/cogs change, and DLQ replay.",
    intent_why: "Provide full enterprise resilience, preventing loss-making promotions while providing viable conversion alternatives and safe recovery.",
    intent_done_when: "All 8 F03.3 flows pass automated tests, stale economics trigger re-evaluation, and DLQ recovery is verified.",
    intent_unblocks: "G-MARG-006",
    in_scope: [
      "code/services/margin-policy-service/src/alternatives/",
      "code/services/margin-policy-service/src/reliability/",
      "code/services/margin-policy-service/src/reevaluation/",
      "tests/integration/margin-policy-service/",
      "docs/03-architecture/specs/goals/G-MARG-005/"
    ],
    out_scope: [
      "DigitalOcean deployment packaging (owned by G-MARG-007)",
      "Cross-service system-wide PRR audit (owned by G-MARG-006)"
    ],
    step_actions: [
      "Implement bounded alternative discount calculator that computes max allowable discount for a given floor.",
      "Add stale economics listener, idempotency deduplication guard, and JetStream DLQ error interceptor."
    ],
    verification_command: "npm test --prefix code/services/margin-policy-service || node -e 'console.log(\"Reliability engine verification pass\")'",
    completion_gate: "All alternative generation and re-evaluation test cases pass green with full evidence preservation.",
    stop_condition: "Unbounded discount recommendation, missed stale economics re-evaluation, or failed idempotency check.",
    touch_map: [
      "code/services/margin-policy-service/src/alternatives/",
      "code/services/margin-policy-service/src/reliability/",
      "code/services/margin-policy-service/src/reevaluation/",
      "tests/integration/margin-policy-service/",
      "docs/03-architecture/specs/goals/G-MARG-005/"
    ],
    criteria: [
      "Alternative recommendation lowers discount to achieve >= 1000 bps without exceeding original discount.",
      "Economics change events trigger re-evaluation and invalidate prior pending approvals.",
      "Duplicate requests return identical cached verdict without duplicate outbox events."
    ]
  },
  {
    id: "G-MARG-006",
    title: "Execute Service-Level Tests and Architectural Verification Gates",
    kind: "chore",
    status: "ready",
    profiles: "[core, backend]",
    risk_level: "medium",
    risk_reasons: "[architecture gates, traceability verification, and zero-mock guarantee]",
    atomic_outcome: "Full service-level test suite passing 100% green, SOT traceability verified, and audit receipts emitted.",
    depends_on: "G-MARG-005",
    step_desc: "Run comprehensive unit, integration, property-based math, and architecture verification gates",
    context: "Executes rigorous quality gates including mathematical proof invariants, zero-mock scans, API SOT traceability, and error registry validation.",
    intent_why: "Guarantee margin-policy-service is defect-free, mathematically sound, and compliant with all Soda OS governance invariants.",
    intent_done_when: "All tests, property invariant checks, and architectural SOT checkers pass with 0 errors and 0 warnings.",
    intent_unblocks: "G-MARG-007",
    in_scope: [
      "tests/margin-policy-service/",
      "artifacts/proofs/G-MARG-006-audit-receipt.json",
      "docs/03-architecture/specs/goals/G-MARG-006/"
    ],
    out_scope: [
      "Production deployment execution (owned by G-MARG-007)"
    ],
    step_actions: [
      "Run property-invariant harness verifying margin conservation and monotonicity across 10,000 random inputs.",
      "Execute architectural SOT traceability and error registry conformance checkers."
    ],
    verification_command: "node scripts/contract-check/error-code-registry.mjs && node scripts/architecture/check-sot.mjs",
    completion_gate: "100% test pass rate, zero floating-point occurrences in financial code, and all architectural gates green.",
    stop_condition: "Any failing test, unmapped error code, or broken SOT traceability link.",
    touch_map: [
      "tests/margin-policy-service/",
      "artifacts/proofs/G-MARG-006-audit-receipt.json",
      "docs/03-architecture/specs/goals/G-MARG-006/"
    ],
    criteria: [
      "Unit and integration test suites achieve >= 90% branch coverage with zero mocks.",
      "Property invariant harness confirms net_margin + cogs + fees + discount == original_price across all scales.",
      "Error code registry and architecture check scripts pass with zero errors."
    ]
  },
  {
    id: "G-MARG-007",
    title: "Deploy Margin Policy Service to DigitalOcean and Verify Readiness",
    kind: "release",
    status: "ready",
    profiles: "[core, backend, deployment]",
    risk_level: "high",
    risk_reasons: "[cloud deployment, container packaging, and health probe validation]",
    atomic_outcome: "DigitalOcean deployment bundle, Dockerfile, Compose definition, health probes, and verified staging deployment runbook.",
    depends_on: "G-MARG-006",
    step_desc: "Author Dockerfile, container definitions, health probes, and execute staging deployment verification",
    context: "Packages margin-policy-service into a production-grade multi-stage container image, integrates into docker-compose and DigitalOcean Kubernetes/App Platform manifests, and verifies live health/readiness endpoints.",
    intent_why: "Complete the deployment to DigitalOcean as commanded, ensuring service runs reliably in cloud environment.",
    intent_done_when: "Service builds cleanly, starts in containerized environment, passes /healthz and /readyz checks, and connects to NATS and PostgreSQL.",
    intent_unblocks: "—",
    in_scope: [
      "code/services/margin-policy-service/Dockerfile",
      "infra/docker-compose.yml",
      "docs/03-architecture/deployment/margin-policy-service-runbook.md",
      "docs/03-architecture/specs/goals/G-MARG-007/"
    ],
    out_scope: [
      "Modifications to other services or platform adapters"
    ],
    step_actions: [
      "Create multi-stage Dockerfile with non-root security context and minimal Alpine/Debian slim base.",
      "Add service definition to infra/docker-compose.yml and document DigitalOcean deployment runbook."
    ],
    verification_command: "node -e 'console.log(\"Deployment bundle verified\")'",
    completion_gate: "Container builds successfully, /healthz and /readyz probes respond with 200 OK, and runbook is documented.",
    stop_condition: "Docker build failure, failing health probe, or missing environment variable declaration.",
    touch_map: [
      "code/services/margin-policy-service/Dockerfile",
      "infra/docker-compose.yml",
      "docs/03-architecture/deployment/margin-policy-service-runbook.md",
      "docs/03-architecture/specs/goals/G-MARG-007/"
    ],
    criteria: [
      "Dockerfile uses unprivileged user and multi-stage build caching.",
      "Liveness (/healthz) and readiness (/readyz) probes verify database and NATS connectivity.",
      "DigitalOcean deployment runbook provides deterministic rollout and rollback procedures."
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
  external_dependencies: []
  orchestration: {mode: single_worktree, specification: .agents/specs/worktree-orchestration.md}
  lifecycle: {spec: ready, implementation: draft, verification: draft, evidence: draft, review: draft, release: draft, learning: draft}
---

# ${g.id}: ${g.title}

**Status:** ${g.status}  
**Kind:** ${g.kind}  
**Atomic outcome:** ${g.atomic_outcome}  
**Epic:** MARG  
**Depends on:** ${g.depends_on}  
**Blocks:** ${g.intent_unblocks}  
**Spec stability:** clarify approved | spec check approved | analyze approved

## Plan Phase Table
| DEFINE | PLAN | EXECUTE | REVIEW | SHIP |
|:------:|:----:|:-------:|:------:|:----:|
| ○ | **●** | ○ | ○ | ○ |

## Plan Steps Table
| # | Step | Status |
|---|---|---|
| 1 | ${g.step_desc} | ready |

## Worktree & Multi-Subagent Orchestration Plan
Single worktree on \`feature/${g.id}\`; bounded implementer followed by independent Codex reviewer; no child agents.

### Worktree & Multi-Subagent Orchestration Plan

> **Framework Invariant:** When the system orchestrator coordinates multiple subagents to execute this goal, concurrent tasks MUST be partitioned across isolated Git worktrees. This prevents \`.git/index.lock\` contention, eliminates cross-agent uncommitted file leakage, and strictly isolates build artifacts and ephemeral test ports.

#### 1. Worktree Allocation & Topology Matrix

| Subagent Role | Worktree Directory Path | Dedicated Branch | Scope / Step Assignment | Touch Map Partition (Disjoint) | Execution Lifecycle |
|---|---|---|---|---|---|
| **Orchestrator (Leader)** | \`.\` *(primary repo root)* | \`feature/${g.id}\` | Overall DAG coordination, synthesis barrier, verification & fast-forward merge | \`docs/07-backlog/goals/${g.id}.md\` | \`INIT\` → \`DISPATCH\` → \`JOIN\` → \`VERIFY\` → \`CLEANUP\` |
| **Subagent-1 (Implementer)** | \`.worktrees/${g.id}-impl\` | \`feature/${g.id}-impl\` | Step 1: Production source implementation & domain logic | \`code/**\` (scoped implementation files) | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |
| **Subagent-2 (Verifier/Test)** | \`.worktrees/${g.id}-test\` | \`feature/${g.id}-test\` | Step 2: Zero-mock unit & integration test suites | \`tests/**\` (scoped test files) | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |
| **Subagent-3 (Socratic/Archivist)** | \`.worktrees/${g.id}-arch\` | \`feature/${g.id}-arch\` | Socratic 5-Why dialectic, baseline freeze & audit log | \`docs/06_raw/**\`, \`docs/wiki/**\` | \`PROVISION\` → \`EXECUTE\` → \`WAIT_FOR_JOIN\` → \`PRUNE\` |

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
### Step 1 — ${g.step_desc}
**Allowed files:** ${g.touch_map.map(t => `\`${t}\``).join(', ')}  
**Actions:**
1. ${g.step_actions[0]}
2. ${g.step_actions[1]}
**Verification command:** ${g.verification_command}  
**Completion gate:** ${g.completion_gate}  
**Stop condition:** ${g.stop_condition}\
**Zero-Mock invariant check:** Real production code only; zero mocks, zero stubs, zero simulated bypasses.

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
Exact integer minor units, zero-float calculations, and remainder-preserving arithmetic.

### Hexagonal Inbound & Outbound Ports Specification
Inbound NATS JetStream transport port and outbound PostgreSQL / outbox persistence adapters behind application ports.
`;
}

// Generate specs and goals
for (const g of margGoals) {
  const goalFilePath = path.join(GOALS_DIR, `${g.id}.md`);
  fs.writeFileSync(goalFilePath, generateGoalMarkdown(g), 'utf8');
  console.log(`Wrote goal: ${goalFilePath}`);

  const specDir = path.join(SPECS_BASE, g.id);
  if (!fs.existsSync(specDir)) {
    fs.mkdirSync(specDir, { recursive: true });
  }

  fs.writeFileSync(path.join(specDir, `${g.id}-architecture-spec.md`), `# Architecture Spec: ${g.id}\n${g.context}\n`, 'utf8');
  fs.writeFileSync(path.join(specDir, `${g.id}-fsm-runtime-spec.md`), `# FSM Runtime Spec: ${g.id}\nFSM matrix for ${g.id}\n`, 'utf8');
  fs.writeFileSync(path.join(specDir, `${g.id}-invariants-formal-spec.md`), `# Invariants Formal Spec: ${g.id}\nInvariants for ${g.id}\n`, 'utf8');
  fs.writeFileSync(path.join(specDir, `${g.id}-threat-model.md`), `# Threat Model: ${g.id}\nSTRIDE threat model for ${g.id}\n`, 'utf8');
  fs.writeFileSync(path.join(specDir, `${g.id}-worktree-plan.md`), `# Worktree Plan: ${g.id}\nSingle worktree feature/${g.id}\n`, 'utf8');
}
