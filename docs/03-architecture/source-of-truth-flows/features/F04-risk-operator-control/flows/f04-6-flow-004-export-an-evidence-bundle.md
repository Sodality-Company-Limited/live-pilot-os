# F04.6-FLOW-004 — Export an evidence bundle

> Flow-level Source of Truth for Feature F04. Linked from the F04 index and based on the LivePilot flow SOT template.

## Machine-readable contract coverage

| Source | Link | Coverage |
|---|---|---|
| BRD | [BR-F04-021](../../../../../02-product/brd/feature-04-risk-screening-operator-control.md) | Business requirement |
| BDD | [F04.6-FLOW-004](../../../../../02-product/bdd/feature-04-risk-operator-control.md) | Behavioral scenario |
| Feature index | [F04 index](../index.md) | Parent scope |
| Architecture | [overview.md](../../../../overview.md) | UI → Portal BFF → KrakenD → Core BFF |
| Deep context | [deep context](../../../../live-pilot-os-deep-context.md) | JEV, NATS, safety, nodes |

Status: detailed baseline. Control routes, subjects, role vocabulary, pause propagation, and adapter evidence require approval and executable tests.

## Purpose, actors, and scope

Implement Export an evidence bundle in the Execution Audit control-plane bounded context.

| Contract fact | Definition |
|---|---|
| Actor | authorized operator/host or internal control service |
| Input | typed flow input, live_session_id, actor capability, correlation, causation |
| Output | typed result, status, revision, evidence, and audit receipt |
| Owner | audit-service |
| Event | audit.execution.updated.v1 |

F04 applies this control rule: append decision receipts, link causation/correlation, prevent duplicate effects, export evidence, and rebuild projections. It does not own catalog, margin, inventory, raw telemetry, host guidance, or platform credentials.

## Shared boundary

UI → Portal BFF → KrakenD → Core BFF → NATS → Control Service → PostgreSQL/outbox → F03/F01/Adapter/Audit

| Node | Contract | Limit |
|---|---|---|
| UI | Render risk/control/audit state and blocked/degraded status | Never authorizes by hiding controls |
| Portal BFF | Validate session, actor, DTO, locale, idempotency | Never owns control truth |
| KrakenD | Authenticate, rate-limit, route, preserve correlation | Never implements risk/pause policy |
| Core BFF | Orchestrate command/query and map safe errors | Never becomes second writer |
| Service | Apply append decision receipts, link causation/correlation, prevent duplicate effects, export evidence, and rebuild projections | Owns this control fact only |
| Event/Audit | Durable receipt, propagation, replay, evidence | Must not hide partial/unknown delivery |

## Aggregate and lifecycle

| Fact | Contract |
|---|---|
| Parent | live_session_id plus control/approval/risk/command ID |
| Source of truth | Control aggregate plus append-only audit receipt |
| Event | audit.execution.updated.v1 |
| Consumers | Compliance, operations, learning loop |

RECEIVED → AUTHORIZED → EVALUATED → COMMITTED → PROPAGATED → OBSERVED

Failure path: REJECTED, EXPIRED, BLOCKED, or UNKNOWN → RECONCILING.

Guards: server-side capability, session scope, policy version, control revision, idempotency, and redaction. UI state is not proof of authorization or propagation.

## Frontend contract

- Show actor, severity/mode, revision, freshness, propagation state, evidence, and safe recovery action.
- Emergency Pause and CRITICAL risk are visually and semantically distinct.
- Unauthorized requests receive typed denial; UI hiding is not authorization.
- Never expose tokens, raw PII, COGS, credentials, or unredacted provider errors.
- Support keyboard/focus-safe controls, screen-reader status, and Thai/English locale.

## Backend contract

### Portal BFF

- Validate live_session_id, actor capability, control ID, idempotency, locale, policy revision, and pause state.
- Shape safe operator DTOs and preserve correlation, causation, revision, severity/mode, propagation, and evidence metadata.
- Do not decide risk, approve its own request, call adapters, or write audit rows directly.

### KrakenD

- Authenticate, rate-limit, route, preserve correlation/idempotency, and reject malformed input.
- Do not retry control commands without a stable key or implement control semantics.

### Core BFF

- Map UI actions to versioned NATS request/reply and JetStream facts.
- Return committed, blocked, rejected, expired, unknown, or reconciling explicitly.
- Keep control-plane responsibility separate from F03 domain ownership.

## Microservice contract

### Owner: audit-service

| Responsibility | Contract |
|---|---|
| Validate | session, actor, role/capability, policy, revision, schema, idempotency |
| Process | append decision receipts, link causation/correlation, prevent duplicate effects, export evidence, and rebuild projections |
| Persist | typed control result, actor evidence, policy/model version, revision |
| Publish | audit.execution.updated.v1 with correlation, causation, producer, schema version |
| Replay | deterministic state from append-only receipts |
| Security | fail closed on missing capability, redaction, pause, or evidence |

Event fields: event_id, event_type, occurred_at, live_session_id, control_id, actor_ref, correlation_id, causation_id, schema_version, producer, idempotency_key, policy_version, redacted_evidence_ids, propagation.

## Safety, idempotency, and privacy

- Control state is append-only or revisioned; corrections are new receipts, never overwrites.
- Same key and fingerprint is a safe replay; mismatch is a conflict.
- CRITICAL risk and active Emergency Pause block consequential commands.
- Safe telemetry, reconciliation, and logging continue while paused.
- Credentials remain inside adapter boundaries and never enter UI/events/logs.
- Evidence is redacted while hashes and metadata preserve explainability.

## Errors and recovery

| Error | Retry | Expected behavior |
|---|---|---|
| AUDIT_WRITE_FAILED | no unless input changes | reject/block with no unsafe mutation |
| HASH_MISMATCH | bounded with same key | retry only when safe |
| EVIDENCE_EXPORT_FAILED | no blind retry | blocked/expired/reconcile/dead-letter |
| propagation timeout | reconcile | do not claim all consumers updated |
| NATS/DB outage | bounded | no success without durable receipt |
| unauthorized/unsafe resume | no | deny and preserve audit evidence |

## Sequence and verification

Operator UI → Portal BFF → KrakenD → Core BFF → NATS request/reply → Control Service → Policy/Approval → JetStream → Audit → F03/F01/Adapter consumers.

| Verification | Evidence |
|---|---|
| Authorization | forged/missing capability rejected before state mutation |
| Pause/risk | CRITICAL/pause blocks consequence and preserves safe logging |
| Idempotency | repeated command/approval/escalation creates one effect |
| Propagation | consumers acknowledge or remain explicitly unknown |
| Redaction | secrets/tokens/raw PII/COGS absent from operator DTO |
| Audit | actor, policy, event, correlation, causation, status linked |
| Replay | append-only receipts rebuild projection deterministically |

## Flow-specific detail

### BDD Given / When / Then

- **Given:** an operator or support workflow requests an investigation   **When:** the evidence bundle is generated   **Then:** it contains the relevant event chain, policy verdicts, actions, responses, and redacted payload references.
- **When:** The flow receives its typed command or event through the approved session-scoped boundary.
- **Then:** The owner service commits the typed result, publishes the versioned event, and records the audit evidence only after guards pass.

### Request contract

| Field | Required | Contract |
|---|---:|---|
| live_session_id | yes | Authorized session scope; never inferred from UI route |
| actor_ref / capability | conditional | Required for operator/host actions; server-side checked |
| aggregate_id | conditional | Proposal, risk, approval, command, or audit subject |
| correlation_id | yes | Stable across the full decision chain |
| causation_id | yes for derived events | Direct parent event/command |
| idempotency_key | yes for commands | Same key and fingerprint is a safe replay |
| policy_version | conditional | Exact policy/model revision used for the result |
| evidence_refs | yes for consequential result | Redacted source IDs/hashes and freshness |

### Flow-specific state transition

| Step | Guard | Durable result | Failure path |
|---|---|---|---|
| Receive | schema, session, actor, correlation | received receipt | INVALID_CONTRACT |
| Authorize/evaluate | capability, policy, risk/pause/mode | evaluated verdict | FORBIDDEN or POLICY_UNAVAILABLE |
| Commit | revision and idempotency constraints | aggregate + outbox commit | CONFLICT or IDEMPOTENCY_PAYLOAD_MISMATCH |
| Propagate/reconcile | consumer/adapter acknowledgement | observed or explicit unknown | PROPAGATION_TIMEOUT / OUTCOME_UNKNOWN |
| Audit | redaction and lineage complete | append-only receipt | AUDIT_WRITE_FAILED |

### Flow-specific consumers and invariants

- Direct owner: the microservice named in the contract above; no second writer is allowed.
- Downstream consumers: the feature index group consumers plus audit and operations.
- Active Emergency Pause or CRITICAL policy state blocks consequential mutation.
- Unknown, stale, or missing state is explicit and cannot be treated as success.
- Corrections append a new receipt; original evidence is immutable.
- Any external command keeps the same idempotency key through retry and reconciliation.

### Flow-specific acceptance tests

1. Valid session and authorized actor produce exactly one committed result and one event.
2. Wrong session, missing capability, malformed payload, or stale revision produces no unsafe mutation.
3. Duplicate command/event returns the original receipt without a second effect.
4. NATS/DB/adapter failure produces typed retry, reconcile, or dead-letter behavior.
5. The audit receipt links actor, policy/model version, evidence, correlation, causation, and outcome.
6. UI/HTTP payload contains no credential, token, raw PII, COGS, or protected provider error.

## Definition of Done

- append decision receipts, link causation/correlation, prevent duplicate effects, export evidence, and rebuild projections.
- Output is scoped to live_session_id with actor, policy, and evidence metadata.
- Event audit.execution.updated.v1 is emitted only after durable control/audit state.
- Frontend, Portal BFF, KrakenD, Core BFF, NATS, service, persistence, propagation, redaction, retry, and audit contracts are explicit.
- No Organization, Workspace, Campaign, tenant aggregate, or direct unguarded platform mutation.
