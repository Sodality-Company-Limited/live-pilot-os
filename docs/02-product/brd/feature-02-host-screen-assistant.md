# BRD — Feature 02: Host Screen Assistant (Streamer Co-pilot HUD)

> **Feature ID:** F02  
> **Business capability:** Streamer Co-pilot HUD  
> **Document type:** Business Requirements Document  
> **Version:** 1.0  
> **Status:** Draft for product review  
> **Owner:** Product / LivePilot OS team

## 1. Executive summary

The Streamer Co-pilot HUD helps a live host act on verified signals without interrupting the
host's own selling rhythm. It turns repeated questions, product interest, purchase signals,
catalog facts, stock state, and promotion state into concise guidance that can be read and
used during a live broadcast.

The feature has four canonical sub-features:

1. **AI Host Copilot** — creates short suggestions, talking points, alerts, and next-product recommendations.
2. **Product Q&A Assistant** — answers only from approved catalog facts.
3. **Stock & Order Alert — Host View** — surfaces stock, order, voucher, and promotion changes.
4. **Host Approval UI** — lets the host use, edit, reject, or inspect guidance.

## 2. Business context

Live hosts need useful information at the moment it matters, but cannot read long AI
responses or validate facts manually while speaking. The HUD is therefore a tactical,
evidence-backed surface rather than a replacement for the host's script.

The capability consumes signals from Feature 01 and operational state from Feature 03. It
sends host decisions to Feature 04. It must not directly own catalog facts, margin rules,
inventory truth, or platform mutations.

```text
Feature 01 signals + Feature 03 state
  → Co-pilot evidence and guidance
  → Host HUD
  → Use / Edit / Reject / Request details
  → Feature 04 approval and audit control
```

## 3. Business problem

### Current problem

- Hosts cannot reliably read and prioritize high-volume chat while speaking.
- Repeated questions are hidden inside chat volume.
- Generic AI answers may invent product facts or make unsafe claims.
- Stock, voucher, order, and promotion changes can become stale during a live session.
- Hosts need control over wording and timing rather than a system that takes over their script.
- A recommendation that leads to a consequential action must be explicitly authorized and audited.

### Business impact

If the problem remains unsolved:

- Hosts miss opportunities to answer high-intent questions.
- Incorrect product answers can damage trust and create compliance risk.
- Hosts may promote unavailable products or expired promotions.
- Alert overload can distract the host instead of helping.
- Decisions cannot be linked to the evidence and state available at the time.

## 4. Objectives

### Primary objectives

- Deliver concise, glanceable, session-scoped guidance to the host.
- Ground Product Q&A in approved catalog facts with visible evidence and freshness.
- Prioritize repeated questions, high product attention, purchase signals, and relevant alerts.
- Keep stock, order, voucher, price, and promotion guidance current.
- Let the host use, edit, reject, or inspect recommendations.
- Enforce approval mode, authorization, idempotency, Emergency Pause, and audit boundaries.
- Preserve the host's existing script and selling rhythm.

### Non-objectives

- Replace the host's full selling script.
- Invent catalog facts or provide unsupported medical/safety advice.
- Calculate margin or make the authoritative inventory decision.
- Directly issue vouchers, pin products, or mutate marketplace state.
- Replace the full platform moderation system.
- Display raw model output without evidence, confidence, and policy filtering.

## 5. Users and stakeholders

| User / stakeholder | Need |
|---|---|
| Live host / streamer | Fast, trustworthy guidance that fits the broadcast rhythm |
| Moderator | Receive relevant risk and content context without host distraction |
| Back-office operator | Understand host decisions and action readiness |
| Brand / seller | Protect product truth, claims, stock promises, and brand voice |
| MCN / studio manager | Standardize guidance across rooms without removing host control |
| StreamPilot Agent | Receive approved host decisions or state needed for bounded actions |
| Compliance & Operator Control | Enforce approval, pause, authorization, and audit |
| Product / engineering team | Integrate stable UI and event contracts |

## 6. Scope

### In scope

- Session-scoped Host HUD for active live sessions.
- Real-time suggestion and alert delivery.
- Glanceable talking points and product attention cues.
- Repeated-question summaries and next-product recommendations.
- Catalog-grounded Product Q&A.
- Evidence, confidence, catalog version, and freshness display.
- Unsupported-claim refusal and low-confidence escalation.
- Stock, order, voucher, price, promotion, and countdown alerts.
- Host use, edit, reject, dismiss, and request-details actions.
- Authorization, approval mode, idempotency, Emergency Pause, and audit integration.
- Safe stale-state and co-pilot outage behavior.

### Out of scope

- Catalog authoring and approval.
- Margin policy calculation.
- Inventory reservation or stock ledger ownership.
- Direct marketplace pinning or voucher execution.
- Full risk classification; Feature 01 produces risk signals.
- Emergency Pause ownership; Feature 04 owns the control plane.
- Rewriting or auto-speaking the host's full sales script.

## 7. Functional business requirements

| ID | Requirement | Business reason | Trace |
|---|---|---|---|
| BR-F02-001 | The system shall load a session-scoped HUD for an authenticated host. | Prevent cross-session guidance and give the host a relevant starting state. | F02-FLOW-001/006 |
| BR-F02-002 | The system shall deliver suggestions and alerts in real time without requiring a full page refresh. | Let the host act while the live session is changing. | F02-FLOW-002 |
| BR-F02-003 | The system shall keep primary guidance glanceable and approximately three seconds to read. | Preserve host attention and speaking rhythm. | F02-FLOW-003/005 |
| BR-F02-004 | The system shall expire, withdraw, or mark stale guidance when its evidence or state is no longer valid. | Prevent the host from using outdated information. | F02-FLOW-004/005 |
| BR-F02-005 | The system shall create talking points from repeated questions and verified product context. | Help the host answer the most important questions efficiently. | F02.1-FLOW-001 |
| BR-F02-006 | The system shall create product attention and next-product recommendations using explainable signals. | Help the host prioritize products based on current evidence. | F02.1-FLOW-003/004 |
| BR-F02-007 | The system shall suppress duplicate and low-value notifications. | Prevent alert fatigue during high-volume broadcasts. | F02.1-FLOW-006 |
| BR-F02-008 | The system shall attach evidence summary, timestamp/window, confidence, and correlation ID to guidance. | Make AI guidance explainable and reviewable. | F02.1-FLOW-007/008 |
| BR-F02-009 | The system shall answer Product Q&A only from approved catalog facts. | Prevent hallucinated product information. | F02.2-FLOW-001/004 |
| BR-F02-010 | The system shall refuse or escalate unsupported medical, pregnancy-safety, and other unverified claims. | Protect customers, host, and brand from unsafe claims. | F02.2-FLOW-002/003 |
| BR-F02-011 | The system shall revalidate or withdraw answers when catalog facts are changed, revoked, ambiguous, or stale. | Keep guidance aligned with the authoritative catalog. | F02.2-FLOW-005–007 |
| BR-F02-012 | The system shall show stock, order, voucher, price, promotion, and countdown alerts using authoritative state. | Prevent unsafe promises and missed operational changes. | F02.3-FLOW-001–007 |
| BR-F02-013 | The system shall let an authorized host use, edit, reject, dismiss, or request more detail on guidance. | Preserve human control and host voice. | F02.4-FLOW-001–004 |
| BR-F02-014 | The system shall require an authorized decision before consequential actions in ASSISTED mode. | Prevent unapproved promotion or platform mutations. | F02.4-FLOW-005/006 |
| BR-F02-015 | The system shall make host decisions idempotent. | Prevent duplicate approval or execution after delayed responses. | F02.4-FLOW-007 |
| BR-F02-016 | The system shall block consequential approval while Emergency Pause is active. | Preserve operator sovereignty during incidents. | F02.4-FLOW-008 |
| BR-F02-017 | The system shall redact sensitive data from HUD payloads and evidence views. | Protect COGS, credentials, tokens, and customer privacy. | F02-SAFETY-002 |
| BR-F02-018 | The system shall show last-known state and freshness when the co-pilot or event stream is unavailable. | Avoid inventing guidance during degraded operation. | F02-SAFETY-003 |
| BR-F02-019 | The system shall send host decisions to Compliance and audit the original and edited content. | Make human intervention traceable. | F02.4 and F02-SAFETY-004 |
| BR-F02-020 | The system shall consume Feature 01 signals and Feature 03 state through versioned contracts. | Keep the HUD decoupled from domain ownership and implementation details. | F02-INTEGRATION-001–003 |

## 8. Business rules and invariants

1. **Glanceability:** Primary live guidance must be concise enough for the host to read quickly.
2. **Catalog grounding:** Product answers may contain only approved catalog facts.
3. **No unsupported claims:** Lack of evidence results in refusal, uncertainty, or escalation.
4. **Freshness:** Stock, voucher, price, and promotion state must show freshness or stale status.
5. **Human control:** Host or operator decisions are explicit and attributable.
6. **Approval boundary:** The HUD cannot bypass Feature 04 approval mode or Emergency Pause.
7. **No direct mutation:** The HUD does not directly issue platform commands.
8. **Session isolation:** A host receives only the guidance for the authorized workspace and session.
9. **Idempotent decisions:** Repeated clicks or delayed responses cannot create duplicate decisions.
10. **Evidence traceability:** Every suggestion and answer has source context, confidence,
    policy/catalog version, and correlation ID.
11. **Sensitive-data minimization:** COGS, credentials, raw PII, and protected platform data are not shown.
12. **Host rhythm:** Guidance complements the host's script instead of replacing it.

## 9. Business process

```text
Receive F01 signal or F03 state
  → select relevant session and host
  → prioritize and suppress duplicate guidance
  → retrieve approved evidence and freshness
  → generate suggestion, answer, or alert
  → apply confidence and safety checks
  → deliver to HUD
  → host uses / edits / rejects / requests details
  → send decision to Compliance
  → audit content, actor, evidence, and outcome
```

## 10. Output contracts

### Co-pilot events

- `copilot.suggestion.created`
- `copilot.alert.created`
- `copilot.answer.approved`
- `copilot.answer.edited`
- `copilot.answer.dismissed`
- `copilot.detail.requested`
- `copilot.delivery.updated`

Every suggestion or answer should carry:

```json
{
  "suggestion_id": "sug_01",
  "session_id": "session_01",
  "product_id": "prod_02",
  "text": "Shade 02 ถูกถามซ้ำ 18 ครั้งใน 60 วินาที",
  "status": "pending",
  "confidence": 0.96,
  "evidence": [
    {
      "type": "question_cluster",
      "count": 18,
      "window_seconds": 60
    }
  ],
  "catalog_version": "catalog_2026_11_20",
  "correlation_id": "trace_01",
  "schema_version": 1
}
```

### HTTP and live delivery boundary

The Next.js BFF exposes UI-oriented DTOs. The CORE BFF orchestrates signal and state
aggregation. The Co-pilot Service remains authoritative for suggestion status and evidence
metadata. SSE is the default one-way delivery mechanism; bidirectional control is used only
where required by the host interaction contract.

Reference: [OpenAPI contract](../../03-architecture/api/openapi.yaml)

## 11. Non-functional requirements

| Area | Requirement |
|---|---|
| Suggestion latency | Co-pilot suggestion delivery target is p95 < 3 seconds. |
| Read latency | Operator/catalog lookup target is p95 < 150 ms excluding third-party calls. |
| Live delivery | Prefer SSE for one-way suggestions, alerts, and audit updates. |
| Availability | Show safe last-known state and degraded status during co-pilot or adapter outage. |
| Accessibility | Host interactions must support keyboard control and readable severity/status cues. |
| Security | Enforce workspace/session authorization and redact sensitive data. |
| Observability | Trace signal, evidence retrieval, generation, delivery, host decision, and downstream outcome. |
| Auditability | Preserve original, edited, dismissed, and approved content with actor and correlation ID. |

These are architecture baselines; achieved performance and usability must be verified by
integration, accessibility, and live-session testing.

## 12. Success measures

Numeric targets remain **[NEEDS CLARIFICATION]** until product and operations provide a
baseline. The BRD requires measurement of:

- Host time-to-read and time-to-use a suggestion.
- Percentage of suggestions grounded in approved evidence.
- Product Q&A factual accuracy against catalog truth.
- Unsupported-claim refusal rate.
- Host acceptance, edit, rejection, and detail-request rates.
- Stale-alert rate and time-to-refresh after stock/promotion changes.
- Duplicate or conflicting alert rate.
- Suggestion delivery latency and freshness.
- Host-reported distraction or alert-fatigue rate.
- Percentage of consequential host decisions with complete audit evidence.

## 13. Assumptions and open decisions

| ID | Open item | Current treatment |
|---|---|---|
| F02-OPEN-001 | Exact maximum text length or visual density for three-second reading | Product/design must define HUD constraints. |
| F02-OPEN-002 | Host language and tone policy for Thai/English suggestions | Support catalog and session locale; product must approve style rules. |
| F02-OPEN-003 | Exact confidence thresholds for display, review, and refusal | Use versioned policy configuration; validate with evaluation data. |
| F02-OPEN-004 | Catalog fact freshness and revocation behavior | Show catalog version/freshness; define SLA with Catalog owner. |
| F02-OPEN-005 | Keyboard shortcuts and accessibility requirements for live operation | Confirm with accessibility review before implementation. |
| F02-OPEN-006 | Whether host approval can be delegated to moderator per workspace | Treat as authorization policy decision in Feature 04. |
| F02-OPEN-007 | Success targets for acceptance, factuality, latency, and alert fatigue | Requires pilot baseline. |

## 14. Traceability

- [Feature 02 BDD contract](../bdd/feature-02-streamer-copilot-hud.md)
- [Feature Map — Streamer Co-pilot HUD](../../03-architecture/live-pilot-os-feature-map.md)
- [Feature 01 BRD — Live Chat & Purchase Signal](./feature-01-live-chat-purchase-signal-analysis.md)
- [LivePilot OS Deep Context](../../03-architecture/live-pilot-os-deep-context.md)
- [LivePilot OS Core Features](../../03-architecture/live-pilot-os-core-features.md)
- [Production Technology Stack](../../03-architecture/live-pilot-os-tech-stack.md)
- [API contract index](../../03-architecture/api/README.md)

## 15. Review checklist

- [ ] Product confirms host persona, session context, and guidance priorities.
- [ ] Product/design confirms glanceability, density, language, and accessibility rules.
- [ ] Catalog owner confirms approved facts, freshness, and revocation behavior.
- [ ] Operations confirms alert thresholds and stale-state behavior.
- [ ] Compliance confirms unsupported-claim and approval-mode boundaries.
- [ ] Architecture confirms SSE, BFF, and NATS contract responsibilities.
- [ ] Product/operations provide factuality, latency, and usability baselines.
- [ ] BDD scenarios remain traceable to every approved requirement.

