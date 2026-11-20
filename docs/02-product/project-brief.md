# Project brief — Live OS Hackathon demo

> **Status:** Draft based on the 2026-11-20 discovery. This brief covers the Hackathon demo only. Commercial validation and post-Hackathon planning are out of scope.

## Vision

Show how AI can help a Host respond to audience interest during a live sale while helping Live Ops review a promotion against a clear margin floor.

## Problem

During a live session, the Host cannot keep up with every repeated question while presenting. Live Ops must interpret chat interest and check whether a proposed promotion meets the store's profitability rule. The Host and Live Ops need separate views that reflect the same live scenario and promotion status.

## Solution

Build a simulated live-shopping control room with separate Host and Live Ops views, a mock 9:16 live video and chat, and a fictional shampoo catalog.

- AI groups similar chat messages and estimates product-promotion interest as unique interested viewers divided by average concurrent viewers in a rolling two-minute window.
- The Host sees the interest topics, audience and product metrics, product details, and concise talking points that the Host can phrase independently.
- AI recommends a demand-appropriate discount using product economics. If the recommendation would put margin below 10%, it lowers the discount until the floor is met. Live Ops sees the original and adjusted discounts, both margin values, and why the adjustment was made.
- Live Ops approves or rejects the recommendation. Approval immediately simulates issuing the promotion. Rejection shows the Host a not-approved status and, if supplied, the reason; the flow ends without issuing another offer.
- After approval, viewers see a mock promotion banner with the product, discount, and price after discount. The coupon expires when the mock live ends. The mock session reserves stock when the coupon is released and returns unpurchased reserved stock at expiry.
- The demo has no live-platform connection. Video, chat, coupon issuance, stock reservation, and countdown are simulated.

## In scope / out of scope

| In scope for the Hackathon demo | Out of scope |
|---|---|
| Separate Host and Live Ops views | Real Shopee, TikTok, or other platform integration |
| Mock video, chat, audience metrics, product catalog, and coupon behavior | Real coupon issuance, payments, or inventory changes |
| Chat grouping, two-minute audience-interest ratio, Host talking points, and promotion recommendation | Commercial buyer validation, revenue model, or post-Hackathon roadmap |
| 10% margin floor and Live Ops approval/rejection flow | Automatic issuance without Live Ops approval |
| Mock countdown ending with the live session | Real stock reservation or platform countdown |

## Users

- **Host:** Presents the product, sees chat topics and product interest, and uses talking points in their own words.
- **Live Ops:** Reviews the AI promotion recommendation and margin evidence, then approves or rejects it.

The Hackathon demo defines these as product roles. It does not validate the commercial buyer segment.

## Core journey

1. A mock live session shows a vertical video, viewer chat, and audience count.
2. AI groups repeated product and promotion questions. The interest ratio uses unique interested viewers in the rolling two-minute window divided by average concurrent viewers in the same window.
3. The Host sees the saved interest topics, product metrics (interested viewers, clicks, add-to-cart, price, and stock), and product details (name, size, selling points, usage, price, and stock). AI provides short talking points, not a ready-to-say script.
4. AI proposes a discount. Margin is calculated as `(net sales after discount − product cost − platform fees) ÷ net sales after discount`. If needed, AI lowers the original discount to preserve the 10% minimum margin.
5. Live Ops reviews the original and adjusted discount, the margin for both, and the adjustment reason.
6. If Live Ops approves, the demo simulates issuing a coupon, reserves mock stock, updates the Host status, and shows viewers a banner with the product, discount, discounted price, and countdown. The coupon expires when the mock live ends; unpurchased reserved stock returns to the mock inventory.
7. If Live Ops rejects, the Host sees “ไม่อนุมัติ” and the optional rejection reason. No coupon is issued and AI does not generate an alternative.

## Mock scenario

These values are fictional demo data, not real product, audience, platform, or fee data.

| Item | Mock value |
|---|---:|
| Product | Fictional shampoo, 400 mL |
| List price | ฿299 |
| Product cost | ฿105 |
| Platform fee | 12% of net sales after discount |
| Average concurrent viewers | 250 |
| Unique viewers asking about a shampoo promotion in two minutes | 30 (12%) |
| Related chat messages | 47 |
| Sample AI recommendation | 15% off (฿254.15 after discount), 46.7% margin |
| Margin floor | 10% |

The sample 15% recommendation is specific to this fixture; it is not a fixed discount rule.

## Demo success

The demo is successful when the audience can follow one complete scenario from repeated chat questions to the audience-interest ratio, Host cue, margin-checked promotion, Live Ops decision, and the resulting Host/viewer status. All simulated actions must be visibly presented as mock behavior.

No numeric target is approved for chat-intent accuracy, AI confidence, or Host-suggestion usefulness.

## Open items and assumptions

- **A-006:** A 3-minute initial mock-live countdown is a working assumption for a brief demo. The timer is simulated and the coupon expires when the mock live ends.
- Choose the fictional shampoo's starting stock quantity for the demo.
- Define a measurable target for chat grouping and Host-suggestion usefulness if the Hackathon judging plan requires one.
- Confirm the canonical name used in the pitch and UI: Live OS or LivePilot OS.

## Related

- [Knowledge map](knowledge-map.json) · [Knowledge digest](knowledge-digest.md) · [Assumptions](assumptions.md)
- [LivePilot OS core features](../03-architecture/live-pilot-os-core-features.md)
- [Knowledge governance](../06-workflows/knowledge-governance.md)
