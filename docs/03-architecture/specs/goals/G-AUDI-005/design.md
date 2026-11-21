# G-AUDI-005 Pre-Execution Design Specification: Audit Ingestion Vertical Slice

## 1. Intent & Architectural Rationale

This specification establishes the end-to-end audit receipt ingestion vertical slice for `audit-service`:
1. `AuditRecordRepository`: Implements atomic persistence across PostgreSQL tables (`audit.audit_records`, `audit.audit_inbox`, and `audit.audit_outbox`) enforcing Row-Level Security (`tenant_id`), sequential monotonic sequence indexing, and cryptographic SHA-256 hash chaining.
2. `AuditAppendService`: Ingestion coordinator for command `livepilot.v1.audit.receipt.append` enforcing mandatory envelope transport headers (`Nats-Msg-Id`, `X-Correlation-Id`, `X-Idempotency-Key`, `X-Tenant-Id`, `X-Session-Id`, `X-Schema-Version`, `X-Producer`, `X-Traceparent`), domain FSM transitions (`received` -> `validated` -> `redacted` -> `hashed` -> `committed`), sensitive data scrubbing via `AuditRedactionFilter`, atomic persistence, and outbox event publishing (`livepilot.v1.audit.receipt.recorded`).

Enforcing this vertical slice connects the NATS broker transport boundary directly to the tamper-evident PostgreSQL ledger, guaranteeing that audit receipts cannot be mutated, deleted, or fabricated out of order.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Ingest `livepilot.v1.audit.receipt.append` commands from owning services.
  - Enforce mandatory transport headers: `Nats-Msg-Id`, `X-Correlation-Id`, `X-Idempotency-Key`, `X-Tenant-Id`, `X-Session-Id`, `X-Schema-Version`, `X-Producer`, `X-Traceparent`.
  - Validate payload schema: `receipt_id` (8-128 chars), `aggregate_id` (1-128 chars), `actor_ref` (nullable string), `result` (one of `accepted`, `rejected`, `failed`, `unknown`, `reconciled`), and `policy_revision` (1-64 chars).
  - Execute canonical `AuditReceiptStateMachine` lifecycle: `received` -> `validated` -> `redacted` -> `hashed` -> `committed`.
  - Deeply sanitize evidence and payload using `AuditRedactionFilter` before computing hash or persisting.
  - Compute cryptographic hash chain: `record_hash = sha256(prev_record_hash + receipt_id + result + policy_revision + payload_str)`.
  - Deduplicate idempotently using `(tenant_id, receipt_id)` and `(tenant_id, idempotency_key)` returning existing committed record safely without double-appending.
  - Publish outbox fact `livepilot.v1.audit.receipt.recorded` within the same atomic transaction.
  - Enforce strict Ack-After-Commit invariant (calling `msg.ack()` only after the commit completes; calling `msg.nak()` on errors).

- **Non-Goals / Anti-Goals:**
  - Query projections and HTTP read routes (owned by `G-AUDI-006`).
  - Production containerization and Kubernetes manifests (owned by `G-AUDI-008`).
  - Merkle tree cross-tenant verification bundles (owned by `G-AUDI-007`).
  - Permitting unredacted credentials or raw margins into ledger storage.

## 3. Approaches Considered & Rejected Alternatives

1. **Non-transactional, asynchronous outbox publishing (Rejected):**
   Publishing outbox events after database commit without transaction isolation risks silent message loss during process crashes.
2. **Direct unchained append (Rejected):**
   Appending audit records without cryptographic hash chaining allows undetectable database tampering or unauthorized row modification.
3. **Atomic dual-write with transactional inbox/outbox and hash chaining (Selected):**
   Enforces ACID transaction atomicity where `audit_inbox` deduplication, `audit_records` hash chain append, and `audit_outbox` event insertion succeed or roll back together.

## 4. Selected Approach & Trade-off Analysis

The selected architecture combines:
- In-memory and SQL-compatible repository interfaces with zero mocks, ensuring full operational fidelity in both isolated integration testing and production database execution.
- Monotonic SHA-256 hash chaining where each tenant maintains an isolated sequence $(s_0, s_1, \dots)$ and hash chain $(h_0, h_1, \dots)$ with genesis hash `0000000000000000000000000000000000000000000000000000000000000000`.
- Recursive payload redaction executed prior to cryptographic hashing, guaranteeing zero sensitive credential leakage into ledger fingerprints.

## 5. Bounded Context & Touch Map Invariants

All changes are strictly confined to the declared touch map:
- `code/services/audit-service/src/application/`
- `code/services/audit-service/src/infrastructure/`
- `code/services/audit-service/test/integration/`
- `code/services/audit-service/package.json`
- `docs/03-architecture/specs/goals/G-AUDI-005/`
- `docs/07-backlog/goals/G-AUDI-005.md`

## 6. Acceptance Test & TDD Verification Strategy

Integration test suite under `code/services/audit-service/test/integration/audit-append.service.spec.ts` verifies:
- End-to-end receipt append and transition to `committed`.
- Monotonic sequence numbering and cryptographic hash chain linkage (`rec[i].prev_record_hash === rec[i-1].record_hash`).
- Idempotent deduplication on identical receipt or idempotency key returning existing committed record without creating new records.
- Secret and margin redaction before hashing and outbox publishing.
- Fail-closed validation rejecting invalid schemas or missing headers with negative acknowledgement (`nak`).

Automated verification command:
```bash
npm --prefix code/services/audit-service test:integration && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-AUDI-005.md
```

## 7. Operational Readiness & Threat Model Considerations

- **Fail-Closed Principle:** Any envelope validation violation, corrupt context, or database collision halts fail-closed and calls `msg.nak()`.
- **Zero-Mutation Invariant:** Audit records are strictly append-only; updates and deletions are prohibited.
- **Tenant Isolation:** All operations enforce `tenant_id` scope isolation matching database Row-Level Security policies.
