# NATS Subject Catalog SOT

> **Status:** Required async inventory; use the [NATS template](nats-subject-message-template.md).

> **Current state:** Pilot subject inventory and AsyncAPI artifact are checked in.
> Producer/consumer compatibility tests remain a release gate.

## Pilot subject inventory

| Subject | Kind | Producer → consumers | Ordering key | Retry/DLQ |
|---|---|---|---|---|
| `livepilot.v1.session.lifecycle.request` | command | core-bff → session-service | `session_id` | 3 retries → `livepilot.v1.session.lifecycle.dlq` |
| `livepilot.v1.telemetry.signal.ingest` | command | core-bff, platform-adapters (telemetry-ingress) → telemetry-service | `session_id` | 5 retries (exponential backoff) → `livepilot.v1.telemetry.signal.dlq` |
| `livepilot.v1.telemetry.signal.detected` | event | telemetry-service → intent-risk-service, jev-copilot-service, audit-service | `session_id` | 5 retries (exponential backoff) → `livepilot.v1.telemetry.signal.dlq` |
| `livepilot.v1.telemetry.signal.dlq` | dlq | telemetry-service → telemetry-service (operator replay) | `session_id` | terminal DLQ; operator-authorized replay only |
| `livepilot.v1.copilot.suggestion.created` | event | JEV/copilot-service → session/portal/audit | `session_id` | consumer retry → copilot DLQ |
| `livepilot.v1.copilot.suggestion.proposed` | event | `jev-copilot-service` → `core-bff`, `session-service`, `audit-service` | `tenant_id:live_session_id` | JetStream at-least-once, 5 retries → `livepilot.v1.copilot.suggestion.dlq` |
| `livepilot.v1.copilot.suggestion.withdrawn` | event | `jev-copilot-service` → `core-bff`, `portal-bff`, `audit-service` | `tenant_id:live_session_id` | 5 retries → `livepilot.v1.copilot.suggestion.dlq` |
| `livepilot.v1.copilot.delivery.degraded` | event | `jev-copilot-service` → `core-bff`, `portal-bff` | `tenant_id:live_session_id` | 3 retries → `livepilot.v1.copilot.delivery.dlq` |
| `livepilot.v1.promotion.proposal.request` | command | core-bff → promotion-service | `promotion_id` | 3 retries → promotion DLQ |
| `livepilot.v1.promotion.proposed` | event | promotion-service → policy/audit/approval | `promotion_id` | consumer retry → promotion DLQ |
| `livepilot.v1.promotion.decision.request` | command | core-bff → approval-control-service | `promotion_id` | 3 retries → approval DLQ |
| `livepilot.v1.promotion.decision.recorded` | event | approval-control-service → promotion/execution/audit | `promotion_id` | consumer retry → approval DLQ |
| `livepilot.v1.control.approval.decision.request` | command | `core-bff`, `portal-bff` → `approval-control-service` | `session_id` | 3 retries → `livepilot.v1.control.approval.decision.dlq` |
| `livepilot.v1.control.approval.decision.recorded` | event | `approval-control-service` → `core-bff`, `promotion-service`, `execution-service`, `audit-service` | `session_id` | JetStream at-least-once, 5 retries → `livepilot.v1.control.approval.decision.dlq` |
| `livepilot.v1.control.mode.update.request` | command | `core-bff`, `portal-bff` → `approval-control-service` | `session_id` | 3 retries → `livepilot.v1.control.mode.dlq` |
| `livepilot.v1.control.mode.updated` | event | `approval-control-service` → `core-bff`, `jev-copilot-service`, `promotion-service`, `audit-service` | `session_id` | JetStream at-least-once, 5 retries → `livepilot.v1.control.mode.dlq` |
| `livepilot.v1.control.emergency_pause.changed` | event | `approval-control-service` → all mutating services, `audit-service` | `session_id` | JetStream at-least-once, broadcast fail-closed |
| `livepilot.v1.execution.action.updated` | event | execution/adapter-safety → promotion/inventory/audit/portal | `action_id` | consumer retry → execution DLQ |
| `livepilot.v1.audit.receipt.append` | command | owning services → audit-service | `aggregate_id` | 5 retries → `livepilot.v1.audit.receipt.dlq`; no silent drop |
| `livepilot.v1.audit.receipt.dlq` | dlq | audit-service → audit-service (operator replay) | `aggregate_id` | terminal DLQ; operator-authorized replay only |
| `livepilot.v1.control.pause.request` | control | control-plane → all mutating services | `session_id` | 3 retries → control DLQ; fail closed |
| `livepilot.v1.catalog.product.read.request` | query | `core-bff`, internal services → `catalog-service` | `tenant_id:product_id\|sku` | bounded request/reply; timeout is unknown; no DLQ |
| `livepilot.v1.catalog.product.read.reply` | reply | `catalog-service` → requesting consumer | `tenant_id:product_id\|sku` | request/reply; caller reconciles timeout; no DLQ |
| `livepilot.v1.catalog.product.updated` | event | `catalog-service` → `core-bff`, `jev-copilot-service`, `intent-risk-service`, `margin-policy-service`, `inventory-service`, `promotion-service`, `decision-engine-service`, `audit-service` | `tenant_id:product_id` | 5 retries (exponential backoff) → `livepilot.v1.catalog.product.updated.dlq` |
| `livepilot.v1.catalog.product.updated.dlq` | dlq | `catalog-service` → `catalog-service` (operator replay) | `tenant_id:product_id` | terminal DLQ; operator-authorized replay only |
| `livepilot.v1.margin.evaluation.request` | query | `core-bff`, `promotion-service` → `margin-policy-service` | `tenant_id:session_id:proposal_id` | bounded request/reply; timeout is unknown; no DLQ |
| `livepilot.v1.margin.evaluation.reply` | reply | `margin-policy-service` → requesting consumer | `tenant_id:session_id:proposal_id` | deterministic request/reply; caller reconciles timeout; no DLQ |
| `livepilot.v1.margin.verdict.recorded` | event | `margin-policy-service` → `core-bff`, `promotion-service`, `approval-control-service`, `audit-service` | `tenant_id:session_id` | JetStream at-least-once, 5 retries → `livepilot.v1.margin.verdict.recorded.dlq` |
| `livepilot.v1.margin.verdict.recorded.dlq` | dlq | `margin-policy-service` → `margin-policy-service` (operator replay) | `tenant_id:session_id` | terminal DLQ; operator-authorized replay only |

All subjects use the envelope and required headers in the template. Delivery is
JetStream at-least-once with durable pull consumers, bounded exponential backoff,
explicit DLQ, and operator-authorized replay. Retention is 24 hours for commands
and 7 days for events; audit receipts are retained according to the audit SOT.
No subject contains tenant or user values.

## Payload schema registry

| Payload family | Schema | SHA-256 |
|---|---|---|
| session lifecycle | [session-lifecycle](schemas/nats/session-lifecycle.schema.json) | `43d3669754b3cfa7ad8c1d56e010a32ed402bcbc0929fc74905654d03264d364` |
| telemetry signal | [telemetry-signal](schemas/nats/telemetry-signal.schema.json) | `e257cd7cda43f277b4efff717e9bba11c4c2e78c115a23e3349512b37172faf8` |
| promotion proposal | [promotion-proposal](schemas/nats/promotion-proposal.schema.json) | `3f6de2557c4248e7040107a4ebbcb81035e547c5d38feab8a652839921740d0f` |
| promotion decision | [promotion-decision](schemas/nats/promotion-decision.schema.json) | `663c094d969a49a8cbea857bce7701aeb6200d9bc49e8175df82604ac0b8b7d8` |
| execution update | [execution-update](schemas/nats/execution-update.schema.json) | `3fad6fbbc0a4d05350b7893427054378d19d5940efee6645f44ef646b3e51604` |
| audit receipt | [audit-receipt](schemas/nats/audit-receipt.schema.json) | `44dc50b7f188a99fec869777aa66eb40d175ca43f2e8bbda101dfe813a0d2ae6` |
| control pause | [control-pause](schemas/nats/control-pause.schema.json) | `e66d369df284ecd41b144741fecf18a3567504d166a3e8f8bae7b3a7a9e03323` |
| approval decision | [approval-decision](schemas/nats/approval-decision.schema.json) | `28de8c2d49a6811d99f1ccef4d74aab51d568377e1ddd5bb99cc44caec757fd4` |
| control mode | [control-mode](schemas/nats/control-mode.schema.json) | `bdc22ee34095fb0e7e9fccf259b956bbc9c8afe4dc38fccf01ebc4a4448f8402` |
| emergency pause | [emergency-pause](schemas/nats/emergency-pause.schema.json) | `5de29dac4a6736f91722769e0d6a64ad87f20c3df0861f4be964a187321cb3f4` |
| catalog product fact (shared payload) | [catalog-product-read](schemas/catalog-product-read.schema.json), v1.0.0 | `aefa37483a6af22841a749df4d035cbdbec2d5ef3620f2359ea8b324ea3485d5` |
| catalog product read request | [catalog-product-read-request](schemas/nats/catalog-product-read-request.schema.json), v1.0.0 | `9952541b46a95f7733fb982d8bcd6bfef1f83aaee74e740b1627b83b6ec751a7` |
| catalog product read reply | [catalog-product-read-reply](schemas/nats/catalog-product-read-reply.schema.json), v1.0.0 | `961da07223a03104b49c213592a146425ce118643aa8dbe1addcd29f8cc8a727` |
| catalog product updated / DLQ | [catalog-product-updated](schemas/nats/catalog-product-updated.schema.json), v1.0.0 | `85a57e803d9fc19c4aca0637c22764fd3587c47106de2e264e47e39a93afcbde` |
| jev suggestion proposed | [jev-suggestion-proposed](schemas/nats/jev-suggestion-proposed.schema.json) | `5cae0f946ae5a73cf1d13109acd191df4c9f892e7234c26e71c57fa2b46b22b8` |
| jev suggestion withdrawn | [jev-suggestion-withdrawn](schemas/nats/jev-suggestion-withdrawn.schema.json) | `1c780e4dc9ab5dad3ab881f8730e37f5b1ff1a5405ab2fb829e1c44f4323c6a1` |
| jev copilot delivery degraded | [jev-copilot-delivery-degraded](schemas/nats/jev-copilot-delivery-degraded.schema.json) | `77b7c3a4bf46b0bce83039c5418ea08ff1ad2e77c3dc7f17525756ac24b36785` |
| margin evaluation request | [margin-evaluation-request](schemas/nats/margin-evaluation-request.schema.json), v1.0.0 | `2b4c60530556914e72959b5dc23a70be737675756e2beaf92ede186f45e3b3f2` |
| margin evaluation reply | [margin-evaluation-reply](schemas/nats/margin-evaluation-reply.schema.json), v1.0.0 | `e24e39be22b36e8327fb1f76fbaf2b688ade9529eba4934095516f58b92cd0ae` |
| margin verdict recorded / DLQ | [margin-verdict-recorded](schemas/nats/margin-verdict-recorded.schema.json), v1.0.0 | `c475220a56e563a02177a35037e70b8c7fb9638e90e1f8d17488598d57701f4e` |

Subject-to-payload binding: session lifecycle → session lifecycle; telemetry
signal → telemetry signal; promotion proposal → promotion proposal; promotion
decision → promotion decision; execution action updated → execution update; audit
receipt append → audit receipt; control pause → control pause; catalog product read
request → catalog-product-read-request; catalog product read reply →
catalog-product-read-reply; catalog product updated / DLQ → catalog-product-updated
(wrapping catalog-product-read v1.0.0 fact); suggestion proposed
→ jev-suggestion-proposed; suggestion withdrawn → jev-suggestion-withdrawn; delivery
degraded → jev-copilot-delivery-degraded. Suggestion events
use the canonical versioned payload schemas above before the JEV suggestion consumer is enabled.

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

## Catalog contract registration

The Catalog query, reply, and update event use separate versioned v1.0.0 NATS contracts
backed by the canonical `catalog-product-read` fact schema (`aefa37483a6af22841a749df4d035cbdbec2d5ef3620f2359ea8b324ea3485d5`):
- `livepilot.v1.catalog.product.read.request` (`schemas/nats/catalog-product-read-request.schema.json`, SHA-256 `9952541b46a95f7733fb982d8bcd6bfef1f83aaee74e740b1627b83b6ec751a7`): bounded query from `core-bff`/internal services to `catalog-service`, ordered by `tenant_id:product_id|sku`, no DLQ, no replayable stream.
- `livepilot.v1.catalog.product.read.reply` (`schemas/nats/catalog-product-read-reply.schema.json`, SHA-256 `961da07223a03104b49c213592a146425ce118643aa8dbe1addcd29f8cc8a727`): deterministic reply from `catalog-service` to requesting consumer carrying an approved fact or `LP11001`–`LP11005` refusal, ordered by `tenant_id:product_id|sku`, no DLQ, no replayable stream.
- `livepilot.v1.catalog.product.updated` and `livepilot.v1.catalog.product.updated.dlq` (`schemas/nats/catalog-product-updated.schema.json`, SHA-256 `85a57e803d9fc19c4aca0637c22764fd3587c47106de2e264e47e39a93afcbde`): committed product fact event published by `catalog-service` only after the PostgreSQL revision and transactional outbox commit.

Producers reject missing tenant, lineage, schema, producer, occurred-at, or mode
fields; consumers reject unsupported major versions and accept additive minor fields.
JSON Schema validation and producer/consumer compatibility checks (`node code/services/catalog-service/test/catalogContractCompatibility.mjs && node code/services/catalog-service/test/catalogProductFacts.mjs`) are release gates.

The update event is JetStream at-least-once, ordered by `tenant_id:product_id`,
retained for 7 days or 10 GiB per stream, retried five times with bounded backoff,
then sent to `livepilot.v1.catalog.product.updated.dlq`. Replay is disabled by default;
only an operator with Catalog-owner and audit capability may authorize bounded
tenant-scoped replay, which preserves lineage and records a replay receipt. Consumers
ack after durable processing, deduplicate by `message_id`, and treat `withdrawn` as
terminal for that revision. Query/reply has no replayable stream.

## Telemetry contract registration

The Telemetry ingest command (`livepilot.v1.telemetry.signal.ingest`), detected
event (`livepilot.v1.telemetry.signal.detected`), and dead-letter subject
(`livepilot.v1.telemetry.signal.dlq`) share the `telemetry-signal` v1.0.0 payload
schema (`e257cd7cda43f277b4efff717e9bba11c4c2e78c115a23e3349512b37172faf8`).
Producers (`core-bff`, `platform-adapters`) emit tenant/session-scoped signals with
all required envelope headers; `telemetry-service` validates scope, deduplicates on
`(tenant_id, session_id, signal_id)` in `telemetry_signals`/`telemetry_inbox`,
commits atomically with `telemetry_outbox`, and acknowledges only after durable
commit. Failed deliveries retry 5 times with bounded exponential backoff before
routing to `livepilot.v1.telemetry.signal.dlq`, where operator-authorized replay
generates a new `replay_id` and audit receipt.

## JEV Copilot contract registration

The JEV Copilot events (`livepilot.v1.copilot.suggestion.proposed`, `livepilot.v1.copilot.suggestion.withdrawn`, and `livepilot.v1.copilot.delivery.degraded`) are emitted by `jev-copilot-service` onto JetStream at-least-once streams:
- `livepilot.v1.copilot.suggestion.proposed`: Emitted after grounding verification succeeds against approved catalog facts and confidence thresholds. Payload schema is `jev-suggestion-proposed.schema.json` (`5cae0f946ae5a73cf1d13109acd191df4c9f892e7234c26e71c57fa2b46b22b8`). Ordered by `tenant_id:live_session_id`. Retried 5 times before routing to `livepilot.v1.copilot.suggestion.dlq`.
- `livepilot.v1.copilot.suggestion.withdrawn`: Emitted when an active suggestion is retracted due to stale facts, emergency control pause, session termination, or manual override. Payload schema is `jev-suggestion-withdrawn.schema.json` (`1c780e4dc9ab5dad3ab881f8730e37f5b1ff1a5405ab2fb829e1c44f4323c6a1`). Ordered by `tenant_id:live_session_id`. Retried 5 times before DLQ.
- `livepilot.v1.copilot.delivery.degraded`: Emitted when model provider latency or failure rates trip the circuit breaker, placing the HUD into a read-only or fallback posture. Payload schema is `jev-copilot-delivery-degraded.schema.json` (`77b7c3a4bf46b0bce83039c5418ea08ff1ad2e77c3dc7f17525756ac24b36785`). Ordered by `tenant_id:live_session_id`. Retried 3 times before DLQ.

## Audit contract registration

The Audit receipt append command (`livepilot.v1.audit.receipt.append`) and dead-letter subject (`livepilot.v1.audit.receipt.dlq`) share the `audit-receipt` v1.0.0 payload schema (`44dc50b7f188a99fec869777aa66eb40d175ca43f2e8bbda101dfe813a0d2ae6`).
Producers (owning services: `session-service`, `telemetry-service`, `catalog-service`, `promotion-service`, `approval-control-service`, `execution-service`) emit decision receipts with all required envelope headers; `audit-service` validates scope, schema, and hashes, deduplicates on `(tenant_id, receipt_id)` in `audit_records`/`audit_inbox`, commits atomically to PostgreSQL 16 immutable ledger, and acknowledges only after durable commit. Failed deliveries retry 5 times with bounded exponential backoff before routing to `livepilot.v1.audit.receipt.dlq`, where operator-authorized replay generates a new `replay_id` and audit receipt.

## Margin Policy contract registration

The Margin Policy evaluation query, reply, and recorded event contracts enforce exact integer minor units and zero floating-point arithmetic (Article V):
- `livepilot.v1.margin.evaluation.request` (`schemas/nats/margin-evaluation-request.schema.json`, SHA-256 `2b4c60530556914e72959b5dc23a70be737675756e2beaf92ede186f45e3b3f2`): bounded synchronous query from `core-bff` and `promotion-service` to `margin-policy-service`, ordered by `tenant_id:session_id:proposal_id`, no DLQ, timeout is unknown requiring caller reconciliation.
- `livepilot.v1.margin.evaluation.reply` (`schemas/nats/margin-evaluation-reply.schema.json`, SHA-256 `e24e39be22b36e8327fb1f76fbaf2b688ade9529eba4934095516f58b92cd0ae`): deterministic reply from `margin-policy-service` to requesting consumer carrying an approved, review-required, or rejected economic verdict with safer discount alternatives, ordered by `tenant_id:session_id:proposal_id`, no DLQ.
- `livepilot.v1.margin.verdict.recorded` and `livepilot.v1.margin.verdict.recorded.dlq` (`schemas/nats/margin-verdict-recorded.schema.json`, SHA-256 `c475220a56e563a02177a35037e70b8c7fb9638e90e1f8d17488598d57701f4e`): committed domain event published by `margin-policy-service` only after atomic PostgreSQL commit and transactional outbox persistence. Ordered by `tenant_id:session_id`, retained for 7 days, retried 5 times with bounded exponential backoff before routing to `livepilot.v1.margin.verdict.recorded.dlq`. Replay requires operator authorization with audit receipt logging.



