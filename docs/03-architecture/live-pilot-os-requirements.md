# LivePilot OS Requirements Baseline

> **Status:** Draft baseline derived from the canonical feature documents. Product approval is pending. These IDs are stable references for goal traceability; they do not imply that every requirement is in the Hackathon MVP.

## ID and authority rules

- Requirement IDs use `REQ-LP-NNN` and must not be reused.
- This file is the canonical register. The feature map and summary documents are source material linked below.
- A Goal must cite one or more requirement IDs. A requirement may map to multiple Goals when its delivery is split.
- `MVP candidate` means included in the documented Hackathon demonstration flow, not approved production scope.
- Numeric examples in source documents (such as 10%, 22%, or 80%) remain examples until a product decision approves them as policy.

## Requirements

| ID | Requirement | Minimum observable acceptance | Source | Scope status |
|---|---|---|---|---|
| REQ-LP-001 | Classify incoming live chat into product, price/discount, product question, stock/size, voucher, complaint, spam, and toxic intents; attach relevant product/SKU entities when resolvable. | Given representative chat samples, each produces a typed signal; unresolved product references remain unresolved instead of being guessed. | [Feature Map §1.1](./live-pilot-os-feature-map.md#11-live-chat-understanding-ai); [Sub-features §1](./live-pilot-os-sub-features.md) | MVP candidate |
| REQ-LP-002 | Detect risky chat such as scams, off-platform redirection, bot raids, spam, and toxic content, with a severity and recommended handling. | A detected risk is routed to the configured moderation path and recorded; it is not treated as ordinary product interest. | [Feature Map §1.2](./live-pilot-os-feature-map.md#12-intelligent-comment-moderation); [Feature Map §4.4](./live-pilot-os-feature-map.md#44-moderation-escalation) | Prioritization pending |
| REQ-LP-003 | Aggregate chat and telemetry into product-interest and engagement signals for the operator dashboard. | The dashboard distinguishes interest/cart-add signals from checkout/payment events and identifies the most-asked-about product from available events. | [Core Features §1](./live-pilot-os-core-features.md#1-real-time-chat-and-purchase-signal-analysis-live-chat--telemetry-understanding); [Feature Map §1.3](./live-pilot-os-feature-map.md#13-customer-intent--hype-dashboard) | MVP candidate |
| REQ-LP-004 | Provide the Host with brief, timely cues based on repeated questions, product interest, or a new promotion without replacing the Host's script. | A cue identifies its related product/topic and can be read at a glance; the Host can use, edit, or dismiss a recommendation. | [Feature Map §2.1](./live-pilot-os-feature-map.md#21-ai-host-copilot); [Feature Map §2.4](./live-pilot-os-feature-map.md#24-host-approval-ui) | MVP candidate |
| REQ-LP-005 | Answer product questions only from the brand-approved product catalog and escalate when information is missing or restricted. | Answers cite available catalog facts; unsupported medical or pregnancy-safety claims are not generated as facts. | [Feature Map §2.2](./live-pilot-os-feature-map.md#22-product-qa-assistant); [Core Features §2](./live-pilot-os-core-features.md#2-host-screen-assistant-streamer-co-pilot-hud) | Prioritization pending |
| REQ-LP-006 | Alert the Host or operator about important stock, order, payment, or promotion-limit changes. | Alerts name the affected product and event; unavailable or stale inventory is shown as unknown rather than current. | [Feature Map §2.3](./live-pilot-os-feature-map.md#23-stock--order-alert--host-view); [Feature Map §3.4](./live-pilot-os-feature-map.md#34-stock-reservation-and-order-state) | Prioritization pending |
| REQ-LP-007 | Resolve a product-interest signal to a catalog item and propose or execute product pinning according to the selected approval mode. | The item is validated against the catalog and stock state before pinning; uncertain matches do not trigger an automatic action. | [Feature Map §3.1](./live-pilot-os-feature-map.md#31-auto-product-pinning) | MVP candidate |
| REQ-LP-008 | Create time-bounded vouchers with configured eligibility and claim limits, subject to the margin gate. | Voucher lifecycle transitions are visible; an offer cannot become active before required policy checks pass. | [Feature Map §3.2](./live-pilot-os-feature-map.md#32-smart-voucher-engine) | Prioritization pending |
| REQ-LP-009 | Evaluate every proposed discount against a configured minimum contribution-margin floor before issuance. | Above-floor offers return an allowed decision; below-floor offers are blocked and may include a safer alternative. Calculation inputs and result are auditable. | [Feature Map §3.3](./live-pilot-os-feature-map.md#33-margin-protection); [Core Features §3](./live-pilot-os-core-features.md#3-store-management-and-back-office-profit-protection-streampilot-agent) | MVP candidate |
| REQ-LP-010 | Reserve stock for active promotions and reconcile reservations with payment, expiry, and cancellation outcomes. | A reservation is released or finalized exactly once for each terminal outcome; stale or unknown platform outcomes do not create duplicate reservations. | [Feature Map §3.4](./live-pilot-os-feature-map.md#34-stock-reservation-and-order-state) | Prioritization pending |
| REQ-LP-011 | Allow operators to configure event/threshold-based automation rules. | Each rule has a versioned condition and action; the system records why it fired and respects the configured approval mode. | [Feature Map §3.5](./live-pilot-os-feature-map.md#35-scenario-automation) | Prioritization pending |
| REQ-LP-012 | Record AI proposals, policy decisions, human approvals, adapter requests/results, and failures in an operator-visible action log. | Each action record links to its triggering event and has an actor, decision/result, and timestamp; failures and retries are visible. | [Feature Map §4.1](./live-pilot-os-feature-map.md#41-action-log--approval-control); [Sub-features §10](./live-pilot-os-sub-features.md) | MVP candidate |
| REQ-LP-013 | Support recommendation-only, assisted, and autonomous approval modes, with explicit human approval where configured. | An action requiring approval cannot execute before approval; the selected mode and decision are recorded. | [Feature Map §4.2](./live-pilot-os-feature-map.md#42-approval-modes) | Prioritization pending |
| REQ-LP-014 | Provide an Emergency Pause that stops automated actions while preserving incoming signal capture and audit logging. | After pause is acknowledged, no new automated pin, voucher, reservation, or scenario action is issued until explicitly resumed. | [Feature Map §4.3](./live-pilot-os-feature-map.md#43-emergency-pause); [Core Features §4](./live-pilot-os-core-features.md#4-risk-screening-and-emergency-operator-control-compliance--operator-control) | MVP candidate |
| REQ-LP-015 | Handle platform actions through an adapter that prevents unsafe duplicate effects and records request/result correlation. | Retrying an uncertain response does not create a duplicate consequential action; adapter mode (simulated or real) is visible. | [Feature Map §4.5](./live-pilot-os-feature-map.md#45-platform-adapter-safety); [Core Features §3](./live-pilot-os-core-features.md#3-store-management-and-back-office-profit-protection-streampilot-agent) | MVP candidate for simulated adapter only |

## Hackathon demonstration trace

The documented one-flow demonstration can be traced as:

```text
Chat asks for shade 02
  → REQ-LP-001 classify interest
  → REQ-LP-003 update product signal
  → REQ-LP-004 show Host cue
  → REQ-LP-007 propose pinning the matched SKU
  → REQ-LP-009 reject a below-floor offer / suggest alternative
  → REQ-LP-012 append the decision trace
  → REQ-LP-014 stop automated actions on operator pause
```

This is a demo slice, not a claim that all production behavior is implemented. The full documented demo sequence is in [Feature Map §Hackathon MVP to Demonstrate](./live-pilot-os-feature-map.md#hackathon-mvp-to-demonstrate).

## Open product decisions

- Approve which requirements are in the Hackathon MVP beyond the documented demo slice.
- Decide whether approval modes other than the demonstrated mode are in scope.
- Confirm margin formula inputs, fee treatment, and the source/owner of the margin floor before treating example percentages as policy.
- Confirm platform-specific capabilities, permissions, rate limits, and adapter behavior before planning real integrations.
- Confirm thresholds, retention periods, and operational owners for moderation, stock alerts, and emergency pause.
