# BRD — Feature 01: Real-Time Chat and Purchase-Signal Analysis

> **Feature ID:** F01  
> **Business capability:** Live Chat & Telemetry Understanding  
> **Document type:** Business Requirements Document  
> **Version:** 1.0  
> **Status:** Draft for product review  
> **Owner:** Product / LivePilot OS team

## 1. Executive summary

LivePilot OS needs to understand what is happening during a live-commerce session in real time.
Feature 01 turns raw chat, cart-add, checkout, order, voucher, stock, and engagement signals
into trustworthy business signals that downstream features can use.

The feature has three canonical sub-features:

1. **Live Chat Understanding AI** — identifies viewer intent and repeated questions.
2. **Intelligent Comment Moderation** — identifies risk and routes it for control.
3. **Customer Intent & Hype Dashboard** — shows live interest, purchase funnel, engagement,
   sentiment, and product attention.

Purchase-signal analysis is a cross-cutting capability. It must keep cart interest,
checkout, and paid order behavior separate so the operator can distinguish attention from
actual conversion.

## 2. Business context

Live-commerce operators currently receive large volumes of unstructured chat and fragmented
platform telemetry while the host is speaking. A useful system must summarize the stream
without interrupting the host, distinguish real purchase intent from noise, and expose risk
before a downstream automation or host response creates harm.

Feature 01 is the observation and classification layer for the governing LivePilot flow:

```text
observe → classify → recommend → verify policy → approve/execute → reconcile → audit
```

It does not own promotion execution, margin calculation, inventory mutation, or operator
pause control. Those responsibilities belong to Feature 03 and Feature 04.

## 3. Business problem

### Current problem

- Chat volume makes it difficult for hosts to see repeated questions and product interest.
- Cart-add, checkout, and paid order behavior can be conflated into one misleading sales metric.
- Spam, scams, toxic content, and off-platform attempts can be mixed with genuine customer intent.
- Downstream automation needs structured, confidence-aware signals rather than raw chat.
- Operators need evidence and traceability for why a signal, alert, or recommendation was created.

### Business impact

If the problem remains unsolved:

- Hosts miss high-intent questions and lose selling opportunities.
- Teams may react to false demand or misread conversion.
- Unsafe or prohibited comments may reach the host overlay.
- Promotion and product actions may be triggered by poor-quality evidence.
- Post-session review cannot explain what the system observed or why it acted.

## 4. Objectives

### Primary objectives

- Convert live chat and commerce telemetry into canonical, versioned events.
- Classify viewer intent and resolve product/SKU context using approved catalog data.
- Detect and rank moderation risk before it reaches the host or downstream automation.
- Separate interest, cart-add, checkout, payment, voucher, and conversion signals.
- Provide real-time product attention, question, hype, and sentiment projections.
- Publish evidence-backed signals to Streamer Co-pilot, StreamPilot, and Compliance.

### Non-objectives

- Directly issue vouchers, pin products, or mutate inventory.
- Calculate contribution margin or approve financial discounts.
- Replace the host's full selling script.
- Replace the platform's complete native moderation system.
- Provide unsupported medical, pregnancy-safety, or other unverified claims.
- Become the authoritative source of money, inventory, or order state.

## 5. Users and stakeholders

| User / stakeholder | Need |
|---|---|
| Live host / streamer | See concise, useful product and question signals without losing speaking rhythm |
| Moderator | Review and resolve chat risk and escalated cases |
| Back-office operator | Understand live demand, conversion, risk, and action-triggering evidence |
| Brand / seller | Protect catalog truth, brand safety, and conversion quality |
| MCN / live studio manager | Monitor multiple sessions and compare live operational signals |
| StreamPilot Agent | Consume structured intent, engagement, and purchase signals |
| Compliance & Operator Control | Consume risk evidence and maintain an auditable control trail |
| Product / engineering team | Integrate stable HTTP and NATS contracts |

## 6. Scope

### In scope

- Live-session-scoped ingestion of chat and commerce telemetry.
- Event validation, normalization, enrichment, deduplication, and late-event handling.
- Intent classification for product, promotion, stock, size, voucher, and complaint signals.
- Product/SKU entity resolution against the approved catalog.
- Question clustering and repeated-question detection.
- Spam, toxic, scam, off-platform, and coordinated behavior screening.
- Risk severity ranking and moderation escalation events.
- Cart-add, checkout, payment/order, and voucher correlation.
- Product interest, conversion, engagement, sentiment, and hype projections.
- Dashboard read models and threshold alerts.
- Versioned NATS event publication and audit traceability.
- Safe handling of low-confidence, stale, duplicate, and unavailable data.

### Out of scope

- Voucher creation or product pin execution.
- Margin policy computation or financial approval.
- Inventory reservation, release, or commit.
- Marketplace platform mutation.
- Final host approval or Emergency Pause implementation.
- Full customer identity resolution beyond the minimum platform-scoped identity needed for deduplication.
- Long-term analytical warehouse or cross-session BI beyond the initial read model.

## 7. Functional business requirements

| ID | Requirement | Business reason | Trace |
|---|---|---|---|
| BR-F01-001 | The system shall accept chat, cart-add, checkout, order/payment, voucher, engagement, and stock signals within an active live-session context. | Create one operational view of the live stream. | F01-FLOW-001/002 |
| BR-F01-002 | The system shall validate, normalize, enrich, and deduplicate incoming events before downstream processing. | Prevent inconsistent or inflated signals. | F01-FLOW-003/004 |
| BR-F01-003 | The system shall handle late and out-of-order events through reconciliation. | Preserve accurate funnel metrics when platforms deliver events asynchronously. | F01-FLOW-005 |
| BR-F01-004 | The system shall classify supported chat intents, including product interest, product question, discount, stock, size, voucher, and complaint. | Convert raw chat into actionable business meaning. | F01.1-FLOW-001–004 |
| BR-F01-005 | The system shall resolve product and SKU context only against the approved catalog. | Prevent wrong-product actions and unsupported claims. | F01.1-FLOW-005/006 |
| BR-F01-006 | The system shall mark low-confidence or ambiguous intent for review and shall not trigger automated commerce actions from it. | Fail safely when evidence is insufficient. | F01.1-FLOW-006/008 |
| BR-F01-007 | The system shall cluster semantically repeated questions by product and time window. | Give hosts a concise view of what viewers need answered. | F01.1-FLOW-007 |
| BR-F01-008 | The system shall detect spam, toxic content, scams, off-platform attempts, and coordinated bot behavior. | Protect the live session and brand. | F01.2-FLOW-001–004 |
| BR-F01-009 | The system shall assign risk severity and recommended handling to each risk signal. | Make moderation behavior deterministic and reviewable. | F01.2-FLOW-005/006 |
| BR-F01-010 | The system shall keep cart-add, checkout, payment/order, and voucher signals as separate measures. | Distinguish interest from actual conversion. | F01.P-FLOW-001–006 |
| BR-F01-011 | The system shall calculate purchase and conversion signals from a defined time window without changing the underlying counts. | Make funnel metrics explainable. | F01.P-FLOW-004/005/007 |
| BR-F01-012 | The system shall publish product-interest, purchase, engagement, question, and risk events through versioned NATS contracts. | Give downstream features stable, typed integration points. | F01.INTEGRATION-001–003 |
| BR-F01-013 | The system shall project dashboard metrics for product interest, repeated questions, conversion, voucher usage, sentiment, hype, and engagement. | Support live operational decisions. | F01.3-FLOW-001–005 |
| BR-F01-014 | The system shall rebuild projections from immutable events after a read-model failure. | Make live metrics recoverable. | F01.3-FLOW-006 |
| BR-F01-015 | The system shall correlate purchase interest with stock state and emit a stock-aware signal. | Prevent recommendations for unavailable or unsafe-to-promote products. | F01.INTEGRATION-004 |
| BR-F01-016 | The system shall publish action outcomes back into telemetry when downstream actions complete. | Measure whether recommendations affect conversion. | F01.INTEGRATION-005 |
| BR-F01-017 | The system shall continue safe reads and event logging in degraded mode while blocking actions that require unavailable platform state. | Fail closed for consequential behavior. | F01-SAFETY-001 |
| BR-F01-018 | The system shall retain an end-to-end trace from input event to signal, downstream recommendation, outcome, and audit record. | Explain decisions and support investigation. | F01-SAFETY-002/003 |

## 8. Business rules and invariants

1. **Catalog grounding:** Product and SKU references must resolve to approved catalog facts.
2. **Funnel separation:** Cart-add is not checkout; checkout is not paid order.
3. **No direct mutation:** Feature 01 produces signals and recommendations, not platform mutations.
4. **Confidence-aware action:** Low-confidence or ambiguous results cannot trigger automated commerce actions.
5. **Risk isolation:** High-risk content must not be surfaced as normal host guidance.
6. **Tenant/session isolation:** Signals must not cross workspace or live-session boundaries.
7. **Idempotency:** Replayed platform events must not inflate counters or duplicate signals.
8. **Traceability:** Every downstream signal includes event ID, correlation ID, causation ID, schema version,
   producer, and evidence window.
9. **Replayability:** Dashboard projections are derived views and can be rebuilt from source events.
10. **Privacy:** Raw PII, platform tokens, COGS, and protected customer data must not enter model prompts
    or public UI payloads.

## 9. Business process

```text
Start live session
  → ingest chat, commerce, engagement, and stock signals
  → validate / normalize / deduplicate / enrich
  → classify intent and risk
  → resolve product and SKU against approved catalog
  → cluster questions and aggregate purchase signals
  → project dashboard and alerts
  → publish signals to Co-pilot, StreamPilot, and Compliance
  → receive action outcomes
  → reconcile and append audit trace
```

## 10. Output contracts

### Canonical NATS events

The following events are required for the first contract baseline:

- `live.chat.received`
- `commerce.cart_added`
- `commerce.checkout_completed`
- `commerce.order_updated`
- `telemetry.intent.detected`
- `telemetry.risk.detected`
- `chat.question.clustered`
- `product.interest.updated`
- `purchase.signal.updated`
- `live.engagement.updated`

Every event must include:

```json
{
  "event_id": "evt_01",
  "event_type": "telemetry.intent.detected",
  "occurred_at": "2026-11-20T10:00:00Z",
  "tenant_id": "org_01",
  "workspace_id": "ws_01",
  "session_id": "session_01",
  "correlation_id": "trace_01",
  "causation_id": "evt_00",
  "schema_version": 1,
  "producer": "intent-risk-service",
  "data": {}
}
```

### HTTP boundary

OpenAPI governs frontend/BFF access to dashboard and session views. Feature 01 does not
expose raw model output directly to the frontend; the CORE BFF returns a safe, UI-oriented
projection.

Reference: [OpenAPI contract](../../03-architecture/api/openapi.yaml)

## 11. Non-functional requirements

| Area | Requirement |
|---|---|
| Signal latency | Chat-to-signal publication target is p95 < 1 second under target load. |
| Co-pilot delivery | Actionable suggestion delivery target is p95 < 3 seconds. |
| Availability | Degraded read-only behavior is required during adapter outage. |
| Durability | Events must be durable through NATS JetStream and the owning transaction/outbox path. |
| Scalability | Workers must use bounded concurrency and durable pull consumers. |
| Observability | Events, workers, projections, and downstream decisions must share correlation/trace IDs. |
| Security | Enforce tenant/workspace authorization and redact PII, credentials, and protected financial data. |
| Replay | Projection rebuild must be possible from a defined event range. |

These are architecture baselines from the LivePilot technical stack; achieved performance must
be verified by load and integration tests.

## 12. Success measures

The following measures are required for product validation. Numeric targets remain
**[NEEDS CLARIFICATION]** until product/operations provide a baseline:

- Intent classification precision and recall by intent type.
- Product/SKU resolution accuracy.
- Repeated-question clustering quality.
- Moderation precision for scam and off-platform detection.
- False-positive rate for high-severity risk escalation.
- Chat-to-signal publication latency.
- Cart-add / checkout / paid-order metric reconciliation accuracy.
- Dashboard freshness and projection recovery time.
- Percentage of consequential downstream proposals with complete evidence.
- Percentage of duplicate/replayed events handled idempotently.

## 13. Assumptions and open decisions

| ID | Open item | Current treatment |
|---|---|---|
| F01-OPEN-001 | Exact intent taxonomy and multilingual/Thai classification thresholds | Use canonical intents; finalize thresholds during evaluation. |
| F01-OPEN-002 | Viewer identity and deduplication key per platform | Use platform-scoped hashed identity/event IDs; confirm platform capabilities. |
| F01-OPEN-003 | Hype, sentiment, and conversion window sizes | Make versioned configuration; product must approve defaults. |
| F01-OPEN-004 | Retention period for raw chat and evidence payloads | Follow security/privacy policy; product/legal decision required. |
| F01-OPEN-005 | Exact NATS subject naming and AsyncAPI location | Define before implementation of the first service consumer. |
| F01-OPEN-006 | Success thresholds for precision, recall, latency, and freshness | Requires baseline data or pilot evidence. |

## 14. Traceability

- [Feature 01 BDD contract](../bdd/feature-01-live-chat-telemetry.md)
- [Feature Map — Live Chat & Telemetry Understanding](../../03-architecture/live-pilot-os-feature-map.md)
- [LivePilot OS Deep Context](../../03-architecture/live-pilot-os-deep-context.md)
- [Core Features](../../03-architecture/live-pilot-os-core-features.md)
- [Production Technology Stack](../../03-architecture/live-pilot-os-tech-stack.md)
- [API contract index](../../03-architecture/api/README.md)

## 15. Review checklist

- [ ] Product confirms business problem and target users.
- [ ] Product confirms in-scope and out-of-scope boundaries.
- [ ] Product confirms intent taxonomy and priority.
- [ ] Operations confirms moderation severity handling.
- [ ] Product/operations provide success baselines and targets.
- [ ] Architecture confirms NATS subject and message contract plan.
- [ ] Security/privacy confirms retention and redaction requirements.
- [ ] BDD scenarios remain traceable to every approved requirement.

