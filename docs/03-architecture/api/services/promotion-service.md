# Promotion Service Contract / SOT

> **Contract:** `promotion-service.v1`
> **Status:** FROZEN pilot contract
> **Requirement authority:** REQ-LP-008, REQ-LP-009, REQ-LP-013
> **Scope:** promotion and voucher proposal, approval boundary, issuance state, expiry, cancellation, and reconciliation.

## Authoritative ownership and boundary

`promotion-service` is the sole authoritative owner and writer of the Promotion/Voucher
aggregate. It owns the lifecycle state and `resource_version`; Core BFF, approval-control,
inventory, margin/policy, execution, and audit services may request, evaluate, project, or
record related facts but must not write the aggregate or its database. Browser clients never
call this service directly. There is no real marketplace credential or provider mutation in
the pilot; adapter paths are explicitly labelled `SIMULATED`.

The service persists PostgreSQL aggregate state plus inbox/outbox records in one transaction.
Reads from catalog, session, margin/policy, inventory, approval-control, and execution are
dependency facts, not alternate sources of truth.

## Persistence model and write protocol

PostgreSQL is the authoritative durable store for this bounded context. The logical tables are
`promotion_aggregate`, `promotion_inbox`, `promotion_outbox`, and append-only
`promotion_transition_audit`; no other service may write them or a Promotion row. The aggregate
primary key is `(tenant_id, promotion_id)`. `resource_version` is a not-null monotonic integer,
unique per aggregate, and is advanced with an optimistic compare-and-set:
`WHERE tenant_id = :tenant_id AND promotion_id = :promotion_id AND resource_version = :expected`.
The update must affect exactly one row; zero rows fail as a stale-version conflict and do not
create an outbox record. A uniqueness constraint on `(tenant_id, promotion_id, resource_version)`
and a check that the next version is exactly `expected + 1` prevent skipped or reused versions.

The inbox stores the validated message identity, tenant/session scope, operation, idempotency key,
fingerprint hash, schema version, and a safe outcome reference. It never stores credentials or raw
provider payloads. The outbox stores the immutable, schema-validated envelope and event payload
needed by the declared NATS subject, plus `outbox_id`, aggregate/version, attempt state, and
publish timestamps. It contains identifiers, verdicts, and references only; provider secrets and
raw provider responses are excluded.

For every accepted command or consumed fact, one database transaction performs this ordered unit:

1. Validate envelope, authorization, deadline, schema hash, tenant/session scope, and fingerprint.
2. Insert the inbox key under a uniqueness constraint. An existing identical key/fingerprint
   returns its durable outcome; a mismatched fingerprint returns a stable conflict with no write.
3. Lock the aggregate row (or establish the new row under its tenant-scoped key), verify the
   expected version and legal FSM transition, and apply the state change.
4. Increment `resource_version` exactly once, append the transition audit record, and insert the
   versioned outbox event with a deterministic event identity.
5. Commit all state, inbox, audit, and outbox writes together.

The transaction is all-or-nothing. A validation, authorization, dependency, audit, uniqueness,
version, transition, serialization, or commit failure rolls back the aggregate, inbox outcome,
audit row, and outbox row; it cannot acknowledge success or publish an event. Outbox publication
is a separate worker after commit, using a bounded lease and compare-and-set claim. A crash before
commit emits nothing; a crash after commit but before publish leaves the outbox pending for retry.
Publication is at-least-once, so consumers deduplicate by event/message ID and aggregate version;
the service never treats broker acknowledgement as database commit confirmation.

## Inbox, recovery, and replay boundaries

Inbox processing acknowledges a NATS delivery only after the transaction commits (or after the
previous identical durable outcome is returned). Retryable database/broker failures remain
unacknowledged or are retried with bounded backoff. Poison, incompatible, unauthorized, stale,
or repeatedly failing messages are moved to the declared promotion DLQ with original subject,
message ID, attempt count, reason code, and causation metadata; sensitive payload fields are
redacted or omitted.

Recovery reclaims expired outbox leases, republishes only committed pending events, and rebuilds
consumer effects from the aggregate/inbox/outbox records. It never reconstructs a state change
from an uncommitted message, a client retry, or a provider response. `unknown` remains unknown
until a matching, authorized observation or reconciliation result is durably committed; timeout
does not authorize an issuance retry.

Replay is an operator-authorized, separately identified operation against a committed outbox/DLQ
record. It must create a new replay ID, retain the original causation ID, revalidate the current
schema and tenant scope, and record an audit result. Replay can republish a safe event or invoke a
reconciliation read; it cannot mutate the aggregate directly, bypass the inbox/idempotency key,
turn an unobserved action into `issued`, or replay a raw provider payload. Duplicate replay IDs,
stale versions, missing authorization, failed validation, and unknown source records fail closed.

## Aggregate and lifecycle

| State | Entry trigger and required guards | Exit / failure behavior |
|---|---|---|
| `proposed` | Valid session, catalog item, schema, actor capability, tenant scope, and idempotency fingerprint | Reject invalid input without mutation; otherwise enqueue evaluation |
| `pending` | Proposal committed with current policy revision and durable evaluation receipt | Remain pending on timeout/unavailability; expire only by authorized lifecycle timer |
| `approved` | Current policy decision, approval/control receipt with SoD, inventory reservation, current resource version, and execution-safety authorization | Start issuance saga; any missing, stale, denied, ambiguous, or expired evidence is rejected |
| `issued` | Matching execution action and observed success confirmation | Never inferred from dispatch or timeout |
| `unknown` | Timeout, divergence, unavailable provider, or missing observation | Reconcile before retry; no claim of issuance; DLQ poison messages |
| `rejected` | Policy, margin, authorization, catalog, inventory, or approval refusal | Terminal for that proposal; preserve reason and audit lineage |
| `expired` / `cancelled` | Authorized timer or control transition with current version | Terminal; prior evidence remains append-only |

Every accepted mutation requires `promotion_id`, tenant/session scope, expected
`resource_version`, policy revision, actor/capability, correlation/causation lineage, and an
idempotency key. The version increments exactly once in the same transaction as the state
change and outbox record.

### Issuance safety gate

Promotion issuance is a guarded integration, not a consequence of an approval event or a
successful dispatch. The promotion aggregate may enter `approved` only when one current,
correlated evidence bundle is durably present:

| Required evidence | Owning authority | Minimum proof | Fail-closed result |
|---|---|---|---|
| Policy decision | margin-policy-service | allow verdict, policy revision, decision timestamp/deadline, and evidence receipt | missing, stale, denied, expired, or ambiguous → `pending`/`rejected` |
| Approval/control | approval-control-service/control-plane | explicit approval, approval revision, approver capability, separation-of-duties result, and pause/control revision | missing, denied, stale, revoked, active pause, or unavailable → no approval/issuance |
| Inventory reservation | inventory-service | reservation ID, promotion/product binding, quantity, reservation revision, expiry, and accepted status | missing, stale, expired, released, insufficient, or unknown → no execution request |
| Execution safety authorization | execution/adapter-safety-service | action ID, safety authorization receipt, fencing token, allowed mode, current resource version, and idempotency binding | missing, stale, denied, unfenced, mode-mismatched, or ambiguous → no dispatch |

The service validates all four receipts and the current pause/control state again in the same
transaction that emits an execution request. Evidence must share `promotion_id`, tenant/session
scope, correlation lineage, policy/approval/control revisions, and the promotion resource
version. A caller cannot supply or substitute any verdict. The execution request is idempotent
and fenced; a stale worker or fencing token cannot commit. A timeout, missing observation, or
divergent receipt records `unknown` and starts reconciliation; it never authorizes a retry or
transitions to `issued`. Only a matching `succeeded` observation with the same action,
fencing, idempotency, resource version, and safety authorization can commit `issued`.

## Public proposal and read contract

`POST /v1/live-sessions/{session_id}/promotions` is the Core BFF-facing proposal
operation. Authentication is cookie/session based at the public boundary; the service
accepts only server-derived tenant, actor, capability, and session scope. The request body
contains product and bounded promotion terms plus the policy-context revision. It must not
contain margin or inventory verdicts, approval decisions, provider credentials, tokens,
passwords, or raw provider payloads. The operation returns a safe proposal receipt with
`promotion_id`, `session_id`, lifecycle status, policy revision, `resource_version`,
correlation/causation lineage, `audit_receipt_id`, `mode=SIMULATED`, and an ETag derived from
the resource version.

The proposal lifecycle is `proposed → pending`; approval, rejection, expiry, cancellation,
issuance, and unknown outcomes are separate guarded transitions. A same-key/same-fingerprint
request returns the one committed receipt, including after a response timeout. A reused key
with a different canonical fingerprint returns `409 IDEMPOTENCY_PAYLOAD_MISMATCH`; a stale
resource version returns `409 RESOURCE_VERSION_CONFLICT`. Neither conflict writes aggregate,
inbox outcome, audit, or outbox state. Invalid scope/capability, stale catalog or policy,
unknown schema, failed audit, unavailable dependency, pause, or expired deadline fail closed.

`GET /v1/promotions/{promotion_id}` resolves tenant/session visibility from authoritative
promotion state and returns the current ETag/resource version, explicit lifecycle status,
safe trace/audit metadata, and linked pending/unknown state. The response also includes a
non-authoritative read-model envelope: `projection_status` (`current`, `stale`, `unknown`, or
`missing`), `projected_resource_version`, non-negative `version_lag`, and reconciliation
metadata. `status` and `resource_version` are authoritative; consumers must not substitute
projected values for them.

Projection application is monotonic per `(tenant_id, promotion_id)`: an event is accepted only
when its version is exactly the current projection version plus one and its aggregate identity
matches. Duplicate or older events are ignored without changing authoritative state or advancing
the projection. A version gap, mismatched aggregate, schema failure, or unavailable source marks
the projection stale/unknown and requires reconciliation; a missing projection is never reported
as current. Reconciliation may rebuild the projection from committed authoritative/outbox
records, but a status read never starts reconciliation, mutates authoritative state, or advances
the projection. If visibility cannot be established from server-derived tenant/session scope,
the service fails closed with the existing unauthorized/forbidden/not-found boundary; if the
authoritative read or required projection trust evidence is unavailable, it returns the safe
dependency-unavailable response rather than exposing an untrusted state.

It never accepts caller-supplied tenant or actor identity as an elevation mechanism. Unknown
external results remain unknown until an authorized reconciliation observation is committed; no
read can imply issuance. Projection and reconciliation metadata contain identifiers, versions,
statuses, timestamps, and safe error summaries only—never credentials, tokens, passwords, or raw
provider payloads.

## Ports, authorization, and dependencies

| Port | Authority / contract | Fail-closed rule |
|---|---|---|
| Inbound HTTP/NATS | Core BFF request/reply and versioned NATS commands | Missing or invalid envelope, tenant/session scope, schema, deadline, or capability is rejected |
| Catalog/session read | catalog-service and session-service | Unknown, stale, or mismatched revision cannot create a proposal |
| Margin/policy read | margin-policy-service | Missing, stale, or refused verdict leaves `pending`/`rejected`; never auto-approves |
| Inventory reservation | inventory-service | Unknown or stale stock blocks approval/issuance and compensates reservation |
| Approval | approval-control-service | Explicit approval capability and separation of duties required; proposer cannot approve |
| Execution | execution/adapter-safety-service | Dispatch is not success; only matching observed state can produce `issued` |
| Audit | audit-service append contract | Consequential transitions require a durable audit receipt; append failure blocks commit or remains pending |
| Control | control-plane pause contract | Active or unavailable pause state blocks all consequential mutation |

Authorization is capability-based and server-derived from the authenticated principal and
tenant/session scope. Proposal requires `promotion.propose`; approval/cancellation requires
the corresponding Live Ops capability and SoD checks; reads are visibility-scoped. Raw
provider payloads, credentials, tokens, passwords, and client-supplied verdicts are never
accepted or persisted.

## Idempotency and error policy

The durable fingerprint binds tenant, session, promotion/resource identity, operation, payload,
expected version, policy revision, and actor. The same key and fingerprint return the one
durable outcome. The same key with a different fingerprint returns a stable conflict and does
not mutate state. Duplicate messages are acknowledged only after the original outcome is
durable. Stale versions, invalid transitions, unavailable dependencies, unauthorized actors,
unknown schemas, and expired deadlines fail closed with stable safe summaries.

Timeout is not rejection: the result is `pending` or `unknown` and reconciliation is required
before retry. No blind retry may issue a voucher or inflate claim/inventory counts.

## Reliability controls: pause, retry, DLQ, and replay

### Pause admission and scope

The control-plane pause snapshot is part of the promotion service's admission guard. A pause
has `scope` (`global`, `tenant`, `session`, or `promotion`), `control_revision`, `actor_ref`,
`reason_code`, `effective_at`, and an optional expiry; `actor_ref` is an opaque audit reference,
never a credential. The effective pause is selected in this order: global, tenant, session,
then promotion. A newer revision supersedes an older revision only for the same scope; a
missing, expired, contradictory, or unavailable snapshot is treated as paused.

Global pause blocks admission and all consequential promotion mutations for every tenant and
session. A scoped pause blocks the matching tenant/session/promotion and all descendant work.
Both guards are checked before leasing work and again in the same transaction that would commit
a consequential mutation or emit an execution/reservation command. Pause may allow safe lease
release, reconciliation reads, and completion of an already-required audit append, but it never
allows a new side effect. Pause denial is durable and idempotent; resume requires an authorized
control-plane revision and cannot revive a stale lease or bypass the current resource version.

### Retry classification and bounded delivery

Retries are allowed only for transport, dependency-unavailable, lease-loss, and transient
serialization failures whose operation is idempotently bound. Each retry reuses the original
message ID and idempotency key/fingerprint, records the attempt, and applies exponential
backoff with full jitter, capped by the operation deadline. The promotion proposal, inventory,
execution, and pause subjects allow at most 3 delivery attempts; audit append allows at most 5.
No retry occurs after a non-retryable validation, authorization, scope, schema, stale-version,
idempotency-conflict, active-pause, or illegal-transition result. A timeout after a potentially
consequential dispatch is `unknown`, not retryable: reconcile the external observation first.

### Poison, unknown, and DLQ handling

After the bounded attempts, or immediately for poison input (invalid schema/envelope, forged
scope, unauthorized replay, incompatible version, or conflicting fingerprint), the message is
acknowledged only after a durable DLQ record is committed. The record contains the original
subject and message ID, tenant/session/promotion references, attempt history, safe reason code,
correlation ID, causation ID, resource version, and replay owner; it excludes credentials,
tokens, passwords, raw provider payloads, and secret-bearing headers. A consequential unknown
result enters `unknown` and a reconciliation lease; if reconciliation yields no matching
observation before its deadline, the observation message is quarantined in the promotion DLQ
with `ACTION_UNKNOWN` and remains non-issued. A DLQ record never changes aggregate state by
itself.

Replay is a separate operator operation requiring the server-derived `promotion.replay`
capability (missing capability returns public `LP02003 REPLAY_NOT_AUTHORIZED`), tenant/session scope, a new replay ID/idempotency key, current schema validation,
and a current pause/resource-version check. It preserves the original message and causation
IDs, adds the operator correlation/causation lineage, and writes an audit outcome before the
replayed safe event or reconciliation read is published. Replay cannot replay raw provider
payloads, bypass inbox deduplication, convert `unknown` to `issued`, or directly mutate the
aggregate. Duplicate replay IDs, missing authorization, active/unavailable pause, stale
versions, expired retention, and invalid source records fail closed.

### Reliability audit record

Every pause decision, retry exhaustion, DLQ admission, reconciliation, replay authorization
decision, and replay outcome appends an audit record with `actor_ref`, `session_id` (or explicit
system/control-plane actor for global scope), `correlation_id`, `causation_id`, `promotion_id`,
`expected_resource_version`, `actual_resource_version`, `control_revision`, `attempt`, `outcome`,
and safe reason/error code. Audit append is transactional with any aggregate mutation; if it
cannot be durably appended, the mutation is not acknowledged and remains pending. Audit data,
logs, DLQ metadata, and public errors contain identifiers, hashes, versions, statuses, and safe
codes only—never secrets or raw provider data.

## NATS commands, events, retries, and DLQ

All messages use the common envelope and required headers from the NATS template, including
`Nats-Msg-Id`, correlation/causation, tenant/session scope, schema version, producer,
traceparent, idempotency key for commands, and explicit `X-Mode`.

| Subject | Kind | Producer → consumers | Ordering | Delivery / failure |
|---|---|---|---|---|
| `livepilot.v1.promotion.proposal.request` | command | core-bff → promotion-service | `promotion_id` | request/reply; 3 classified retries with jitter → `livepilot.v1.promotion.dlq` |
| `livepilot.v1.promotion.proposed` | event | promotion-service → policy/audit/approval | `promotion_id` | JetStream at-least-once; consumer retry → promotion DLQ |
| `livepilot.v1.inventory.reservation.request` | command | promotion-service → inventory-service | `reservation_id` | request/reply; 3 classified retries with jitter → inventory DLQ; unknown requires reconciliation |
| `livepilot.v1.inventory.reservation.updated` | event | inventory-service → promotion/execution/audit | `reservation_id` | consumer retry; stale/released/unknown evidence → inventory DLQ |
| `livepilot.v1.promotion.decision.recorded` | event | approval-control-service → promotion/execution/audit | `promotion_id` | consumer retry; incompatible/poison messages → approval DLQ |
| `livepilot.v1.execution.action.request` | command | promotion-service → execution/adapter-safety-service | `action_id` | request/reply; 3 classified retries with jitter → execution DLQ; timeout becomes unknown |
| `livepilot.v1.execution.action.updated` | event | execution/adapter-safety → promotion/inventory/audit | `action_id` | consumer retry; unknown remains explicit; execution DLQ |
| `livepilot.v1.audit.receipt.append` | command | promotion-service → audit-service | `promotion_id` | 5 retries, no silent drop → audit DLQ; transition remains uncommitted/pending |
| `livepilot.v1.control.pause.request` | control | control-plane → promotion-service | `scope_key` | 3 classified retries → control DLQ; global and scoped unavailability fail closed |

Events publish only after the owning transaction commits. Durable pull consumers deduplicate
by message ID and aggregate/version, acknowledge after durable state/effect, and tolerate
additive fields. DLQ records preserve original subject, message ID, reason, attempts, and
causation. Replay requires a new replay ID, the original causation, operator authorization,
schema revalidation, and an auditable result.

## Audit, observability, and verification

Each consequential transition records session, actor/capability, tenant, correlation,
causation, policy revision, expected/actual resource version, idempotency fingerprint hash,
dependency verdicts, mode, transition, and audit receipt ID. Reliability actions additionally
record pause scope/revision, attempt, DLQ reason, replay ID, and outcome. Logs and metrics
contain safe identifiers and error codes only; no secrets or raw provider payloads.

Required evidence includes schema hashes, migration receipt, duplicate/stale/unauthorized/
unavailable/timeout/unknown/pause/DLQ-replay tests, producer-consumer compatibility, and
revision-bound audit receipts. Run:

```text
 node scripts/harness/goal-template-conformance-harness.mjs G-PROMO-007
 node scripts/harness/architecture-design-conformance-harness.mjs G-PROMO-007
node scripts/api/check-api-sot-traceability.mjs
node scripts/architecture/check-sot.mjs
```

## Runtime health, security, and graceful degradation

The service is a private internal process. It binds only to the private mesh
interface and NATS; the edge gateway and Core BFF are the only callers of the
public API boundary. Browser clients, public Internet routes, and direct
provider calls are prohibited. The process runs as a dedicated non-root UID
with a read-only image, dropped capabilities, bounded CPU/memory, private
egress allow-listing, and a 30-second graceful drain. On SIGTERM it stops
admission, releases uncommitted leases, completes only bounded audit appends,
and never starts a new reservation or execution side effect.

The internal probe contract is:

| Endpoint | Checks | Semantics |
|---|---|---|
| `/internal/health/startup` | immutable configuration, schema/error-code registry, and migration compatibility | fail startup/traffic admission when false; 60-second startup budget |
| `/internal/health/live` | process/event-loop response only | 250-ms timeout; does not query dependencies |
| `/internal/health/ready` | PostgreSQL authoritative store, NATS JetStream connection/consumer state, and a current control-plane pause snapshot | 250-ms timeout; false removes traffic and blocks consequential work |

PostgreSQL and NATS are mandatory readiness dependencies. Redis is
reconstructable, but loss makes readiness false for any path that cannot prove
deduplication/lease safety; it never becomes an alternate authority. A missing,
expired, contradictory, or unavailable pause snapshot is treated as paused.
Probe output is limited to status, release identity, timestamp, and safe reason
codes; it excludes DSNs, passwords, tokens, cookies, authorization headers,
provider payloads, and query text. Liveness can remain true while readiness is
false during dependency recovery.

Authentication and session scope are server-derived. HTTP accepts only the
authenticated Core BFF/internal-mesh context; NATS accepts only a versioned
envelope with authenticated producer identity, tenant/session scope,
capability, deadline, correlation/causation, schema hash, and idempotency key.
Caller-supplied tenant, actor, capability, verdict, or session values cannot
elevate access. `promotion.propose`, approval/cancellation capabilities,
`promotion.replay`, separation-of-duties, current resource version, and the
control-plane pause revision are rechecked before every consequential commit.
Auth/session failure, stale evidence, audit failure, or pause/control
uncertainty fails closed.

There is no public direct provider credential. The pilot uses `mode=SIMULATED`;
provider credentials, if introduced later, must be held by an isolated
adapter-safety worker via an external secret manager with least privilege,
rotation and expiry, never by this API or its database. Secrets are excluded
from images, Git, environment snapshots, request/response bodies, NATS, inbox,
outbox, DLQ, audit, logs, metrics, traces, and health responses. Structured log
redaction happens before serialization and uses allow-listed safe identifiers.

Observability propagates service, release, mode, operation, stable error code,
correlation ID, causation ID, actor reference, session reference, and hashed
idempotency context. Tenant IDs, promotion IDs, cookies, auth headers, raw
payloads, and provider responses are not metric labels or trace attributes.
Required metrics are request/command outcomes, dependency latency/errors,
readiness state, outbox/DLQ age, retry exhaustion, pause denials, reconciliation
lag, and `unknown` outcomes. Page on readiness false for 2 minutes, three
liveness restarts in 10 minutes, PostgreSQL/NATS error rate above 1% for 5
minutes, outbox/DLQ age above 60 seconds, or unknown outcomes above 1% for 5
minutes. Warn on CPU above 80% or memory above 85% for 10 minutes.

Degradation is bounded and explicit: PostgreSQL loss blocks all aggregate
mutation; NATS loss makes readiness false and leaves committed outbox work
pending; Redis loss disables unsafe deduplication/lease-dependent admission;
pause-control loss blocks consequential work; dependency timeout yields
`pending` or `unknown` and reconciliation, never a blind retry. Safe reads may
report `stale` or `unknown`, but no degraded path may infer approval, issuance,
or provider success. Every pause, readiness transition, retry exhaustion, DLQ,
reconciliation, and unknown result retains a safe, auditable reason code.

