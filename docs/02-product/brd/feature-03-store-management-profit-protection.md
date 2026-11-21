# BRD — Feature 03: Store Management and Back-Office Profit Protection

> **Feature ID:** F03  
> **Business capability:** StreamPilot Agent  
> **Document type:** Business Requirements Document  
> **Version:** 1.0  
> **Status:** Draft for product review  
> **Owner:** Product / LivePilot OS team

## 1. Executive summary

StreamPilot Agent is the controlled back-office automation layer for live commerce. It turns
verified product-interest, purchase, engagement, stock, and operator signals into bounded
store actions such as product pinning, vouchers, and inventory reservations.

The feature is designed to protect both conversion opportunity and business economics.
Every consequential action must pass catalog validation, margin policy, inventory safety,
approval mode, idempotent platform execution, reconciliation, and audit.

The feature has five canonical sub-features:

1. **Auto Product Pinning**
2. **Smart Voucher Engine**
3. **Margin Protection**
4. **Stock Reservation and Order State**
5. **Scenario Automation**

## 2. Business context

Live-commerce teams need to react quickly to demand spikes, but fast actions can create
negative-margin promotions, overselling, duplicate vouchers, or platform-state drift.
StreamPilot provides a bounded execution path where deterministic financial and inventory
rules remain authoritative.

```text
F01 signal
  → proposal
  → catalog validation
  → margin verdict
  → inventory reservation
  → approval/control
  → idempotent platform action
  → reconciliation
  → commit/release
  → audit
```

StreamPilot may orchestrate this flow, but it does not own the source of truth for catalog,
margin, inventory, approval, or audit. Those domain boundaries remain explicit services.

## 3. Business problem

### Current problem

- Operators need to pin products or launch promotions while demand changes quickly.
- Discount pressure can reduce contribution margin below the business floor.
- Promotions can oversell inventory when multiple sales channels operate concurrently.
- Platform retries and delayed responses can create duplicate vouchers or uncertain state.
- Manual scenario rules are difficult to apply consistently during a live session.
- AI proposals alone are not safe enough to mutate money, stock, or external platform state.

### Business impact

If the problem remains unsolved:

- Flash promotions may destroy contribution margin.
- Cross-channel stock may be oversold.
- Hosts may promote products that are unavailable or not approved.
- Duplicate platform actions may create customer, financial, and reconciliation issues.
- Operators cannot explain why a promotion was accepted, rejected, or compensated.

## 4. Objectives

### Primary objectives

- Automate bounded product pinning and voucher workflows from verified signals.
- Enforce deterministic contribution-margin floors before promotion execution.
- Reserve and reconcile inventory atomically to prevent overselling.
- Manage voucher state, limits, timing, eligibility, expiry, and cancellation.
- Store scenario automation as versioned policy configuration.
- Make every external command idempotent, retry-safe, and observable.
- Stop or route actions through operator control when risk or uncertainty is high.

### Non-objectives

- Let an LLM directly mutate marketplace state.
- Put margin or inventory rules in the frontend, CORE BFF, or prompt text.
- Make Redis or an event projection the authoritative money or stock ledger.
- Replace the platform's order/payment system.
- Execute a destructive or irreversible action without the applicable approval mode.
- Hide failed, delayed, or uncertain platform outcomes.

## 5. Users and stakeholders

| User / stakeholder | Need |
|---|---|
| Back-office operator | Control promotions, observe actions, and intervene safely |
| Brand / seller | Protect contribution margin, stock, and catalog integrity |
| Live host | Receive product/promotion context and avoid unsafe promises |
| MCN / studio manager | Apply consistent rules across sessions and channels |
| StreamPilot Agent | Execute bounded actions under policy |
| Margin Policy Service | Own deterministic financial verdicts |
| Inventory Service | Own atomic reservation and stock state |
| Approval & Control Service | Own approval mode and Emergency Pause |
| Platform Adapter | Translate and reconcile external platform commands |
| Audit Service | Preserve decision and execution evidence |

## 6. Scope

### In scope

- Product pin proposals and controlled execution.
- Catalog, SKU, confidence, stock, and cooldown checks for pinning.
- Voucher proposal and lifecycle management.
- Claim limits, timing, eligibility, expiry, exhaustion, and cancellation.
- Contribution-margin calculation and floor verdict.
- Safer alternative discount or bundle recommendation.
- Atomic inventory reservation, commit, release, and expiry.
- Order/payment state synchronization.
- Versioned scenario rules and thresholds.
- Approval mode enforcement and Emergency Pause integration.
- Idempotent adapter commands, retry policy, dead-letter handling, and reconciliation.
- Audit receipts for proposals, verdicts, actions, and compensation.

### Out of scope

- Authoring catalog facts.
- Defining the business margin policy itself; this feature consumes the policy contract.
- Owning the authoritative inventory ledger outside Inventory Service.
- Implementing the operator UI; Feature 04 owns control behavior and Feature 02 consumes host state.
- Platform credential management outside the adapter boundary.
- Long-term financial accounting or settlement.
- Unbounded autonomous experimentation without policy configuration.

## 7. Functional business requirements

| ID | Requirement | Business reason | Trace |
|---|---|---|---|
| BR-F03-001 | The system shall consume verified intent, purchase, engagement, stock, and operator signals before creating a proposal. | Prevent actions from raw or untrusted input. | F03-FLOW-001 |
| BR-F03-002 | The system shall validate every product and SKU against the active approved catalog. | Prevent invalid product actions. | F03-FLOW-002/003 |
| BR-F03-003 | The system shall respect workspace approval mode before any consequential action. | Enforce recommendation, assisted, and autonomous boundaries. | F03-FLOW-004 |
| BR-F03-004 | The system shall create a product-pin proposal with product, SKU, evidence, confidence, session, and policy context. | Make pin decisions explainable. | F03.1-FLOW-001 |
| BR-F03-005 | The system shall check availability and enforce product-pin cooldown. | Prevent unavailable products and repetitive platform actions. | F03.1-FLOW-002/003 |
| BR-F03-006 | The system shall execute product pins only through an idempotent platform adapter and confirm execution before claiming success. | Prevent duplicate or false-success actions. | F03.1-FLOW-004–007 |
| BR-F03-007 | The system shall create voucher proposals with discount, claim limit, start, expiry, eligibility, and evidence. | Make promotions bounded and reviewable. | F03.2-FLOW-001 |
| BR-F03-008 | The system shall enforce voucher lifecycle states, claim limits, expiry, exhaustion, and cancellation. | Prevent invalid or unlimited promotion behavior. | F03.2-FLOW-002–006 |
| BR-F03-009 | The system shall evaluate every promotion through the Margin Policy Service before issuance or change. | Protect contribution margin. | F03.3-FLOW-001 |
| BR-F03-010 | The system shall return APPROVED, NEEDS_APPROVAL, or REJECTED margin verdicts with policy version and evidence. | Make financial decisions deterministic and auditable. | F03.3-FLOW-002–007 |
| BR-F03-011 | The system shall reject below-floor promotions and may propose a safer discount or bundle with a new verdict. | Avoid loss-making actions while preserving conversion options. | F03.3-FLOW-003/005 |
| BR-F03-012 | The system shall calculate money using integer minor units and explicit currency scale. | Prevent financial rounding and floating-point errors. | F03.3-FLOW-001/006 |
| BR-F03-013 | The system shall re-evaluate margin when price, fees, COGS, or promotion terms change before execution. | Prevent stale approvals. | F03.3-FLOW-008 |
| BR-F03-014 | The system shall reserve inventory atomically before executing an eligible promotion. | Prevent overselling. | F03.4-FLOW-001/002 |
| BR-F03-015 | The system shall reject insufficient inventory and make reservation commands idempotent. | Protect stock integrity under concurrency and retries. | F03.4-FLOW-003/008 |
| BR-F03-016 | The system shall commit, release, or expire reservations based on payment/order state and promotion lifecycle. | Keep inventory aligned with real commerce outcomes. | F03.4-FLOW-004–006 |
| BR-F03-017 | The system shall trigger versioned scenario rules from configured event and threshold conditions. | Make automation consistent and reviewable. | F03.5-FLOW-001–005 |
| BR-F03-018 | The system shall prevent disabled scenarios and recursive action loops from creating new proposals. | Avoid uncontrolled automation. | F03.5-FLOW-006/007 |
| BR-F03-019 | The system shall run durable promotion workflows with retries, timers, compensation, and reconciliation. | Safely manage multi-step external processes. | F03-WORKFLOW-001–005 |
| BR-F03-020 | The system shall stop consequential execution during Emergency Pause and continue safe logging/reconciliation. | Preserve operator sovereignty during incidents. | F03-WORKFLOW-002 |
| BR-F03-021 | The system shall record complete action, policy, adapter, and outcome evidence. | Support audit, support, and incident investigation. | F03-WORKFLOW-006 |

## 8. Business rules and invariants

1. **Policy-before-action:** No money, stock, promotion, or platform mutation occurs before the required gates pass.
2. **Margin hard gate:** A below-floor promotion cannot be issued.
3. **Integer money:** Financial arithmetic uses integer minor units and explicit currency/scale.
4. **Atomic inventory:** Reservation, release, and commit are transactionally safe and idempotent.
5. **No oversell:** Available inventory cannot become negative because of concurrent proposals.
6. **Voucher boundedness:** Every voucher has explicit timing, claim limit, eligibility, and lifecycle state.
7. **Catalog grounding:** Pinning and promotion proposals reference approved active catalog entities.
8. **Approval sovereignty:** RECOMMEND_ONLY never mutates; ASSISTED waits for an authorized decision;
   AUTONOMOUS still requires policy gates.
9. **Idempotent execution:** Delayed or repeated platform responses cannot create duplicate effective actions.
10. **Stale-verdict rejection:** A changed economic input invalidates the previous margin verdict.
11. **Versioned automation:** Scenario rules are stored as versioned policy configuration, never only in prompts.
12. **Compensation:** Expired or unpaid promotions release reservations according to the workflow policy.
13. **Auditability:** Every proposal, verdict, reservation, approval, action, retry, and reconciliation has trace IDs.
14. **Emergency stop:** Emergency Pause blocks new consequential actions while telemetry and audit continue.

## 9. Business process

```text
Receive verified signal
  → create proposal
  → validate catalog / SKU
  → evaluate margin
  → request approval if required
  → reserve inventory atomically
  → execute idempotent platform action
  → observe platform acknowledgement
  → reconcile order and promotion state
  → commit or release inventory
  → append audit receipt
```

## 10. State models

### Voucher

```text
DRAFT → SCHEDULED → ACTIVE → EXHAUSTED
                         ├──→ EXPIRED
                         └──→ CANCELLED
```

### Margin verdict

```text
APPROVED
NEEDS_APPROVAL
REJECTED
```

### Inventory reservation

```text
REQUESTED → RESERVED → COMMITTED
                    ├──→ RELEASED
                    └──→ EXPIRED
```

## 11. Output contracts

### NATS events

- `product.pin.requested`
- `product.pin.executed`
- `voucher.proposed`
- `voucher.approved`
- `voucher.rejected`
- `margin.verdict.recorded`
- `stock.reserved`
- `stock.released`
- `scenario.triggered`
- `platform.action.requested`
- `platform.action.completed`
- `platform.action.failed`

Every event must include tenant/workspace/session scope, event ID, timestamp, correlation ID,
causation ID, schema version, producer, and domain data.

### Synchronous domain boundaries

- **Margin Policy Service:** authoritative margin verdict.
- **Inventory Service:** authoritative reservation and stock transition.
- **Approval & Control Service:** authoritative approval mode and pause state.
- **Platform Adapter:** external protocol, idempotency key, request/response, and reconciliation.
- **Audit Service:** append-only decision and execution receipt.

The CORE BFF and StreamPilot orchestrate these contracts; they do not duplicate domain rules.

## 12. Non-functional requirements

| Area | Requirement |
|---|---|
| Margin latency | Margin verdict target is p95 < 50 ms from service receipt. |
| Reservation latency | Reservation decision target is p95 < 150 ms and serialized per SKU/variant key. |
| Reliability | Consequential actions require bounded retries and dead-letter handling. |
| Durability | Event publication follows the owning transaction through the outbox/event path. |
| Idempotency | Every consequential platform mutation has an idempotency key. |
| Consistency | Money and inventory source-of-truth data remain in authoritative domain services. |
| Security | Platform credentials remain isolated in adapters and never reach UI/model prompts. |
| Observability | Correlate proposal, verdict, reservation, approval, adapter, and reconciliation traces. |
| Recovery | Workflow compensation and reservation release are tested for timeout and outage paths. |

These are architecture baselines; achieved performance and reliability must be verified by
integration, load, chaos, and reconciliation tests.

## 13. Success measures

Numeric targets remain **[NEEDS CLARIFICATION]** until product, finance, and operations
provide a baseline. The BRD requires measurement of:

- Percentage of consequential actions blocked when margin is below floor.
- Margin-verdict accuracy against a financial reference calculation.
- Duplicate effective platform action rate.
- Oversell incidents and reservation conflict rate.
- Reservation release/commit reconciliation accuracy.
- Voucher expiry and claim-limit correctness.
- Platform action success, retry, timeout, and dead-letter rates.
- Time from eligible signal to safe action or explicit rejection.
- Percentage of actions with complete audit evidence.
- Operator intervention and Emergency Pause response time.
- Conversion impact of approved pinning and voucher actions.
- Financial loss avoided by margin protection.

## 14. Assumptions and open decisions

| ID | Open item | Current treatment |
|---|---|---|
| F03-OPEN-001 | Exact contribution-margin formula, fee components, COD/return buffers, and currency policy | Consume versioned Margin Policy; finance must approve formula. |
| F03-OPEN-002 | Approval thresholds and workspace mode defaults | Feature 04 owns mode; product/operations must define defaults. |
| F03-OPEN-003 | Product-pin cooldown and ranking thresholds | Store as versioned scenario/policy configuration. |
| F03-OPEN-004 | Cross-channel inventory ownership and reservation expiry duration | Inventory owner must define authoritative ledger and SLA. |
| F03-OPEN-005 | Platform adapter capabilities and simulated-vs-native behavior | Use simulated adapter for hackathon; certify native adapters later. |
| F03-OPEN-006 | Retryable error taxonomy per platform | Adapter owner must publish retry and reconciliation rules. |
| F03-OPEN-007 | Financial and operational success targets | Requires baseline data and pilot evidence. |

## 15. Traceability

- [Feature 03 BDD contract](../bdd/feature-03-streampilot-agent.md)
- [Feature Map — StreamPilot Agent](../../03-architecture/live-pilot-os-feature-map.md)
- [Feature 01 BRD — Live Chat & Purchase Signal](./feature-01-live-chat-purchase-signal-analysis.md)
- [Feature 02 BRD — Host Screen Assistant](./feature-02-host-screen-assistant.md)
- [Feature 04 BDD — Compliance & Operator Control](../bdd/feature-04-risk-operator-control.md)
- [LivePilot OS Deep Context](../../03-architecture/live-pilot-os-deep-context.md)
- [Production Technology Stack](../../03-architecture/live-pilot-os-tech-stack.md)
- [API contract index](../../03-architecture/api/README.md)

## 16. Review checklist

- [ ] Product confirms promotion and pinning outcomes.
- [ ] Finance confirms contribution-margin formula and floor policy.
- [ ] Inventory owner confirms reservation, release, commit, and cross-channel rules.
- [ ] Operations confirms approval modes, cooldowns, and Emergency Pause behavior.
- [ ] Platform owners confirm adapter capabilities, retries, and reconciliation.
- [ ] Security confirms credential isolation and audit redaction.
- [ ] Architecture confirms NATS, workflow, and service ownership boundaries.
- [ ] Product/finance provide financial-loss and conversion baselines.
- [ ] BDD scenarios remain traceable to every approved requirement.

