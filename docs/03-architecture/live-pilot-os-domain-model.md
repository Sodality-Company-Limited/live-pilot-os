# LivePilot OS Domain and Event Model

> **Status:** Draft vocabulary and flow derived from the Feature Map. Entity ownership, persistence, event schema, and production invariants require technical/product review.

## Core concepts

| Concept | Meaning | Key rule from current source |
|---|---|---|
| Live Session | One active broadcast context shared by Host and Live Ops. | Signals and actions must be associated with the same session. |
| Chat Message | A viewer message received during a session. | Preserve its source and time; do not treat model interpretation as the original message. |
| Intent Signal | A classified interpretation of a message or event. | Includes type, confidence, and resolved product/SKU only when supported. |
| Product / SKU | Catalog product and a purchasable variant. | Host answers and product actions must resolve against the approved catalog. |
| Host Cue | Short recommendation shown to the Host. | It is a recommendation unless an approved action mode authorizes execution. |
| Offer / Voucher | A proposed or active promotion. | Must pass the margin policy before issuance; lifecycle and outcome are logged. |
| Margin Decision | Policy result for an offer. | A decision must include the policy inputs/version and an allow/needs-approval/reject result. |
| Stock Reservation | Temporary allocation for a promotion/order flow. | Must not be double-counted; release/finalize behavior needs a defined terminal outcome. |
| Operator Action | Human or automated decision/action. | Record actor, trigger, decision, result, and correlation to adapter activity. |
| Adapter | Boundary to a marketplace or a simulator. | Its mode and external result must be explicit; unknown responses must not trigger unsafe duplicate effects. |

## Canonical flow

```text
Chat/telemetry input
  → intent or risk signal
  → product/topic aggregation
  → Host cue and/or operator proposal
  → approval and policy checks
  → adapter action (simulated in Hackathon demo unless approved otherwise)
  → result/action log
```

## Event vocabulary

The Feature Map currently names these events; use them as the event-name source until a versioned event schema is approved:

| Stage | Current event names |
|---|---|
| Chat and telemetry | `chat.intent.detected`, `chat.risk.detected`, `chat.question.clustered`, `live.engagement.updated`, `product.interest.updated` |
| Host co-pilot | `copilot.suggestion.created`, `copilot.alert.created`, `copilot.answer.approved`, `copilot.answer.edited`, `copilot.answer.dismissed` |
| Store actions | `product.pin.requested`, `product.pin.executed`, `voucher.proposed`, `voucher.approved`, `voucher.rejected`, `stock.reserved`, `stock.released`, `scenario.triggered` |
| Operator control | `approval.requested`, `approval.resolved`, `action.logged`, `action.failed`, `emergency.pause.activated`, `emergency.pause.released`, `compliance.escalated` |

## States and invariants stated by current source

- Voucher states: `DRAFT → SCHEDULED → ACTIVE → EXHAUSTED | EXPIRED | CANCELLED`.
- Approval modes: `RECOMMEND_ONLY`, `ASSISTED`, `AUTONOMOUS`.
- Margin outcomes: `APPROVED`, `NEEDS_APPROVAL`, `REJECTED`.
- A paused system stops automated pinning, voucher issuance, new reservations, and scenario automation while continuing chat capture and logging.
- A retry after an unknown adapter result must not create duplicate consequential actions.

## Unresolved domain decisions

- Canonical source and owner for product/catalog, stock, order, payment, and fee data.
- Exact lifecycle and reconciliation rules for reservations, vouchers, refunds, and late platform responses.
- Event envelope fields, ordering guarantees, idempotency key, schema versioning, and retention.
- Which actions require human approval and who may pause/resume a session.
