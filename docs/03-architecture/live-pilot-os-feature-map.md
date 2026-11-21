# LivePilot OS — Feature Map

> Detailed canonical specification covering the four core features, sub-features, events, policies, MVP flow, and team ownership.

This document groups LivePilot OS sub-features so they align with the four core features for Team Sodality's Hackathon.

> **Selected Hackathon flow:** [Requirements Baseline](./live-pilot-os-requirements.md) and [Project Brief](../02-product/project-brief.md) are authoritative for the current demo. Older numeric examples, shade-02/bundle scenarios, autonomous actions, and Emergency Pause below describe broader product concepts; they are not selected requirements for this demo where they conflict with the baseline.

## Grouping Overview

| Core Feature | Primary Role | Sub-features |
|---|---|---|
| 1. Live Chat & Telemetry Understanding | Understand what is happening in the live stream | Live Chat Understanding AI, Intelligent Comment Moderation, Customer Intent & Hype Dashboard |
| 2. Streamer Co-pilot HUD | Help the host make decisions and sell | AI Host Copilot, Product Q&A Assistant, Stock & Order Alert for the Host screen |
| 3. StreamPilot Agent | Automate back-office actions | Auto Product Pinning, Smart Voucher Engine, Margin Protection, Scenario Automation, Stock & Order Alert for sales control |
| 4. Compliance & Operator Control | Control risk, approvals, and system stops | Action Log & Approval Control, Emergency Pause, Moderation Escalation, Execution Audit |

> Core principle: Feature 1 analyzes the situation, Feature 2 recommends actions to the host, Feature 3 executes actions, and Feature 4 controls risk and provides oversight.

---

## 1. Live Chat & Telemetry Understanding

**BDD contract:** [Feature 01 — Real-Time Chat and Purchase-Signal Analysis](../02-product/bdd/feature-01-live-chat-telemetry.md)<br>
**BRD:** [Feature 01 BRD — Real-Time Chat and Purchase-Signal Analysis](../02-product/brd/feature-01-live-chat-purchase-signal-analysis.md)<br>
This contract maps the three sub-features below to behavior scenarios and the supporting
purchase-signal, reliability, integration, and audit flows.

### Goal

Receive chat and sales signals, then convert them into structured events that other systems can consume.

### Sub-features

#### 1.1 Live Chat Understanding AI

Read the chat in real time and classify intents such as:

- Product interest (`PRODUCT_INTEREST`)
- Price or discount request (`DISCOUNT_REQUEST`)
- Product question (`PRODUCT_QUESTION`)
- Stock or size query (`STOCK_QUERY`, `SIZE_QUERY`)
- Voucher request (`VOUCHER_REQUEST`)
- Complaint (`COMPLAINT`)
- Spam or toxic message (`SPAM`, `TOXIC`)

Primary output:

```json
{
  "event_type": "chat.intent.detected",
  "intent": "PRODUCT_INTEREST",
  "confidence": 0.96,
  "entities": {
    "sku": "SKU_02",
    "variant": "shade 02"
  }
}
```

#### 1.2 Intelligent Comment Moderation

Analyze chat risk without duplicating Shopee's basic moderation features:

- Detect scams
- Detect messages attempting to move customers off-platform
- Detect bot raids based on multi-account behavior
- Detect semantic spam or toxic content
- Rank risk severity
- Escalate to a moderator or host for a decision

Primary output:

```json
{
  "risk_type": "OUT_OF_PLATFORM_ATTEMPT",
  "risk_level": "HIGH",
  "risk_score": 0.97,
  "recommended_action": "ESCALATE_TO_MODERATOR"
}
```

#### 1.3 Customer Intent & Hype Dashboard

Display signals produced by chat and telemetry analysis:

- Number of people interested in a product
- Most-asked-about product
- Purchase or conversion signal
- Voucher usage rate
- Chat sentiment
- Periods of high engagement
- Number of repeated questions per SKU

### Output Events

```text
chat.intent.detected
chat.risk.detected
chat.question.clustered
live.engagement.updated
product.interest.updated
```

### Integration Points

- Send `PRODUCT_INTEREST` to StreamPilot Agent for product-pinning consideration
- Send repeated questions to Streamer Co-pilot to create talking points
- Send risk events to Compliance & Operator Control

---

## 2. Streamer Co-pilot HUD

**BDD contract:** [Feature 02 — Host Screen Assistant (Streamer Co-pilot HUD)](../02-product/bdd/feature-02-streamer-copilot-hud.md)<br>
**BRD:** [Feature 02 BRD — Host Screen Assistant (Streamer Co-pilot HUD)](../02-product/brd/feature-02-host-screen-assistant.md)<br>
This contract maps AI guidance, catalog-grounded Q&A, host alerts, and host approval behavior.

### Goal

Help the host sell more effectively by displaying short, concise, evidence-based recommendations without rewriting the entire script.

### Sub-features

#### 2.1 AI Host Copilot

- Suggest answers for the host to say
- Summarize repeated questions
- Alert the host to products currently receiving attention
- Create product talking points
- Recommend the next product to present
- Display recommendations that can be read in no more than 3 seconds

Example:

```text
Viewers asked about Foundation shade 02 eighteen times in 60 seconds.
Suggested talking point:
“Shade 02 suits medium skin tones, and it is currently available for shipment.”
```

#### 2.2 Product Q&A Assistant

Answer questions using only information from the brand-approved Product Catalog:

- Price
- Color or size
- Ingredients
- Usage instructions
- Suitable customer profile
- Stock
- Shipping
- Returns

Constraints:

- Do not guess information that is not in the catalog
- Do not make medical claims
- Do not confirm pregnancy safety without supporting approved information
- If information is insufficient, send the question to the host for review

#### 2.3 Stock & Order Alert — Host View

Display alerts the host needs to see during the live stream:

- Product nearly out of stock
- Product out of stock
- High order volume
- Best-selling product
- Voucher usage nearing its limit
- Abnormal price or promotion

#### 2.4 Host Approval UI

The host can:

- Use the recommendation
- Edit it before use
- Reject it
- Request more details

### Output Events

```text
copilot.suggestion.created
copilot.alert.created
copilot.answer.approved
copilot.answer.edited
copilot.answer.dismissed
```

### Integration Points

- Receive intent and question clusters from Live Chat & Telemetry Understanding
- Receive stock and promotion state from StreamPilot Agent
- Send approval decisions to Compliance & Operator Control

---

## 3. StreamPilot Agent

**BDD contract:** [Feature 03 — Store Management and Back-Office Profit Protection](../02-product/bdd/feature-03-streampilot-agent.md)<br>
**BRD:** [Feature 03 BRD — Store Management and Back-Office Profit Protection](../02-product/brd/feature-03-store-management-profit-protection.md)<br>
This contract maps product pinning, voucher, margin, inventory, scenario, workflow, and audit behavior.

### Goal

Act as an automated back-office system. Every action must pass policy and guardrails before execution.

### Sub-features

#### 3.1 Auto Product Pinning

When purchase or product intent is detected:

```text
“Please show shade 02.”
→ Resolve SKU_02
→ Verify that the product exists in the Live Catalog
→ Check stock
→ Check confidence
→ Pin the product or send it to the host for approval
```

Capabilities:

- Pin products automatically
- Display the product name, price, and promotion
- Tell the host which SKU to mention
- Move products receiving attention to the top of the list
- Prevent the same product from being pinned too frequently

#### 3.2 Smart Voucher Engine

Create voucher offers based on the situation:

- Issue a voucher when purchase intent is high
- Create a flash voucher when engagement is high
- Limit the number of claims
- Set the start time and expiration time
- Define eligible customer groups
- Send the voucher proposal to Margin Protection before issuing it

Voucher states:

```text
DRAFT → SCHEDULED → ACTIVE → EXHAUSTED
                         └──→ EXPIRED
                         └──→ CANCELLED
```

#### 3.3 Margin Protection

Act as a hard gate before issuing a voucher or changing a promotion:

- Calculate profit after the discount
- Set the minimum margin floor
- Reject vouchers that reduce profit below the threshold
- Alert the host before the promotion is confirmed
- Recommend a safer discount or bundle

Gate results:

```text
APPROVED
NEEDS_APPROVAL
REJECTED
```

Example:

```text
10% discount → 49.27% margin → APPROVED
50% discount → 15.08% margin → REJECTED
Recommend Duo Glow Set → 47.93% margin
```

For the selected Hackathon demo, use the following confirmed policy instead of the illustrative thresholds above:

- Margin floor: 10%.
- Formula: `(net sales after discount − product cost − platform fees) ÷ net sales after discount`.
- AI proposes the discount; deterministic margin policy lowers it if needed to meet the 10% floor.
- Show Live Ops the original and adjusted discount, both margin values, and the adjustment reason. Live Ops approval is required before issuing the mock coupon.
- If Live Ops rejects the offer, do not issue it or generate an alternative. Show the Host the not-approved status and the optional rejection reason.

#### 3.4 Stock Reservation and Order State

- Reserve stock temporarily when a promotion opens
- Prevent overselling
- Return stock when a voucher expires without payment
- Alert when stock falls below the threshold
- Synchronize order and payment state

#### 3.5 Scenario Automation

Set automatic rules from events and thresholds:

```text
Same product asked about >= 5 times
→ Pin the product + alert the host

engagement > 80%
→ Propose a flash voucher

For the selected Hackathon flow, use the 10% margin floor, adjust the candidate discount to meet it, and require Live Ops approval before issue.

stock < 10 units
→ Alert the host
```

Rules should not be stored in a prompt. They should be stored as versioned policy configuration.

### Output Events

```text
product.pin.requested
product.pin.executed
voucher.proposed
voucher.approved
voucher.rejected
stock.reserved
stock.released
scenario.triggered
```

### Integration Points

- Receive intent and engagement from Feature 1
- Send alerts and approval requests to Feature 2
- Send every action and result to Feature 4

---

## 4. Compliance & Operator Control

**BDD contract:** [Feature 04 — Risk Screening and Emergency Operator Control](../02-product/bdd/feature-04-risk-operator-control.md)<br>
**BRD:** [Feature 04 BRD — Risk Screening and Emergency Operator Control](../02-product/brd/feature-04-risk-screening-operator-control.md)<br>
This contract maps action logging, approval modes, Emergency Pause, moderation escalation, adapter safety, and execution audit.

### Goal

Control risk, make every decision auditable, and allow the operator to stop the system immediately.

### Sub-features

#### 4.1 Action Log & Approval Control

Display the action sequence in real time:

```text
14:02:11 Detected purchase intent
14:02:12 Resolved SKU_02
14:02:13 Margin check passed
14:02:14 Pinned SKU_02
14:02:15 Issued 10% voucher
```

Record:

- Event ID
- Live session ID
- Tenant or shop ID
- Actor: AI, host, or system
- Model version
- Policy version
- Proposed action
- Approved action
- Execution status
- Error and retry information

#### 4.2 Approval Modes

```text
RECOMMEND_ONLY
→ AI provides recommendations only

ASSISTED
→ The host must approve

AUTONOMOUS
→ Act automatically when policy checks pass
```

#### 4.3 Emergency Pause

Immediately stop all automated actions when:

- The Shopee Adapter responds slowly
- The system issues a duplicate voucher
- Stock state does not match the central system
- Margin calculation behaves abnormally
- There is a high compliance risk

Pressing `Spacebar` or the Emergency Pause button must:

```text
Stop automatic product pinning
Stop voucher issuance
Stop new stock reservations
Stop scenario automation
Continue receiving and logging chat
```

#### 4.4 Moderation Escalation

Receive risk events from Feature 1 and handle them by severity:

```text
LOW
→ Record in the log

MEDIUM
→ Alert the host or moderator

HIGH
→ Hide on the overlay + stop related actions

CRITICAL
→ Alert the operator + activate Emergency Pause according to policy
```

#### 4.5 Platform Adapter Safety

- Use a simulated adapter for the Hackathon
- Check idempotency before sending an action
- Retry only errors that are safe to retry
- Do not issue a duplicate voucher when the platform result is unknown
- Store the request, response, and correlation ID

### Output Events

```text
approval.requested
approval.resolved
action.logged
action.failed
emergency.pause.activated
emergency.pause.released
compliance.escalated
```

---

## End-to-End Mapping

```text
1. Live Chat & Telemetry Understanding
   Receive chat → classify intent → check risk → summarize signals
                         ↓
2. Streamer Co-pilot HUD
   Create recommendations → show the host → request approval when needed
                         ↓
3. StreamPilot Agent
   Pin product → check margin → create voucher → reserve stock
                         ↓
4. Compliance & Operator Control
   Check policy → log action → retry safely → emergency pause
```

## Selected Hackathon demo flow

The current discovery selects this simulated shampoo scenario:

```text
1. Mock vertical live video and chat show viewers asking about a fictional shampoo promotion.
2. AI groups similar questions and calculates unique interested viewers / average viewers in a rolling two-minute window.
3. Host sees the interest log, product metrics and details, and concise talking points to phrase independently.
4. AI recommends a demand-appropriate discount; deterministic margin policy adjusts it if needed to preserve a 10% floor.
5. Live Ops reviews the original/adjusted discount, both margins, and the adjustment reason.
6. Approval simulates coupon issuance, mock stock reservation, Host approval status, and a viewer banner with product, discount, final price, and countdown to the end of the live.
7. Rejection shows the Host not-approved status and optional reason; no coupon or alternative offer is issued.
```

The demo uses no live-platform integration. Coupon, inventory, chat, and countdown behavior are simulated. The 3-minute starting countdown remains a working assumption; see [A-006](../02-product/assumptions.md).

## Team Ownership

| Member | Primary Ownership |
|---|---|
| Dev 1 — Agentic Core | Intent schema, Jev/LLM decision, Copilot prompt, policy contracts |
| Dev 2 — Backend & Runtime | Message Queue, workers, adapters, margin, voucher, stock, audit API |
| Dev 3 — Frontend Cockpit | Chat view, Host HUD, product/voucher cards, approval, action log, pause control |
| Dev 4 — Scenario, Data & Pitch | Thai test data, scenarios, metrics, demo script, evaluation, and pitch |

---

[Back to LivePilot OS Deep Context](./live-pilot-os-deep-context.md)
