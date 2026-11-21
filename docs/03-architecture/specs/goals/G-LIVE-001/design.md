# G-LIVE-001 Design Specification

## Intent & Architectural Rationale

Freeze the live-session service contract, state machine, JSON schema, and subject catalog SOT so downstream service implementation (PostgreSQL persistence, NestJS domain, and outbox handlers) consume stable, server-authoritative command and event contracts. The contract enforces tenant/session isolation, monotonic version progression, strict FSM reachability, idempotency, audit lineage, and fail-closed validation.

## Goals, Non-Goals & Anti-Goals

### Goals

- Formally define the session lifecycle contract (`session.lifecycle.livepilot.v1`) with canonical states (`created`, `active`, `paused`, `ended`) and permitted transitions.
- Validate and enforce the NATS JSON Schema Draft 2020-12 payload contract (`session-lifecycle.schema.json`).
- Verify subject mapping and DLQ semantics in `nats-subject-catalog-sot.md` and `coverage.yaml`.
- Guarantee zero-mock compliance and strict boundary isolation.

### Non-goals

- PostgreSQL schema migrations and table creation (deferred to G-LIVE-002).
- NestJS application module and domain handler implementation (deferred to G-LIVE-003).
- UI/Portal BFF integration or external streaming adapter mutations.

### Anti-goals

- Permitting unauthorized or cross-tenant session state mutations.
- Allowing transitions out of terminal `ended` state.
- Incurring silent failures or treating timeouts as inferred success.

## Approaches Considered & Rejected Alternatives

1. **Permissive generic command envelope**: Rejected because dynamic schema payloads permit invalid transition parameters, missing version checks, and schema drift across services.
2. **REST-only HTTP boundary**: Rejected because asynchronous NATS JetStream messaging provides guaranteed at-least-once delivery, transactional outbox decoupling, and audit durability required for high-throughput live sessions.
3. **Dedicated strict JSON Schema and versioned command contract**: Selected approach. Enforces closed property schemas, integer monotonic versions, and enum-bounded operations.

## Selected Approach & Trade-off Analysis

Adopt standard JSON Schema Draft 2020-12 payload definition bound to private NATS JetStream subject `livepilot.v1.session.lifecycle.request` with ordering key `session_id`. Required transport headers validate tenant, session, mode, and trace continuity. Trade-off involves slight transport header redundancy in exchange for strict server-authoritative protocol validation.

## Bounded Context & Touch Map Invariants

- Owner is `session-service`; no other service writes session aggregate state.
- Allowed touch map is strictly confined to contract, schema, catalog SOT, and flow coverage records.
- Canonical state machine: `created → active → paused → ended` with terminal `ended`.
- Every transition validates `expected_version` and atomically advances version state.

## Acceptance Test & TDD Verification Strategy

- Automated validation of JSON Schema structure and integrity (`shasum -a 256`).
- Traceability gate execution via `node scripts/api/check-api-sot-traceability.mjs`.
- Error code registry verification via `node scripts/contract-check/error-code-registry.mjs`.
- Template conformance harness check via `node scripts/harness/goal-template-conformance-harness.mjs`.
