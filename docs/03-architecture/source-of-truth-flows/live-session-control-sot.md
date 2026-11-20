# Live Session Control Flows — Source of Truth

## Machine-readable contract coverage

This is an aggregate flow and navigation SOT. It is not a second owner of the
feature-level contracts. Detailed behavior remains owned by the four feature
indexes and their individual flow files: [F01](../source-of-truth-flows/features/F01-live-chat-telemetry/index.md),
[F02](../source-of-truth-flows/features/F02-host-screen-assistant/index.md),
[F03](../source-of-truth-flows/features/F03-streampilot-agent/index.md), and
[F04](../source-of-truth-flows/features/F04-risk-operator-control/index.md).

This flow is indexed by [coverage.yaml](../contracts/flows/coverage.yaml). The
registry records source hashes, ownership, status, and executable presence checks.
It does not claim implementation completeness; `aggregate_frozen_target` means
the cross-feature Hackathon trace is approved for verification.

Status: canonical scoped source of truth for the selected LivePilot Hackathon flow  
Last audited: 2026-11-20

## Error Semantics & Problem Details SOT

The HTTP boundary is governed by [openapi.yaml](../api/openapi.yaml). Errors must
preserve HTTP status, a stable domain code, `X-Correlation-Id`, and whether retry is
safe. No error code or retry behavior may be inferred from a UI message.

## 1. Scope & Client Responsibilities (`hackathon-demo`)

- **Host view:** mock 9:16 live, chat, audience/product metrics, catalog details,
  and concise talking points that the Host may phrase independently.
- **Live Ops view:** promotion recommendation, original/adjusted discount, margin
  evidence, adjustment reason, and approval/rejection control.
- **Platform mode:** simulated only. No Shopee, TikTok, payment, or real inventory
  mutation is permitted in this flow.

## 2. Six-Node Contract Topology [FROZEN TARGET]

```text
Node 1: Host / Live Ops UI
   ⟷ HTTPS / SSE
Node 2: Portal BFF
   ⟷ versioned REST + auth context
Node 3: KrakenD Edge Gateway
   ⟷ versioned REST
Node 4: Core BFF
   ⟷ NATS request/reply and JetStream events
Node 5: Domain services
   ⟷ service-owned PostgreSQL / outbox
Node 6: Simulated platform adapter + reconciliation
```

### Node Agreement Model

1. `session_id` and `X-Correlation-Id` are preserved across the flow.
2. Consequential mutations carry `Idempotency-Key`.
3. The API contract is OpenAPI 3.1; event names are sourced from the domain model
   until a versioned event schema is approved.
4. The simulated adapter cannot be represented as a confirmed platform result.

## 3. Selected Demonstration Flow [FROZEN TARGET]

```text
Mock shampoo live with chat
  → group promotion questions and calculate the two-minute unique-interest ratio
  → show Host product details, metrics, and talking points
  → AI proposes a discount
  → deterministic margin policy preserves the 10% floor
  → Live Ops approves or rejects
  → approval simulates coupon, countdown, and stock reservation
  → mock-live expiry returns unpurchased reserved stock
  → rejection shows not-approved status and issues no alternative offer
```

### Canonical Inputs

| Input | Authority | Rule |
|---|---|---|
| Product, price, cost, stock | Approved mock catalog fixture | Do not infer missing facts |
| Interest ratio | `REQ-LP-001` | Unique interested viewers ÷ average concurrent viewers in rolling two-minute window |
| Margin | `REQ-LP-009` | `(net sales after discount − product cost − platform fees) ÷ net sales after discount` |
| Margin floor | Project brief / `REQ-LP-009` | 10% for the selected Hackathon demo |
| Approval | `REQ-LP-013` | Live Ops approval is required before simulated issuance |
| Platform behavior | `REQ-LP-015` | Simulated adapter only; no live mutation |

## 4. State and Decision Contract

```text
RECOMMEND_ONLY → PENDING_POLICY → PENDING_APPROVAL
  → APPROVED → EXECUTED → EXPIRED / RECONCILED
                    └→ REJECTED
```

- AI may propose a discount but cannot issue it.
- The margin policy may lower the discount to preserve the 10% floor.
- Live Ops sees original discount, adjusted discount, both margin values, and the
  adjustment reason before deciding.
- On rejection, no coupon, reservation, countdown, or alternative offer is issued.
- On Emergency Pause, new automated actions stop while signal capture and audit
  logging continue.

## 5. Required Evidence Cases [FROZEN TARGET]

| ID | Given | When | Expected |
|---|---|---|---|
| `TC-LP-01` | Mock live has repeated shampoo promotion questions | Process a rolling two-minute window | Unique-interest ratio is calculated and shown separately from raw message count |
| `TC-LP-02` | Catalog has product price, cost, and fee | AI proposes a discount | Deterministic margin result and 10% floor decision are recorded |
| `TC-LP-03` | Policy-adjusted recommendation awaits review | Live Ops approves | Simulated coupon, countdown, viewer banner, and mock stock reservation appear |
| `TC-LP-04` | Policy-adjusted recommendation awaits review | Live Ops rejects | Host sees not-approved status; no coupon, reservation, countdown, or alternative offer |
| `TC-LP-05` | Approved mock coupon is active | Mock live ends | Coupon expires and unpurchased reserved stock is returned |
| `TC-LP-06` | Same consequential request is submitted twice | Reuse the same idempotency key | No duplicate simulated coupon or reservation is created |
| `TC-LP-07` | Adapter result is delayed or unknown | Retry the action | Retry cannot create a duplicate consequential effect; state is reconciled |
| `TC-LP-08` | Browser attempts to claim approval or platform mode | Submit the mutation | Server ignores browser authority and enforces Live Ops approval plus simulated mode |

## 6. Required Contract Evidence

Every implementation or goal touching this flow must provide:

1. The source revision or hashes from [coverage.yaml](../contracts/flows/coverage.yaml).
2. The API/event contract version used by each producer and consumer.
3. Test commands, exit codes, and artifact paths for the cases above.
4. A visible simulated-mode assertion in the Host and Live Ops views.
5. An action trace linking source signal, recommendation, policy verdict, approval,
   adapter result, and reconciliation.

Unresolved product or domain decisions remain `[NEEDS CLARIFICATION]` and block
promotion of this flow from `frozen_target` to `verified`.

## Related

- [Architecture overview](../overview.md)
- [Requirements baseline](../live-pilot-os-requirements.md)
- [Domain and event model](../live-pilot-os-domain-model.md)
- [Project brief](../../02-product/project-brief.md)
- [API contract index](../api/README.md)
