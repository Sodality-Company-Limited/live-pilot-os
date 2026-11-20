# LivePilot OS Requirements Baseline

> **Status:** Canonical requirement register. Hackathon-specific decisions confirmed in the 2026-11-20 discovery are recorded below; broader production requirements remain draft pending Product approval.

## ID and authority rules

- Requirement IDs use `REQ-LP-NNN` and must not be reused.
- This file is the canonical register. The feature map and summary documents are source material linked below.
- A Goal must cite one or more requirement IDs. A requirement may map to multiple Goals when its delivery is split.
- `Selected Hackathon demo` means explicitly selected in discovery; it does not approve production scope.
- Numeric examples in source documents remain non-normative unless this register records an explicit product decision. For the current Hackathon scenario, the approved margin floor is 10%.

## Requirements

| ID | Requirement | Minimum observable acceptance | Source | Scope status |
|---|---|---|---|---|
| REQ-LP-001 | Classify incoming live chat into product, price/discount, product question, stock/size, voucher, complaint, spam, and toxic intents; group semantically similar promotion questions. | For the selected shampoo scenario, calculate a rolling two-minute ratio of unique interested viewers to average concurrent viewers in that window; show the ratio and trend, not raw message count alone. Do not guess unresolved products. | [Feature Map §1.1](./live-pilot-os-feature-map.md#11-live-chat-understanding-ai); [Project Brief](../02-product/project-brief.md); [Knowledge Map C-004](../02-product/knowledge-map.json) | Selected Hackathon demo |
| REQ-LP-002 | Detect risky chat such as scams, off-platform redirection, bot raids, spam, and toxic content, with a severity and recommended handling. | A detected risk is routed to the configured moderation path and recorded; it is not treated as ordinary product interest. | [Feature Map §1.2](./live-pilot-os-feature-map.md#12-intelligent-comment-moderation); [Feature Map §4.4](./live-pilot-os-feature-map.md#44-moderation-escalation) | Prioritization pending |
| REQ-LP-003 | Aggregate chat and mock telemetry into product-interest and commerce signals for the Host and Live Ops views. | Show interested viewers, product clicks, add-to-cart count, price, and stock; keep interest, cart-add, and completed-payment signals distinct when present. | [Core Features §1](./live-pilot-os-core-features.md#1-real-time-chat-and-purchase-signal-analysis-live-chat--telemetry-understanding); [Feature Map §1.3](./live-pilot-os-feature-map.md#13-customer-intent--hype-dashboard); [Knowledge Map C-017](../02-product/knowledge-map.json) | Selected Hackathon demo |
| REQ-LP-004 | Provide the Host with brief, timely cues based on repeated questions, product interest, or an approved promotion without replacing the Host's own wording. | The Host sees concise talking points plus catalog details: product name, size, selling points, usage, price, and stock. The Host composes the final response. | [Feature Map §2.1](./live-pilot-os-feature-map.md#21-ai-host-copilot); [Feature Map §2.4](./live-pilot-os-feature-map.md#24-host-approval-ui); [Knowledge Map C-005/C-011](../02-product/knowledge-map.json) | Selected Hackathon demo |
| REQ-LP-005 | Answer product questions only from the brand-approved product catalog and escalate when information is missing or restricted. | Answers cite available catalog facts; unsupported medical or pregnancy-safety claims are not generated as facts. | [Feature Map §2.2](./live-pilot-os-feature-map.md#22-product-qa-assistant); [Core Features §2](./live-pilot-os-core-features.md#2-host-screen-assistant-streamer-co-pilot-hud) | Prioritization pending |
| REQ-LP-006 | Alert the Host or operator about important stock, order, payment, or promotion-limit changes. | Alerts name the affected product and event; unavailable or stale inventory is shown as unknown rather than current. | [Feature Map §2.3](./live-pilot-os-feature-map.md#23-stock--order-alert--host-view); [Feature Map §3.4](./live-pilot-os-feature-map.md#34-stock-reservation-and-order-state) | Prioritization pending |
| REQ-LP-007 | Resolve a product-interest signal to a catalog item and propose or execute product pinning according to the selected approval mode. | The item is validated against the catalog and stock state before pinning; uncertain matches do not trigger an automatic action. | [Feature Map §3.1](./live-pilot-os-feature-map.md#31-auto-product-pinning) | Not selected for current demo |
| REQ-LP-008 | Create a simulated, time-bounded coupon for the selected product, subject to margin checks and Live Ops approval. | On approval, issue the mock coupon immediately, show product/discount/discounted price and countdown to viewers, and expire it when the mock live ends. Eligibility and claim limits are not specified for this demo. | [Feature Map §3.2](./live-pilot-os-feature-map.md#32-smart-voucher-engine); [Project Brief](../02-product/project-brief.md); [Knowledge Map C-007/C-014](../02-product/knowledge-map.json) | Selected Hackathon demo |
| REQ-LP-009 | Evaluate every proposed discount against the Hackathon's 10% margin floor. | Margin is `(net sales after discount − product cost − platform fees) ÷ net sales after discount`. AI proposes a discount; the margin policy deterministically lowers it if needed to meet the 10% floor. Live Ops sees the original and adjusted discounts, both margins, and the reason; only Live Ops approval permits issuance. | [Feature Map §3.3](./live-pilot-os-feature-map.md#33-margin-protection); [Project Brief](../02-product/project-brief.md); [Knowledge Map C-002/C-008/C-012](../02-product/knowledge-map.json) | Selected Hackathon demo |
| REQ-LP-010 | Simulate stock reservation for an approved mock coupon and reconcile it at expiry. | Reserve mock stock when the coupon is issued; when the live ends, return reserved units without a completed purchase. No real inventory is changed. | [Feature Map §3.4](./live-pilot-os-feature-map.md#34-stock-reservation-and-order-state); [Integration Boundaries](./live-pilot-os-integration-boundaries.md); [Knowledge Map C-015](../02-product/knowledge-map.json) | Selected Hackathon demo |
| REQ-LP-011 | Allow operators to configure event/threshold-based automation rules. | Each rule has a versioned condition and action; the system records why it fired and respects the configured approval mode. | [Feature Map §3.5](./live-pilot-os-feature-map.md#35-scenario-automation) | Not selected for current demo |
| REQ-LP-012 | Record AI proposals, policy decisions, human approvals, adapter requests/results, and failures in an operator-visible action log. | Each action record links to its triggering event and has an actor, decision/result, and timestamp; failures and retries are visible. | [Feature Map §4.1](./live-pilot-os-feature-map.md#41-action-log--approval-control); [Sub-features §10](./live-pilot-os-sub-features.md) | Not selected for current demo |
| REQ-LP-013 | Require a Live Ops decision for the Hackathon promotion. | Approval triggers simulated issuance and updates Host status. Rejection does not issue a coupon, shows the Host “not approved” and an optional reason, and ends the flow without an automatic alternative. | [Feature Map §4.2](./live-pilot-os-feature-map.md#42-approval-modes); [Project Brief](../02-product/project-brief.md); [Knowledge Map C-003/C-006/C-013](../02-product/knowledge-map.json) | Selected Hackathon demo |
| REQ-LP-014 | Provide an Emergency Pause that stops automated actions while preserving incoming signal capture and audit logging. | After pause is acknowledged, no new automated pin, voucher, reservation, or scenario action is issued until explicitly resumed. | [Feature Map §4.3](./live-pilot-os-feature-map.md#43-emergency-pause); [Core Features §4](./live-pilot-os-core-features.md#4-risk-screening-and-emergency-operator-control-compliance--operator-control) | Not selected for current demo |
| REQ-LP-015 | Handle platform actions through a simulated adapter for the Hackathon; do not connect to a live commerce platform. | The demo visibly identifies simulated actions. Coupon issuance, countdown, and stock reservation occur only in mock state, after Live Ops approval. | [Feature Map §4.5](./live-pilot-os-feature-map.md#45-platform-adapter-safety); [Integration Boundaries](./live-pilot-os-integration-boundaries.md); [Knowledge Map C-007/E-040](../02-product/knowledge-map.json) | Selected Hackathon demo |
| REQ-LP-016 | Provide separate Host and Live Ops views over one simulated 9:16 live session. | The Host view shows the mock video/chat, interest topics, selected product metrics/details, and Host cues. Live Ops sees the same scenario's interest and promotion review state. | [Project Brief](../02-product/project-brief.md); [Knowledge Map C-011/C-016/C-017](../02-product/knowledge-map.json) | Selected Hackathon demo |

## Hackathon demonstration trace

The documented one-flow demonstration can be traced as:

```text
Mock shampoo live with chat
  → REQ-LP-001 group promotion questions and calculate the two-minute audience ratio
  → REQ-LP-003 show interest, clicks, add-to-cart, price, and stock
  → REQ-LP-004 show product details and Host talking points
  → REQ-LP-009 AI proposes a discount; margin policy adjusts it to keep margin at or above 10%
  → REQ-LP-013 Live Ops approves or rejects
  → REQ-LP-008/010/015 simulate coupon, countdown, and stock reservation after approval
  → update the Host status and viewer state from the Live Ops decision
```

For the current sample, use the fictional 400 mL shampoo, ฿299 list price, ฿105 cost, 12% fee, 250 average viewers, 30 unique interested viewers (12%), and 47 related messages. The sample AI output is 15% off, ฿254.15 after discount, and 46.7% margin. These are mock fixture values, not live product or platform data. The 3-minute initial countdown remains a working assumption.

## Open product decisions

- Confirm the mock starting stock quantity and whether the 3-minute countdown is the desired demo duration.
- Define measurable targets for chat grouping accuracy, AI confidence, and Host-suggestion usefulness if required by Hackathon judging.
- Confirm actual marketplace fee rules and inventory reconciliation before any future real integration; the current 12% fee and stock changes are mock-only.
- Confirm whether moderation and Emergency Pause are required in the Hackathon; they are not in the selected demo flow.

## Related

- [Architecture overview](./overview.md) · [Project Brief](../02-product/project-brief.md) · [Feature Map](./live-pilot-os-feature-map.md)
