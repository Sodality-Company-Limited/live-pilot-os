# LivePilot OS — Core Features

> Canonical English summary of the four core features.

Complete, hackathon-ready version of the LivePilot OS core features.
Primary target users: Live-stream creators, product-owning brands, and MCN back-office teams on Shopee Live and TikTok Shop.
Core concept: Live streamers already have their own scripts and sales rhythm. LivePilot OS does not rewrite the entire script; it acts as a timely-alert assistant for the host (Streamer Co-pilot), alongside an automated back-office system that precisely controls profit floors and inventory (StreamPilot Agent).

## 1. Real-Time Chat and Purchase-Signal Analysis (Live Chat & Telemetry Understanding)

- Automatically read and group viewer intent by analyzing large volumes of live-stream comments and summarizing primary needs, such as product suitability questions (for example, whether a product is suitable for sensitive skin), discount or promotion requests, and attempts to move the conversation off-platform.
- Clearly separate behavioral metrics: show viewers who added products to their carts (Cart-Add Events) separately from successful payments (Checkout Events), making it possible to identify periods when interest is high but viewers are still hesitant to pay.

## 2. Host Screen Assistant (Streamer Co-pilot HUD)

- Show short recommendation labels that can be read in 3 seconds. Display brief messages only when the chat repeats a question or a new promotion appears, allowing the host to incorporate them immediately into their own sales rhythm without losing focus.
- Answer questions using real product data only (Anti-Hallucination). Retrieve information exclusively from the brand-approved database, such as price and ingredients, including whether the product is free from fragrance and alcohol. Refuse unverified medical or pregnancy-safety questions.
- Show stock alerts and a countdown clock when a flash-sale coupon is released, and alert the host when a product is nearly out of stock.

## 3. Store Management and Back-Office Profit Protection (StreamPilot Agent)

- Automatically pin products (simulated through an Adapter). When the AI detects a sharp increase in purchase intent, immediately send a command to pin the primary product or the appropriate product set.
- Check the profit floor before issuing a coupon (Margin Protection). Calculate unit-level net profit on the server before approving every discount, deducting product cost, the cost of giveaways, and platform fees.
- When the threshold is met, such as a 10% discount, net profit is 49.27% (above the 22% minimum floor). The system immediately reserves inventory and releases the time-limited coupon.
- When the threshold is not met, such as when a customer pressures the host for a 50% discount, net profit would be only 15.08% (below 22%). The system immediately blocks the coupon to prevent a loss, then calculates the value of an alternative product set (Duo Glow Set) with a 47.93% profit margin and automatically pins that set instead.
- Reserve inventory centrally to prevent overselling. Deduct temporary inventory reservations in real time when a promotion is released, and automatically return the inventory to the warehouse when the promotion expires without a completed payment.

## 4. Risk Screening and Emergency Operator Control (Compliance & Operator Control)

- Alert on prohibited terms and off-platform redirection. Detect comments that encourage direct transfers or adding LINE (such as "add LINE to order directly"), hide the message from the system Overlay, and immediately show a warning bar to the host to prevent the prohibited term from being spoken on air.
- Provide transparent activity logging and an emergency stop button. Display the complete decision sequence in real time, including the AI proposal, server profit calculation, and inventory and platform status. Handle delayed platform responses without issuing duplicate coupons, and provide an Emergency Pause button that immediately stops all automated systems when the host presses the Spacebar.

---

[Back to LivePilot OS Deep Context](./live-pilot-os-deep-context.md)
