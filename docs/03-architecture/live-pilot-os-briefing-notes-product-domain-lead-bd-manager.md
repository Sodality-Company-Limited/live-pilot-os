# LivePilot OS - Executive Briefing Notes

**Target Role:** Business Development Manager - Product & Domain Lead  
**Team:** Sodality  
**Event:** Sea x OpenAI Regional Codex Hackathon Thailand  
**Date & Venue:** Saturday, 21 November 2026 (10:00 AM - 5:00 PM) | SINGHA COMPLEX, Bangkok  
**Prepared:** 19 November 2026 (T-2 Days Readiness Brief)

## 1. Purpose & Role Mandate

As Product & Domain Lead (Business Development Manager) on Team Sodality, you own problem framing, commercial unit-economics logic, catalog claim governance, baseline boundary documentation, scenario acceptance sign-off, and the stage pitch.

Your primary objective on hackathon day is to ensure judges see LivePilot OS not as a fragile prompt wrapper, but as a disciplined, commercially grounded operational system that pairs OpenAI's language intelligence with deterministic server-side financial and inventory controls.

**Canonical one-line positioning:**

> LivePilot coordinates live-commerce operations and host guidance, with deterministic controls before consequential actions execute.

## 2. Strict Evidence & Claims Discipline (Critical Pitch Rules)

Judges from Sea Group and OpenAI evaluate problem framing, build quality, depth of thinking, and effective use of Codex. Keep these four evidence categories strictly separate:

| Evidence category | What belongs here | How to present it to judges |
|---|---|---|
| **1. Verified facts** | Official Thailand hackathon rules (7-hour hacking window, 10 AM - 5 PM at SINGHA COMPLEX; only event work is judged), our team's domain experience, and passing unit/acceptance test counts. | State directly and confidently as verified facts. |
| **2. Team decisions** | Our dual-loop architecture, minor-unit financial policy, 22% demo margin floor, shared local stock pool model, and B2B SaaS + broadcast-hour commercial structure. | Frame as deliberate engineering and product design choices: “We architected LivePilot to enforce...” |
| **3. Hypotheses** | Commercial impact metrics: reduced attention switching, higher checkout conversion, fewer discount mistakes, reduced back-of-house staffing pressure, or GMV uplift. | Frame explicitly as testable hypotheses to be measured in post-event studio shadow pilots. Never promise guaranteed sales uplift or guaranteed ban prevention. |
| **4. Simulated capabilities** | Shopee Live / TikTok Shop pinning and voucher adapters, local chat overlay filtering, synthetic telemetry fixtures, and optional Garena/ShopeePay reward flows. | Point directly to visible UI badges: `SIMULATED PLATFORM`, `LIVE INFERENCE`, and `REPLAY`. Clarify that native platform APIs are Phase 3 post-certification targets. |

### Quick “Say This / Never Say This” Cheat Sheet

- **SAY:** “We calculate simplified contribution margin in integer minor currency units (ISO 4217) server-side before authorizing any promotion.”
- **NEVER SAY:** “The AI calculates our profit margins” or “This guarantees 40% higher GMV.”
- **SAY:** “Our Messaging Risk Assistant flags risky viewer requests, hides them on our local overlay, and displays a persistent priority alert to warn the host.”
- **NEVER SAY:** “Our Pre-Crime Ban Shield guarantees your TikTok stream can never be banned or throttled.”
- **SAY:** “In this scenario, we observe 42 cart-add events and 3 checkout events in the 30-second telemetry window.”
- **NEVER SAY:** “There are 39 unique abandoned carts” because aggregate event counts lack user-level attribution.
- **SAY:** “@sodality/soda-os is our pre-existing governed development CLI wrapping `codex exec`; 100% of LivePilot OS product code was built today.”
- **NEVER SAY:** Claiming pre-existing harness files as hackathon product code, or claiming SINGHA COMPLEX is Shopee's official headquarters without verification.

## 3. Product Thesis & Operational Problem Framing

### 3.1 Real Studio Pain Points (Why LivePilot Exists)

During high-velocity live broadcasts, a human host and 1-3 back-of-house operators face acute attention switching:

1. **Core host reality and script flow:** Experienced live-commerce hosts already bring their own primary selling pitch, personal energy, and airtime flow. Streamer Co-pilot does not attempt to dictate or replace their main narrative; it acts as an unobtrusive tactical overlay that delivers real-time catalog Q&A facts, audience intent alerts, and validated promo cues exactly when needed.
2. **Front-of-camera host bottleneck:** A streamer cannot simultaneously perform with high energy, scan hundreds of scrolling Thai comments per minute, recall verified ingredient facts, avoid platform-prohibited keywords, and calculate promotional discounts in their head.
3. **Back-of-camera operator bottleneck:** Laptop assistants lag behind buyer-intent surges when pinning SKUs, accidentally oversell shared stock across multi-camera streams, or issue stacked flash vouchers that push contribution margins below sustainable floors.

### 3.2 Mapping the 18 Studio Live-Stream Failure Modes

If judges ask how LivePilot fits into real broadcast studio operations, divide studio problems into three buckets:

**Directly solved by LivePilot OS (software and decision layer):**

- No host script, dead air, or lost momentum: Streamer Co-pilot HUD delivers real-time, single-sentence Thai scripts grounded in catalog facts.
- Traffic enters from ads without converting, the expected hero SKU stalls, or there is no basket-pinning plan: StreamPilot Agent clusters intent, pins products, and proposes bounded flash vouchers or validated bundle alternatives.
- Ops-team confusion during live: the shared 3-Panel Operator Cockpit and auditable decision trace provide coordination.
- Messaging and compliance violations: Messaging Risk Assistant flags off-platform redirect bait such as “แอดไลน์” and “โอนตรง”, plus overclaims.

**Partially mitigated by LivePilot OS (coordination layer):**

- Creator arrives late, co-hosts are out of sync, or there is no floor coordinator: pre-loaded SKU catalogs, margin floors, and shared HUD tactical cues align hosts immediately.

**Out of software scope (handled through studio hardware SOPs):**

- Camera disconnects, dead mic batteries, lighting flicker, PC crashes, and stream drops are physical-layer issues handled by hardware redundancy (UPS, dual-WAN, and dual wireless mics). Explicitly acknowledge this to keep software scope honest and sharp.

### 3.3 Competitive Differentiation (Why Not Chinese AI Avatar Suites?)

- **Chinese AI suites** (Baidu, Tencent, Silicon Intelligence): built primarily to replace human hosts with 24/7 digital avatars during off-peak graveyard shifts (1 AM - 8 AM), relying on static price cards or unchecked RAG Q&A.
- **LivePilot OS:** built for prime-time human-led commerce. It empowers the human host's persuasion on camera (Co-pilot) while automating error-prone back-of-house console execution under strict server-side financial guardrails (StreamPilot).

## 4. Architecture, Financial Policy & Scenario Numbers

### 4.1 The Dual-Loop Decision Pipeline

1. **Ingress:** A live or replay event arrives (`IngressEventEnvelope`) with chat messages treated strictly as untrusted data and separate aggregate counters (`cartAddEventsCount`, `checkoutEventsCount`).
2. **Selective context pruning:** The backend selects only the active platform policy, active SKU plus fallback bundle facts, and recent telemetry. This prevents token bloat and protects SaaS gross margins.
3. **Bounded AI proposal:** OpenAI Structured Outputs (`ModelProposalPayload`) summarizes dominant intent, proposes an action from an allowed enum, and drafts Thai host wording citing verified `factIds`. The model cannot author authoritative prices, margins, stock balances, or execution confirmations.
4. **Deterministic policy gate (server code):**
   - Validates schema, state freshness (`expectedStateVersion`), and the idempotency key.
   - Evaluates Simplified Contribution Margin in ISO 4217 integer minor units (satang for THB, cents for SGD/USD, sen for MYR, and whole units for IDR/VND) and basis points (10,000 bps = 100%).
   - Verifies shared local inventory availability: `available = on_hand - reserved >= 0`.
5. **Execution and coordinated output:** Dispatches to the platform adapter (simulated in MVP), logs `SUCCEEDED`, `BLOCKED`, `FAILED`, or `UNKNOWN` on timeout without blind retry, and updates both store state and the Streamer Co-pilot HUD.

### 4.2 Financial Formula & Verified Demo Math Cheat Sheet

These figures are for the pitch and Q&A. Label them clearly as a **Simplified Contribution Margin**, excluding fulfillment, returns, ad spend, and tax effects for the demo.

**Formula (server-side integer minor units):**

- `effective_price = base_price * (1 - discount_fraction)` (half-up rounded to nearest minor unit)
- `platform_fee = effective_price * platform_fee_fraction` (half-up rounded to nearest minor unit)
- `contribution = effective_price - cogs - gift_cost - platform_fee`
- `contribution_margin = contribution / effective_price`

| Demo fixture | Base price | Discount | Effective price | COGS + gift | Platform fee | Contribution | Exact margin | Required floor | Policy verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Scenario 1: Hya-Cica Serum (`SKU_01`) | THB 390.00 (39000) | 10% (1000 bps) | THB 351.00 (35100) | THB 150.00 (15000) | 8% / THB 28.08 (2808) | THB 172.92 (17292) | 49.265% | 22.00% (2200 bps) | **ACCEPTED** (Voucher Issued) |
| Scenario 2 Primary: Serum (`SKU_01`) | THB 390.00 (39000) | 50% (5000 bps) | THB 195.00 (19500) | THB 150.00 (15000) | 8% / THB 15.60 (1560) | THB 29.40 (2940) | 15.077% | 22.00% (2200 bps) | **BLOCKED** (Below Margin Floor) |
| Margin Boundary Check (`SKU_01`) | THB 390.00 (39000) | 45.05% (4505 bps) | THB 214.31 (21431) | THB 150.00 (15000) | 8% / THB 17.14 (1714) | THB 47.17 (4717) | 22.010% | 22.00% (2200 bps) | **ACCEPTED** (4506 bps = 21.996% blocks) |
| Scenario 2 Fallback: Duo Glow (`BUNDLE_01`) | THB 590.00 (59000) | 0% (0 bps) | THB 590.00 (59000) | THB 260.00 (26000) | 8% / THB 47.20 (4720) | THB 282.80 (28280) | 47.932% | 22.00% (2200 bps) | **ACCEPTED** (Independently Validated) |
| Optional Extension: Gaming Offer (`GAMING_01`) | THB 119.00 (11900) | 0% (0 bps) | THB 119.00 (11900) | THB 95.00 (9500) | 5% / THB 5.95 (595) | THB 18.05 (1805) | 15.168% | 12.00% (1200 bps) | **ACCEPTED** (Simulated Offer Only) |

### 4.3 Grounded Product Fact Registry Rules

Ensure host scripts in all fixtures and live prompts cite only the fixture fact registry (`DEMO_FIXTURE_ASSUMPTION`):

- `FACT_SKU01_01`: Contains Hyaluronic Acid and Centella Asiatica (Cica) extract.
- `FACT_SKU01_02`: Formulated without added fragrance or drying alcohol.
- `FACT_SKU01_03`: Listed retail price is THB 390 for 30ml.
- **Strict red lines:** Never infer pregnancy safety from sensitive-skin facts (advise consulting a physician), never invent “imported extract cost” excuses, and never include uncosted free gifts in `BUNDLE_01` unless their cost is added to `giftCostMinorUnits`.

## 5. Business Model & Go-To-Market Summary

### 5.1 Customer Segments

1. **Beachhead:** Mid-to-high-volume SEA live-commerce brands and sellers (skincare, cosmetics, FMCG, and fashion) running multi-hour daily broadcasts with a host and small ops team.
2. **B2B multipliers:** Multi-Channel Networks (MCNs), TikTok Shop Partners (TSPs), and live-stream studio operators running concurrent rooms for multiple client brands.
3. **Optional expansion:** Gaming and esports broadcasts monetizing match moments via bounded digital-item offers.

### 5.2 Revenue Architecture (Proposed Team Decision)

- **Tiered SaaS subscription (per studio room):**
  - Creator / SMB Pro: Co-pilot HUD, single-channel deterministic margin guardrails, and base monthly broadcast hours.
  - Brand / MCN Studio: Multi-room cockpit, cross-platform shared local inventory reservations, custom policy versioning, and full decision audit logs.
- **Metered broadcast-hour packs:** Predictable overage pricing per active stream hour, aligning variable OpenAI inference and WebSocket compute costs directly with customer usage.
- **Enterprise custom integration:** ERP/WMS stock webhooks and custom regulatory claim registries.

### 5.3 Three-Phase Validation Roadmap

- **Phase 1 - Hackathon MVP (Today / 21 Nov):** End-to-end commerce workflow with minor-unit margin kernel, shared stock pool, live OpenAI Structured Outputs, and simulated platform adapters.
- **Phase 2 - Studio Shadow Pilots:** Deploy Co-pilot HUD on studio iPads alongside human operators in real Thai broadcasts to empirically measure response latency, blocked margin breaches, and host cognitive load.
- **Phase 3 - Certified Native Automation:** Integrate official Shopee Open Platform and TikTok Shop Partner APIs under merchant-authorized scopes.

## 6. On-Site Sprint Checklist (21 November 2026)

Official hacking runs 7 hours (10:00 AM - 5:00 PM); the internal core build target is 4 hours, leaving buffer for live testing, edge-case hardening, and pitch polish.

- **Block 1 (first 30 minutes - baseline and governance audit):** Create `BASELINE_DISCLOSURE.md` documenting `@sodality/soda-os v1.24.0` (pre-existing CLI/Codex orchestration harness) versus 100% new LivePilot OS product code built during the event. Finalize the JSON catalog fixture (`SKU_01`, `SKU_02`, `BUNDLE_01`) and fact registry (`FACT_SKU01_01`-`03`), verifying zero uncosted gifts or unverified medical claims.
- **Block 2 (next 90 minutes - scenario and copy verification):** Write and review deterministic fallback Thai scripts and replay event envelopes for Scenario 1 (10% allowed), Scenario 2 (50% blocked -> Bundle), Scenario 3 (off-platform messaging risk), and Adapter Timeout (`UNKNOWN` state). Verify the Cockpit UI shows 42 Cart-Add Events and 3 Checkout Events separately, plus explicit `SIMULATED PLATFORM` and `LIVE INFERENCE` / `REPLAY` badges.
- **Block 3 (next 60 minutes - live AI red-teaming):** Test live viewer chat inputs in Thai, including pregnancy questions, 50% discount pressure, and prompt-injection attempts, to confirm the model stays grounded and server guardrails cannot be bypassed.
- **Block 4 (final 60 minutes plus buffer - acceptance sign-off and rehearsal):** Sign off on all minimum acceptance criteria (`AC-1.1` through `AC-5.1`). Run at least 5 timed rehearsals of the 3-minute live demo alongside the stage operator.

## 7. 3-Minute Stage Pitch Script & Judge Q&A Playbook

### 7.1 Timed 180-Second Run of Show

- **0:00-0:35 | Problem and positioning:** “During a busy live-commerce broadcast, a host and a small ops team have to perform on camera, read fast-scrolling Thai chat, answer product suitability questions, track stock, and calculate discount margins all at once. Our hypothesis is that coordinating store execution and host guidance in one governed system reduces attention switching and prevents costly operational mistakes. LivePilot OS pairs OpenAI intent analysis with deterministic server-side controls before any consequential action executes.”
- **0:35-1:20 | Scenario 1 - useful workflow, allowed 10% promotion:** “Here we ingest suitability questions alongside 42 cart-add events and 3 checkout events. OpenAI summarizes the intent and proposes a 10% seller voucher on our THB 390 serum. Before anything executes, our backend calculates the simplified contribution margin in integer minor units: at THB 351 effective price, THB 150 COGS, and 8% fee, our margin is 49.27% - well above our 22% floor. Only after our simulated adapter confirms reservation and issuance does the Streamer Co-pilot display a concise Thai talking point citing verified fragrance-free catalog facts.”
- **1:20-2:10 | Scenario 2 - blocked action, margin protection and validated bundle:** “Next, viewers push for a 50% discount. If an unchecked agent or rushed assistant issued that voucher, effective price drops to THB 195 and contribution margin falls to 15.08% - violating our 22% floor. LivePilot blocks the action server-side: zero vouchers are issued. Instead, the backend independently validates our Duo Glow Bundle at THB 590 - confirming a 47.93% margin and component stock for both items - and updates the host's HUD to pitch the bundle.”
- **2:10-2:45 | Scenario 3 - messaging risk and timeout recovery:** “When a viewer asks to transact off-platform, our Messaging Risk Assistant filters the message on our local overlay and displays a persistent alert so the host redirects buyers safely to the native basket. And if an adapter times out after dispatch, LivePilot marks the action UNKNOWN rather than blindly retrying - preventing duplicate vouchers - while giving the operator an immediate pause and reconciliation control.”
- **2:45-3:00 | Close and Codex build governance:** “Built from scratch today using OpenAI Codex within our @sodality/soda-os verification workflow, every live and replay event runs through the exact same test-verified pipeline. LivePilot makes live-commerce AI fast for hosts and safe for unit economics. Thank you.”

### 7.2 High-Probability Judge Questions & Winning Answers

1. **Why not enforce the 22% margin rule inside the system prompt?**  
   Prompts are probabilistic and exposed to untrusted viewer chat; financial ledgers must be deterministic. OpenAI is used where language models excel - intent clustering across messy Thai chat and natural script drafting - while pricing, integer minor-unit math, stock reservations, and idempotency remain strictly in server code.
2. **Are you actually connected to Shopee Live or TikTok Shop APIs right now?**  
   In today's hackathon build, platform adapters are explicitly simulated and badged as `SIMULATED PLATFORM` in the UI. Every mutation passes through a clean adapter interface with idempotency keys and `UNKNOWN` timeout handling so certified Shopee Open Platform and TikTok Shop Partner webhooks can be swapped in during Phase 3 without changing the core engine.
3. **How did you use OpenAI Codex during the hackathon?**  
   We used `@sodality/soda-os`, our pre-existing CLI governance harness, to dispatch bounded implementation goals to `codex exec` with strict file touch-maps and automated Vitest verification suites covering margin boundaries (45.05% vs 45.06%), duplicate-event rejection, and fallback routing. All LivePilot OS application code was built today.
4. **Won't an extra screen distract the live streamer?**  
   Streamers are currently distracted because they try to read 100 raw scrolling comments on a phone. The Co-pilot HUD replaces that wall of text with one non-strobing priority banner, one verified Thai sentence to read aloud, and one stage cue, while back-of-house mechanics stay on the operator's side of the cockpit.
5. **How do you align incentives between third-party creators and brand owners?**  
   Creators want higher conversion to maximize commission, while brand owners need strict margin protections and catalog compliance. LivePilot OS bridges both by giving creators real-time, verified script cues to convert buyers without letting them issue unauthorized stackable discounts or unapproved product claims.
6. **How do you handle sensitive COGS data and cross-platform inventory neutrality?**  
   COGS and margin policy rules are kept strictly in server-side encrypted storage and never exposed to front-end clients or model context. For inventory, LivePilot maintains a platform-neutral local stock pool that reserves inventory across multi-stream broadcasts, preventing overselling across Shopee, TikTok, and Lazada.
7. **How does your margin engine handle complex fee stacks and cash-on-delivery return risks?**  
   The integer minor-unit formula supports composable fee rules, allowing brands to configure platform commissions, payment processing fees, and estimated COD return/refurbishment risk buffers directly into the baseline cost structure before the 22% contribution margin floor is evaluated.

