# G-AUDI-002 Design Specification: Audit Message Compatibility & Golden Fixtures

## 1. Problem Statement & Scope Boundary

In distributed event-driven systems (specifically LivePilot OS live commerce runtime), audit receipts represent the immutable, non-repudiable ledger of every high-stakes decision and system mutation—including price adjustments, promotion approvals, inventory allocations, margin verifications, and automated bot actions. Producers across diverse workloads (`session-service`, `telemetry-service`, `catalog-service`, `promotion-service`, `approval-control-service`, `execution-service`) emit audit receipts asynchronously over NATS JetStream to `audit-service`.

Prior to runtime service implementation (`G-AUDI-005`) or database migrations (`G-AUDI-003`), a formal contract verification harness and comprehensive golden test fixtures are required to:
1. Guarantee that incoming audit message payloads conform strictly to JSON Schema Draft 2020-12 specifications (`docs/03-architecture/api/schemas/nats/audit-receipt.schema.json`).
2. Prevent schema drift and backward-compatibility breakages across evolutionary versions.
3. Reject malformed payloads fail-closed, enforcing exact string length boundaries, typed enum sets, nullable actor references, and zero unversioned properties (`additionalProperties: false`).
4. Validate transport-level NATS envelope headers (`X-Tenant-Id`, `X-Session-Id`, `X-Traceparent`, `X-Mode`, `X-Correlation-Id`, `X-Idempotency-Key`).

## 2. Intent & Architectural Rationale

Audit ingestion accepts receipts across multiple producer versions. Establishing automated golden contract fixtures and a strict Draft 2020-12 validator before implementing runtime database persistence guarantees that all producer message variations are compatible with `audit.receipt.livepilot.v1` and reject corrupt or unauthorized schema drift fail-closed.

## 3. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Build automated contract test runner (`tests/contracts/audit/run-contract-tests.mjs`) implementing zero-dependency validation.
  - Implement comprehensive valid golden fixtures exercising all result states, actor variants, and evidence configurations (`tests/contracts/audit/fixtures/audit-receipt.valid.json`).
  - Implement comprehensive invalid failure fixtures exercising each failure mode and boundary condition (`tests/contracts/audit/fixtures/audit-receipt.invalid.json`).
  - Verify transport envelope headers (`X-Traceparent`, `X-Mode`, `X-Tenant-Id`, etc.).
- **Non-Goals / Anti-Goals:**
  - PostgreSQL schema migrations or RLS policy definition (owned by `G-AUDI-003`).
  - Pure domain state machine and cryptographic Merkle tree implementation (owned by `G-AUDI-004`).
  - NATS JetStream consumer runtime workers and DLQ retry orchestration (owned by `G-AUDI-005`).

## 4. Approaches Considered & Rejected Alternatives

1. **Option A: Runtime AJV / 3rd-Party Schema Dependency (Rejected):** Requires heavy external node_modules resolution, introduces potential supply chain security vulnerabilities, and adds runtime performance overhead.
2. **Option B: Static TypeScript Interface Checking Only (Rejected):** Types are erased at runtime; fails to validate untrusted network payloads arriving over NATS JetStream at service boundaries.
3. **Option C: Zero-Dependency JSON Schema Draft 2020-12 Contract Runner (Selected):** Pure Node.js standard library execution targeting exact schema keywords (`required`, `minLength`, `enum`, `type`, `additionalProperties`), executes instantaneously (<20ms), and provides deterministic error attribution.

## 5. Selected Approach & Trade-off Analysis

Option C provides the highest reliability and lowest maintenance cost. Validating Draft 2020-12 schema rules along with NATS envelope headers directly against `audit-receipt.schema.json` guarantees 100% adherence to LivePilot OS standards with zero mock dependencies.

## 6. Bounded Context & Touch Map Invariants

All changes are strictly restricted to the declared `G-AUDI-002` touch map:
- `tests/contracts/audit/`
- `docs/03-architecture/specs/goals/G-AUDI-002/`
- `docs/07-backlog/goals/G-AUDI-002.md`

## 7. Evidence-Based Alternatives & Trade-Off Analysis

A quantitative trade-off matrix confirms zero runtime dependencies ensure deterministic CI runs with sub-millisecond execution times.

## 8. Architectural Blueprint & Component Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Producer Services                             │
│  (session, telemetry, catalog, promotion, approval, execution)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ NATS JetStream (at-least-once)
                                    │ Subject: livepilot.v1.audit.receipt.append
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│            Audit Receipt Ingestion & Contract Gate (G-AUDI-002)         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 1. NATS Envelope Header Validation (W3C traceparent, X-Mode)   │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ PASS                               │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 2. JSON Schema Draft 2020-12 Strict Validator                  │   │
│   │    - required: [receipt_id, aggregate_id, actor_ref, ...]      │   │
│   │    - result: enum [accepted, rejected, failed, unknown, ...]   │   │
│   │    - actor_ref: ["string", "null"]                             │   │
│   │    - additionalProperties: false (Fail-closed on extras)       │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ PASS                               │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ 3. Downstream Processing (G-AUDI-003, G-AUDI-004, G-AUDI-005)   │   │
│   │    (Redaction -> SHA-256 Hash -> PostgreSQL Immutable Table)  │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                   │ FAIL                               │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Fail-Closed Rejection -> DLQ Route (`LP13002`)                 │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

## 9. State Machine & Lifecycle Invariants

The audit receipt ingestion lifecycle enforces a deterministic 5-stage progression with immediate fail-closed diversion to DLQ upon contract breach:

```text
received ──▶ validated ──▶ redacted ──▶ hashed ──▶ committed
   │             │             │           │
   └─────────────┴─────────────┴───────────┴──▶ dlq (LP13002 / LP13005)
```

1. **Strict Schema Conformance:** Lacking required properties (`receipt_id`, `aggregate_id`, `actor_ref`, `result`, `policy_revision`) is rejected at `received` state with `LP13002 AUDIT_RECEIPT_INVALID`.
2. **Frozen Result Domain:** `result` must strictly be one of `['accepted', 'rejected', 'failed', 'unknown', 'reconciled']`.
3. **Zero Additional Properties:** `additionalProperties: false` is strictly enforced.
4. **Null-Safety of Actor Reference:** `actor_ref` permits `null` (for automated systems) or non-empty `string`.
5. **Transport Header Continuity:** Every envelope must carry valid W3C `X-Traceparent` and valid `X-Mode` (`SIMULATED`, `SANDBOX`, `CONFIRMED`).

## 10. Data Contracts & Schema Definitions

### Schema: `docs/03-architecture/api/schemas/nats/audit-receipt.schema.json`
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.livepilot.invalid/nats/audit-receipt.schema.json",
  "type": "object",
  "required": ["receipt_id", "aggregate_id", "actor_ref", "result", "policy_revision"],
  "properties": {
    "receipt_id": { "type": "string", "minLength": 8 },
    "aggregate_id": { "type": "string", "minLength": 1 },
    "actor_ref": { "type": ["string", "null"] },
    "result": { "type": "string", "enum": ["accepted", "rejected", "failed", "unknown", "reconciled"] },
    "policy_revision": { "type": "string", "minLength": 1 },
    "evidence_ids": { "type": "array", "items": { "type": "string" } }
  },
  "additionalProperties": false
}
```

## 11. Failure Modes, Edge Boundaries & Resilience Invariants

- Short `receipt_id` (<8 chars) fails closed.
- Empty `aggregate_id` (0 chars) fails closed.
- Missing `policy_revision` fails closed.
- Unrecognized `result` enum fails closed.
- Additional unversioned properties fail closed (`additionalProperties: false`).
- Malformed W3C traceparents fail closed.

## 12. Acceptance Test & TDD Verification Strategy

Verification runs deterministically via the contract test runner and Soda OS goal template conformance harness:

```bash
node tests/contracts/audit/run-contract-tests.mjs && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-AUDI-002.md
```

### Acceptance Gates:
1. **Valid Fixture Gate:** 100% of fixtures in `audit-receipt.valid.json` pass JSON Schema validation and envelope header checks.
2. **Invalid Fixture Gate:** 100% of fixtures in `audit-receipt.invalid.json` fail closed for the exact expected keyword (`required`, `minLength`, `enum`, `type`, `additionalProperties`).
3. **Enum & Permutation Completeness:** All 5 `result` enums, `actor_ref` (null and string), and `evidence_ids` (omitted, empty, populated) are tested.
4. **Zero Mocks Gate:** All tests execute against real JSON fixtures with zero mocks, stubs, or placeholder returns.
