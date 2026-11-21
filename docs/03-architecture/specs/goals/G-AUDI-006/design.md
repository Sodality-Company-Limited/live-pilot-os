# G-AUDI-006 Pre-Execution Design Specification: Audit Query Projection & DLQ Recovery

## 1. Intent & Architectural Rationale

This specification establishes the query projection and dead-letter recovery layer for `audit-service`:
1. `ActionLogQueryService`: Provides operator-visible, immutable action and audit timeline projections (`GET /v1/live-sessions/{session_id}/actions` / `livepilot.v1.audit.action_log.query`). The projection is strictly scoped by `tenant_id` and `session_id`, supports cursor and offset pagination, orders records chronologically (newest first), and enforces a zero-leakage redaction guarantee (stripping sensitive auth tokens, passwords, credit card PANs, supplier costs, and COGS margins).
2. `AuditDlqPublisher`: Implements fail-closed dead-letter queue routing to `livepilot.v1.audit.receipt.dlq`. When audit commands exhaust 5 retries or encounter non-retryable poison payload validation errors, messages are routed to the DLQ preserving the original transport envelope, attempt counter, error code `LP13005` (`AUDIT_DLQ_ROUTED`), failure reason, and state machine transition (`failed` -> `dead_lettered`).
3. Authorized Replay: Provides operator-authorized replay mechanics requiring explicit operator identity, authorization token (`op_auth_*`), and justification reason, generating a unique `replay_id` and re-ingesting through the append pipeline without compromising ledger integrity.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Query audit records by `(tenant_id, session_id)` with cursor-based and limit-offset pagination.
  - Return standardized OpenAPI `ActionReceipt` items within `ActionLogPage`.
  - Assert zero credential leakage in query projections via `AuditRedactionFilter`.
  - Route exhausted or poisoned audit ingestion commands to `livepilot.v1.audit.receipt.dlq`.
  - Attach standardized error code `LP13005` and failure metadata to DLQ envelopes.
  - Advance `AuditReceiptStateMachine` to `dead_lettered` terminal state upon DLQ routing.
  - Implement operator-authorized replay creating new `replay_id` audit lineages.
  - Maintain 100% operational fidelity with zero mocks, stubs, or placeholders.

- **Non-Goals / Anti-Goals:**
  - Cross-tenant Merkle tree state proofs (owned by `G-AUDI-007`).
  - Production container packaging and Kubernetes deployments (owned by `G-AUDI-008`).
  - Unredacted financial or secret projections into public/operator APIs.
  - Permitting unauthenticated or unauthorized replay executions.

## 3. Approaches Considered & Rejected Alternatives

1. **Direct database querying from API gateway (Rejected):**
   Allowing API gateways to query raw database tables bypasses redaction filters and tenant isolation logic, risking credential and margin leakage.
2. **Dropping exhausted messages silently (Rejected):**
   Silent drop of failed audit receipts violates non-repudiation and immutable ledger invariants.
3. **Dedicated Query Projection Service with DLQ Publisher & Authorized Replay (Selected):**
   Encapsulates read projections behind domain redaction invariants, and handles dead letters via standardized subjects (`livepilot.v1.audit.receipt.dlq`) and operator-controlled replay.

## 4. Selected Approach & Trade-off Analysis

The selected architecture provides:
- Bounded cursor pagination: Uses record timestamps and sequence numbers to provide stable forward pagination without SQL offset drift.
- Recursive redaction assertion: Every query result undergoes runtime validation confirming that sensitive keys and pattern matches are scrubbed.
- Replay audit lineage: Replay does not overwrite historical failure records; instead, it generates a fresh trace (`X-Replay-Id`, `X-Replayed-By`, `X-Replayed-At`) preserving immutable forensic history.

## 5. Bounded Context & Touch Map Invariants

All changes are strictly bounded within:
- `code/services/audit-service/src/application/action-log-query.service.ts`
- `code/services/audit-service/src/infrastructure/audit-dlq.publisher.ts`
- `code/services/audit-service/src/infrastructure/audit-record.repository.ts`
- `code/services/audit-service/test/e2e/audit-query-dlq.spec.ts`
- `code/services/audit-service/package.json`
- `docs/03-architecture/specs/goals/G-AUDI-006/design.md`
- `docs/07-backlog/goals/G-AUDI-006.md`

## 6. Acceptance Test & TDD Verification Strategy

End-to-end verification under `code/services/audit-service/test/e2e/audit-query-dlq.spec.ts` covers:
- Session-scoped query projection with cursor pagination and newest-first ordering.
- Multi-tenant isolation ensuring Tenant A cannot observe Tenant B audit entries.
- Redaction verification confirming secrets, Bearer tokens, and COGS are masked.
- Routing poison payloads to DLQ with error code `LP13005` and envelope preservation.
- Operator authorization enforcement for replay, rejecting unauthorized attempts.
- Successful replay and re-ingestion into the audit ledger repository.

Automated verification command:
```bash
npm --prefix code/services/audit-service test:e2e && node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-AUDI-006.md
```

## 7. Operational Readiness & Threat Model Considerations

- **Privilege Separation:** Read projections are restricted to callers with audit read capability. Replay requires dedicated operational privileges.
- **Fail-Closed Security:** Corrupted cursors, missing tenant IDs, or unauthorized replay tokens halt execution immediately with fail-closed errors.
- **Audit Traceability:** Replayed actions reference their origin and operator identity, preventing untracked out-of-band ledger mutations.
