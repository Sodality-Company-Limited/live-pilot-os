# LivePilot OS — Core Features

> Canonical English summary of the four core features.

Complete, hackathon-ready version of the LivePilot OS core features.
Primary target users: Live-stream creators, product-owning brands, and MCN back-office teams on Shopee Live and TikTok Shop.
Core concept: Live streamers already have their own scripts and sales rhythm. LivePilot OS does not rewrite the entire script; it acts as a timely-alert assistant for the host (Streamer Co-pilot), alongside an automated back-office system that precisely controls profit floors and inventory (StreamPilot Agent).

> **Current Hackathon scope:** Use the Host and Live Ops roles and the approved flow in the [Requirements Baseline](./live-pilot-os-requirements.md) and [Project Brief](../02-product/project-brief.md). The legacy 22% examples, automatic issue/alternative-bundle behavior, and Emergency Pause below are broader product concepts, not selected behavior for this demo.

## 1. Real-Time Chat and Purchase-Signal Analysis (Live Chat & Telemetry Understanding)

- Automatically read and group viewer intent by analyzing large volumes of live-stream comments and summarizing primary needs, such as product suitability questions (for example, whether a product is suitable for sensitive skin), discount or promotion requests, and attempts to move the conversation off-platform.
- Clearly separate behavioral metrics: show viewers who added products to their carts (Cart-Add Events) separately from successful payments (Checkout Events), making it possible to identify periods when interest is high but viewers are still hesitant to pay.

## 2. Host Screen Assistant (Streamer Co-pilot HUD)

- Show short recommendation labels that can be read in 3 seconds. Display brief messages only when the chat repeats a question or a new promotion appears, allowing the host to incorporate them immediately into their own sales rhythm without losing focus.
- In production, answer questions only from brand-approved product data. For the Hackathon, use the fictional approved shampoo catalog and clearly identify its data as mock.
- Show product details, price, and stock to the Host. Show a simulated countdown when the approved mock coupon is released; it ends with the mock live session.

## 3. Store Management and Back-Office Profit Protection (StreamPilot Agent)

- Automatically pin products (simulated through an Adapter). When the AI detects a sharp increase in purchase intent, immediately send a command to pin the primary product or the appropriate product set.
- Check the profit floor before issuing a coupon (Margin Protection). Calculate unit-level net profit on the server before approving every discount, deducting product cost, the cost of giveaways, and platform fees.
- For the selected Hackathon scenario, enforce a 10% margin floor using `(net sales after discount − product cost − platform fees) ÷ net sales after discount`. AI proposes a discount; deterministic policy adjusts it if needed and shows the original/adjusted discount, both margins, and the reason to Live Ops.
- Require Live Ops approval before simulated coupon issuance. Approval releases the coupon; rejection does not issue it and does not generate an alternative offer.
- Simulate stock reservation when the approved coupon is released. When the mock live ends, return reserved units that were not purchased. Do not mutate real platform inventory.

## 4. Risk Screening and Emergency Operator Control (Broader capability, not selected for this Hackathon flow)

- Alert on prohibited terms and off-platform redirection. Detect comments that encourage direct transfers or adding LINE (such as "add LINE to order directly"), hide the message from the system Overlay, and immediately show a warning bar to the host to prevent the prohibited term from being spoken on air.
- Provide transparent activity logging and an emergency stop button. Display the complete decision sequence in real time, including the AI proposal, server profit calculation, and inventory and platform status. Handle delayed platform responses without issuing duplicate coupons, and provide an Emergency Pause button that immediately stops all automated systems when the host presses the Spacebar.

---

[Back to LivePilot OS Deep Context](./live-pilot-os-deep-context.md)
