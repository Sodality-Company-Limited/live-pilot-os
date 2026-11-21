# LivePilot OS — Sub-features Quick Reference

> Compact reference list derived from the detailed feature map.

> For the selected Hackathon demo, follow the [Requirements Baseline](./live-pilot-os-requirements.md) and [Project Brief](../02-product/project-brief.md). Examples in this broader product quick reference, including automatic pinning and illustrative thresholds, are not selected Hackathon behavior where they conflict.

> **Feature 01 BDD:** [Real-Time Chat and Purchase-Signal Analysis](../02-product/bdd/feature-01-live-chat-telemetry.md)
> **Feature 02 BDD:** [Host Screen Assistant (Streamer Co-pilot HUD)](../02-product/bdd/feature-02-streamer-copilot-hud.md)
> **Feature 03 BDD:** [Store Management and Back-Office Profit Protection](../02-product/bdd/feature-03-streampilot-agent.md)
> **Feature 04 BDD:** [Risk Screening and Emergency Operator Control](../02-product/bdd/feature-04-risk-operator-control.md)

## 1. Live Chat Understanding AI

Read the chat in real time and classify intents such as:

- Product interest
- Price or discount request
- Product detail request
- Stock or size query
- Voucher request
- Complaint
- Spam or toxic message

## 2. AI Host Copilot

Help the host sell during the live stream:

- Suggest answers for the host to say
- Summarize repeated questions
- Alert the host to products currently receiving attention
- Create product talking points
- Recommend the next product to present

## 3. Auto Product Pinning

When the AI detects customer interest in a product:

```text
Example: “Please show shade 02.” → AI detects SKU_02 → pins SKU_02 → alerts the host to mention the product
```

- Pin products automatically
- Display the name, price, and promotion
- Tell the host which SKU to mention
- Move products receiving attention to the top of the list

## 4. Smart Voucher Engine

Manage vouchers according to the situation:

- Issue a voucher when the customer has purchase intent
- Create a flash voucher when engagement is high
- Limit the number of claims
- Set the start time and expiration time
- Issue vouchers only to suitable customer groups

## 5. Margin Protection

Prevent discounts from causing a loss:

- Calculate profit after the discount
- Set the minimum margin floor
- Reject vouchers that reduce profit below the threshold
- Alert the host before a promotion is confirmed
- Recommend a safer alternative discount

## 6. Product Q&A Assistant

Answer product questions using the product catalog:

> The AI should answer only from real product data to prevent hallucination.

- Price
- Color or size
- Ingredients
- Usage instructions
- Suitable customer profile
- Stock
- Shipping
- Returns

## 7. Stock & Order Alert

Alert on important events:

- Product nearly out of stock
- Product out of stock
- A high volume of orders
- Best-selling product
- Voucher usage nearing its limit
- Abnormal price or promotion

## 8. Intelligent Comment Moderation

Manage live-stream chat:

- Hide spam
- Detect scams
- Detect attempts to move customers off-platform
- Filter abusive language
- Detect bot raids
- Group repeated questions for the host

## 9. Customer Intent & Hype Dashboard

Display live-stream status in real time:

- Number of people interested in a product
- Most-asked-about product
- Conversion signal
- Voucher usage rate
- Chat sentiment
- Periods of high engagement
- Estimated revenue

## 10. Action Log & Approval Control

Show what the AI is doing:

```text
14:02:11 Detected purchase intent
14:02:12 Pinned SKU_02
14:02:13 Margin check passed
14:02:14 Issued 10% voucher
```

Allow the host to choose whether to:

- Let the AI act automatically
- Require approval before acting
- Receive recommendations only

## 11. Scenario Automation

Set automatic rules, for example:

```text
If the same product is asked about more than 5 times → Pin the product + alert the host
If engagement is above 80% → Open a flash voucher
For the selected Hackathon demo, use a 10% margin floor, adjust the candidate discount to meet it, and require Live Ops approval before issue.
If stock is below 10 units → Alert the host
```

---

[Back to LivePilot OS Deep Context](./live-pilot-os-deep-context.md)
