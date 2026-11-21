# G-AUDI-004 Pre-Execution Design Specification

## 1. Intent & Architectural Rationale

This specification establishes the authoritative pure domain models for `audit-service`:
1. `AuditReceiptStateMachine`: Pure, deterministic finite state machine (reducer) governing the lifecycle transitions of audit receipts (`audit.receipt.livepilot.v1`).
2. `AuditRedactionFilter`: Pure, recursive redaction engine scrubbing credentials, Bearer tokens, API keys, secrets, COGS/cost/margin financials, and credit card numbers from evidence payloads before cryptographic hashing and ledger persistence.

Enforcing these invariants at the pure domain layer with zero external dependencies (zero database I/O, zero network calls, zero mock objects) guarantees that audit receipts cannot bypass validation, cannot skip redaction or cryptographic hashing before commit, and cannot leak sensitive secrets or raw financial margins into the immutable audit ledger.

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Enforce the 7 canonical audit receipt states: `received`, `validated`, `redacted`, `hashed`, `committed`, `failed`, `dead_lettered`.
  - Enforce canonical forward transitions: `received -> VALIDATE -> validated -> REDACT -> redacted -> HASH -> hashed -> COMMIT -> committed`.
  - Enforce failure transitions: any active state (`received`, `validated`, `redacted`, `hashed`) -> `FAIL` -> `failed` -> `DEAD_LETTER` -> `dead_lettered`.
  - Provide typed error handling with `IllegalAuditTransitionError` and `InvalidAuditContextError`.
  - Guarantee monotonic state progression and strictly absorbing terminal states (`committed` and `dead_lettered`).
  - Enforce zero-float integer timestamp context (`occurredAtMs`, `transitionedAtMs`, `attempt`).
  - Implement recursive redaction scrubbing key patterns (`password`, `token`, `secret`, `authorization`, `api_key`, `credentials`, `cogs`, `cost`, `margin_rate`, `credit_card`) and string patterns (Bearer tokens, credit card numbers) with `[REDACTED]`.
  - Provide pure, immutable transformations that never mutate input objects.

- **Non-Goals / Anti-Goals:**
  - Persisting receipts to PostgreSQL or managing outbox tables (owned by `G-AUDI-005`).
  - Consuming or publishing NATS JetStream messages (owned by `G-AUDI-005`).
  - Defining or verifying Merkle tree aggregation across batches (owned by `G-AUDI-006`).
  - Relaxing redaction filters or allowing unmasked credentials into downstream stores.

## 3. Approaches Considered & Rejected Alternatives

1. **State mutation via mutable active record model (Rejected):**
   Mutable state objects risk concurrent race conditions, unpredictable side effects, and loss of historical audit integrity.
2. **Ad-hoc regex string scrubbing on serialized JSON strings (Rejected):**
   String-level regex search-and-replace risks corrupting valid JSON syntax, escaping errors, and false positives/negatives in deeply nested structures.
3. **Pure functional reducers with recursive object sanitization (Selected):**
   Pure domain reducers accept an explicit state and event, returning a frozen, typed transition result. The redaction filter recursively traverses objects and arrays, identifying sensitive keys (case-insensitive and delimited) and value patterns while preserving exact payload schema structure and non-sensitive fields.

## 4. Selected Approach & Trade-off Analysis

The chosen design isolates the state machine into pure transition tables and rank checks, providing $O(1)$ lookup guarantees and mathematical monotonicity ($V(\text{next}) > V(\text{current})$). Redaction traverses arbitrary nested structures recursively with cyclic reference protection, replacing sensitive key values and matching secret patterns with `[REDACTED]`. This trades trivial CPU cycles during ingestion for fail-closed security and audit-grade regulatory compliance (PDPA, GDPR, PCI-DSS).

## 5. Bounded Context & Touch Map Invariants

All changes are strictly confined to the declared touch map:
- `code/services/audit-service/src/domain/`
- `code/services/audit-service/test/unit/`
- `code/services/audit-service/package.json`
- `docs/03-architecture/specs/goals/G-AUDI-004/`
- `docs/07-backlog/goals/G-AUDI-004.md`

## 6. Acceptance Test & TDD Verification Strategy

- Exhaustive matrix coverage testing all $7 \times 6 = 42$ combinations of `(AuditState, AuditEvent)`.
- Rejection of backward, skipping, and invalid transitions throwing `IllegalAuditTransitionError`.
- Terminal absorbing state tests ensuring no event can transition out of `committed` or `dead_lettered`.
- Redaction verification for case-insensitivity, substring matches (e.g., `user_password`, `auth_token`, `apiKey`, `clientSecret`), financial values (`cogs`, `unit_cost`, `margin_rate`), and inline pattern values (Bearer tokens, 16-digit credit cards).
- Zero-float integer validation for epoch timestamps and retry attempt numbers.
- Automated verification commands:
  ```bash
  npm --prefix code/services/audit-service test:unit
  node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-AUDI-004.md
  ```

## 7. Operational Readiness & Threat Model Considerations

- **Fail-Closed Principle:** Any unhandled transition, corrupt context, or unrecognized state halts with an explicit typed error.
- **Zero Data Leakage:** Redaction operates prior to payload hashing, guaranteeing that sensitive credentials never enter hash fingerprints or persistent storage.
- **Audit Lineage:** Transition results include exact integer millisecond timestamps, attempt counts, and failure codes, enabling complete forensic replay.
