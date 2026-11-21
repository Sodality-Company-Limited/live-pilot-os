# NATS Subject Catalog SOT

> **Status:** Required async inventory; use the [NATS template](nats-subject-message-template.md).

> **Current state:** Pilot subject inventory and AsyncAPI artifact are checked in.
> Producer/consumer compatibility tests remain a release gate.

## Pilot subject inventory

| Subject | Kind | Producer → consumers | Ordering key | Retry/DLQ |
|---|---|---|---|---|
| `livepilot.v1.session.lifecycle.request` | command | core-bff → session-service | `session_id` | 3 retries → `livepilot.v1.session.lifecycle.dlq` |
| `livepilot.v1.telemetry.signal.ingest` | command | telemetry-ingress → telemetry-service | `session_id` | 5 retries → `livepilot.v1.telemetry.signal.dlq` |
| `livepilot.v1.telemetry.signal.detected` | event | intent-risk-service → session/counter/coprojections | `session_id` | consumer retry → domain DLQ |
| `livepilot.v1.copilot.suggestion.created` | event | JEV/copilot-service → session/portal/audit | `session_id` | consumer retry → copilot DLQ |
| `livepilot.v1.promotion.proposal.request` | command | core-bff → promotion-service | `promotion_id` | 3 retries → promotion DLQ |
| `livepilot.v1.promotion.proposed` | event | promotion-service → policy/audit/approval | `promotion_id` | consumer retry → promotion DLQ |
| `livepilot.v1.inventory.reservation.request` | command | promotion-service → inventory-service | `reservation_id` | 3 classified retries → inventory DLQ; timeout is unknown |
| `livepilot.v1.inventory.reservation.updated` | event | inventory-service → promotion/execution/audit | `reservation_id` | consumer retry; stale/unknown reservation → inventory DLQ |
| `livepilot.v1.promotion.decision.request` | command | core-bff → approval-control-service | `promotion_id` | 3 retries → approval DLQ |
| `livepilot.v1.promotion.decision.recorded` | event | approval-control-service → promotion/execution/audit | `promotion_id` | consumer retry → approval DLQ |
| `livepilot.v1.execution.action.request` | command | promotion-service → execution/adapter-safety-service | `action_id` | 3 classified retries → execution DLQ; timeout is unknown |
| `livepilot.v1.execution.action.updated` | event | execution/adapter-safety → promotion/inventory/audit/portal | `action_id` | consumer retry → execution DLQ |
| `livepilot.v1.audit.receipt.append` | command | owning services → audit-service | `aggregate_id` | 5 retries → audit DLQ; no silent drop |
| `livepilot.v1.control.pause.request` | control | control-plane → all mutating services | `scope_key` | 3 classified retries → control DLQ; global/scoped fail closed |
| `livepilot.v1.promotion.dlq` | job | promotion-service → authorized replay operator | `promotion_id` | no automatic retry; operator-authorized replay only |

Promotion service contract binding: `promotion-service` is the authoritative owner for the
`promotion.proposed` aggregate fact and consumes decision, execution, and pause facts only to
advance its own state. Proposal commands use the promotion-proposal schema and decision facts
use the promotion-decision schema; every consumer validates the envelope, tenant/session
scope, authorization, schema revision, deadline, and idempotency fingerprint before business
logic. Unknown, stale, duplicate-conflict, unavailable, unauthorized, and unobserved inputs
are rejected or retained as `pending`/`unknown`; none may become `issued`.

Promotion reliability policy: the control pause payload declares `scope` (`global`, `tenant`,
`session`, or `promotion`) and a monotonic `control_revision`. Global pause has precedence over
tenant, session, and promotion scope; a missing, stale, contradictory, or unavailable pause
snapshot fails closed. The service checks the effective pause before leasing work and again
before committing a consequential mutation. Pause may finish safe cleanup and audit append but
cannot admit a new side effect.

Retryable proposal, reservation, execution, and pause delivery uses at most three bounded
exponential-backoff attempts with full jitter; audit append uses five. Retries reuse the original
message ID and idempotency fingerprint and are limited to transient transport/dependency/lease
failures. Validation, authorization, scope, schema, stale-version, idempotency, illegal-state,
and active-pause failures are non-retryable. A timeout after a consequential dispatch is
`unknown` and requires reconciliation before any retry.

Poison, incompatible, unauthorized, conflicting, or repeatedly failing messages are committed
to `livepilot.v1.promotion.dlq` with original subject/message ID, attempts, reason code,
correlation/causation, resource version, tenant/session/promotion references, and replay owner;
secrets and raw provider payloads are excluded. Unknown observations are quarantined after the
reconciliation deadline and remain non-issued. DLQ replay requires server-derived
`promotion.replay` (`LP02003 REPLAY_NOT_AUTHORIZED` when absent), current tenant/session scope,
schema and pause validation, a new replay ID
and idempotency key, original causation retention, and an audited result. Replay cannot bypass
inbox deduplication or turn `unknown` into `issued`.

Promotion integration gate: an execution request is valid only when the promotion service has
current, correlated receipts for an allowed policy decision, explicit approval/control evidence
with separation of duties and pause revision, an accepted inventory reservation, and an
execution-safety authorization. Every reservation and execution command carries the promotion
resource version, correlation/causation IDs, idempotency key and fingerprint, deadline, and
fencing token where a worker can commit. Consumers reject missing, stale, denied, expired,
ambiguous, or mismatched receipts before side effects. Dispatch is not issuance: a timeout or
missing observation becomes `unknown`, and reconciliation must produce a matching observation
before `issued` can be committed. This boundary carries references, identifiers, verdicts,
versions, and safe reason codes only; it never carries provider credentials or raw provider
payloads.

All subjects use the envelope and required headers in the template. Delivery is
JetStream at-least-once with durable pull consumers, bounded exponential backoff,
explicit DLQ, and operator-authorized replay. Retention is 24 hours for commands
and 7 days for events; audit receipts are retained according to the audit SOT.
No subject contains tenant or user values.

Promotion reliability audit records must include `actor_ref`, `session_id` (or an explicit
control-plane/system actor for global pause), `correlation_id`, `causation_id`,
`promotion_id`, expected/actual `resource_version`, `control_revision`, attempt, safe reason
code, replay ID when applicable, and outcome. Audit append failure blocks acknowledgement or
leaves the transition pending. Audit and DLQ records contain identifiers, hashes, versions,
statuses, and safe codes only; they never contain credentials, tokens, passwords, or raw
provider payloads.

## Payload schema registry

| Payload family | Schema | SHA-256 |
|---|---|---|
| session lifecycle | [session-lifecycle](schemas/nats/session-lifecycle.schema.json) | `43d3669754b3cfa7ad8c1d56e010a32ed402bcbc0929fc74905654d03264d364` |
| telemetry signal | [telemetry-signal](schemas/nats/telemetry-signal.schema.json) | `8295e7f097fb2159e366b3cb7ceb0da79cff00380ac372401904f934916cc1c4` |
| promotion proposal | [promotion-proposal](schemas/nats/promotion-proposal.schema.json) | `3f6de2557c4248e7040107a4ebbcb81035e547c5d38feab8a652839921740d0f` |
| promotion decision | [promotion-decision](schemas/nats/promotion-decision.schema.json) | `663c094d969a49a8cbea857bce7701aeb6200d9bc49e8175df82604ac0b8b7d8` |
| execution update | [execution-update](schemas/nats/execution-update.schema.json) | `968bde7bf046ddeac58926ba2690fc80ab28ed22129eb334a7ba659b7cea2a30` |
| audit receipt | [audit-receipt](schemas/nats/audit-receipt.schema.json) | `44dc50b7f188a99fec869777aa66eb40d175ca43f2e8bbda101dfe813a0d2ae6` |
| control pause | [control-pause](schemas/nats/control-pause.schema.json) | `e66d369df284ecd41b144741fecf18a3567504d166a3e8f8bae7b3a7a9e03323` |

Subject-to-payload binding: session lifecycle → session lifecycle; telemetry
signal → telemetry signal; promotion proposal → promotion proposal; promotion
decision → promotion decision; execution action updated → execution update; audit
receipt append → audit receipt; control pause → control pause. Suggestion events
reuse the realtime event envelope and require a dedicated versioned payload before
the JEV suggestion consumer is enabled.

Each subject requires a catalog row before implementation:

| Field | Example |
|---|---|
| Subject | `livepilot.v1.inventory.reservation.request` |
| Kind | command/query/reply/event/job/control |
| Producer | `inventory-service` |
| Consumers | `execution-service`, `audit-service` |
| Schema | file path + version + SHA-256 |
| Ordering key | `reservation_id` |
| Delivery | request/reply or JetStream at-least-once |
| Retry/DLQ | classification, max attempts, DLQ subject |
| Retention | duration and storage limit |
| Replay | owner and authorization |
| Verification | producer/consumer compatibility command |

Subject names must not contain tenant or user values. Commands are not facts. Events
are published after the owning transaction commits. Consumers acknowledge only after
durable state/effect and must tolerate duplicates and additive fields.
