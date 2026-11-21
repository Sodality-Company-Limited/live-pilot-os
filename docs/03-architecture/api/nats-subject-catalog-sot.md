# NATS Subject Catalog SOT

> **Status:** Required async inventory; use the [NATS template](nats-subject-message-template.md).

> **Current state:** Pilot subject inventory is defined below. AsyncAPI generation
> remains blocked until schema hashes and producer/consumer compatibility tests are
> checked in.

## Pilot subject inventory

| Subject | Kind | Producer → consumers | Ordering key | Retry/DLQ |
|---|---|---|---|---|
| `livepilot.v1.session.lifecycle.request` | command | core-bff → session-service | `session_id` | 3 retries → `livepilot.v1.session.lifecycle.dlq` |
| `livepilot.v1.telemetry.signal.ingest` | command | telemetry-ingress → telemetry-service | `session_id` | 5 retries → `livepilot.v1.telemetry.signal.dlq` |
| `livepilot.v1.telemetry.signal.detected` | event | intent-risk-service → session/counter/coprojections | `session_id` | consumer retry → domain DLQ |
| `livepilot.v1.copilot.suggestion.created` | event | JEV/copilot-service → session/portal/audit | `session_id` | consumer retry → copilot DLQ |
| `livepilot.v1.promotion.proposal.request` | command | core-bff → promotion-service | `promotion_id` | 3 retries → promotion DLQ |
| `livepilot.v1.promotion.proposed` | event | promotion-service → policy/audit/approval | `promotion_id` | consumer retry → promotion DLQ |
| `livepilot.v1.promotion.decision.request` | command | core-bff → approval-control-service | `promotion_id` | 3 retries → approval DLQ |
| `livepilot.v1.promotion.decision.recorded` | event | approval-control-service → promotion/execution/audit | `promotion_id` | consumer retry → approval DLQ |
| `livepilot.v1.execution.action.updated` | event | execution/adapter-safety → promotion/inventory/audit/portal | `action_id` | consumer retry → execution DLQ |
| `livepilot.v1.audit.receipt.append` | command | owning services → audit-service | `aggregate_id` | 5 retries → audit DLQ; no silent drop |
| `livepilot.v1.control.pause.request` | control | control-plane → all mutating services | `session_id` | 3 retries → control DLQ; fail closed |

All subjects use the envelope and required headers in the template. Delivery is
JetStream at-least-once with durable pull consumers, bounded exponential backoff,
explicit DLQ, and operator-authorized replay. Retention is 24 hours for commands
and 7 days for events; audit receipts are retained according to the audit SOT.
No subject contains tenant or user values.

## Payload schema registry

| Payload family | Schema | SHA-256 |
|---|---|---|
| session lifecycle | [session-lifecycle](schemas/nats/session-lifecycle.schema.json) | `43d3669754b3cfa7ad8c1d56e010a32ed402bcbc0929fc74905654d03264d364` |
| telemetry signal | [telemetry-signal](schemas/nats/telemetry-signal.schema.json) | `8295e7f097fb2159e366b3cb7ceb0da79cff00380ac372401904f934916cc1c4` |
| promotion proposal | [promotion-proposal](schemas/nats/promotion-proposal.schema.json) | `3f6de2557c4248e7040107a4ebbcb81035e547c5d38feab8a652839921740d0f` |
| promotion decision | [promotion-decision](schemas/nats/promotion-decision.schema.json) | `663c094d969a49a8cbea857bce7701aeb6200d9bc49e8175df82604ac0b8b7d8` |
| execution update | [execution-update](schemas/nats/execution-update.schema.json) | `3fad6fbbc0a4d05350b7893427054378d19d5940efee6645f44ef646b3e51604` |
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
