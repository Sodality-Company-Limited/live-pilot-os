# BRD — Feature 04: Risk Screening and Emergency Operator Control

> **Feature ID:** F04  
> **Business capability:** Compliance & Operator Control  
> **Document type:** Business Requirements Document  
> **Version:** 1.0  
> **Status:** Draft for product review  
> **Owner:** Product / LivePilot OS team

## 1. Executive summary

Compliance & Operator Control is the control plane for consequential LivePilot OS behavior.
It governs how risk is escalated, how AI or host proposals are approved, how external
platform actions are made safe, and how operators stop automation immediately.

The feature has four canonical control capabilities plus an adapter-safety boundary:

1. **Action Log & Approval Control**
2. **Approval Modes**
3. **Emergency Pause**
4. **Moderation Escalation**
5. **Platform Adapter Safety and Execution Audit**

Feature 04 does not replace Feature 01 risk detection or Feature 03 domain policy
calculations. It receives their signals and controls whether consequential actions may
proceed.

## 2. Business context

Live-commerce automation can change product visibility, promotions, inventory, and external
platform state. Those actions need an explicit human and system control boundary. A delayed
platform response, duplicate voucher, stock mismatch, abnormal margin calculation, or
critical compliance risk must be handled fail-closed and remain auditable.

```text
proposal / risk / platform state
  → log context
  → classify severity and approval mode
  → approve, block, or pause
  → execute through safe adapter
  → reconcile observed state
  → append immutable audit receipt
```

The operator must retain sovereignty over automation while chat and telemetry continue to be
received and logged during a pause.

## 3. Business problem

### Current problem

- AI proposals and external actions need a clear approval and ownership boundary.
- Risk signals vary in severity and require different operational responses.
- Platform retries and unknown responses can cause duplicate or inconsistent actions.
- Operators need a fast, reliable way to stop automation during an incident.
- Post-event investigation requires the complete decision chain, not only the final status.
- Action logs can expose secrets or protected data if redaction is not designed explicitly.

### Business impact

If the problem remains unsolved:

- Unsafe or non-compliant content may reach the host or customer.
- Promotions, pins, or reservations may continue during an incident.
- Duplicate vouchers or unknown platform outcomes may create financial and trust damage.
- Operators cannot prove who approved an action or why it executed.
- Recovery from adapter, stock, or policy failures becomes manual and error-prone.

## 4. Objectives

### Primary objectives

- Make every consequential action visible, attributable, and auditable.
- Support explicit RECOMMEND_ONLY, ASSISTED, and AUTONOMOUS modes.
- Escalate LOW, MEDIUM, HIGH, and CRITICAL risks deterministically.
- Activate Emergency Pause from an authorized operator or configured critical condition.
- Stop product pinning, voucher issuance, new reservations, and scenario automation during pause.
- Keep telemetry and audit active while consequential automation is stopped.
- Make platform actions idempotent, retry-safe, credential-isolated, and reconciled.
- Preserve an append-only evidence chain from input signal to observed outcome.

### Non-objectives

- Detect all chat risk patterns; Feature 01 owns risk signal generation.
- Calculate margin or inventory truth; Feature 03 domain services own those decisions.
- Replace platform-native moderation or identity systems.
- Allow operators to modify immutable historical evidence.
- Automatically resume automation while the pause reason remains unresolved.
- Expose secrets, tokens, raw PII, COGS, or protected payloads in public UI.

## 5. Users and stakeholders

| User / stakeholder | Need |
|---|---|
| Operator | See actions, approve or reject proposals, and stop automation |
| Moderator | Review and resolve escalated risk cases |
| Live host | Receive risk alerts and understand why guidance/action is blocked |
| Brand / seller | Protect compliance, customer trust, margin, and stock |
| MCN / studio manager | Apply consistent control policies across live rooms |
| Platform adapter owner | Safely integrate external commands and callbacks |
| Compliance / security owner | Investigate evidence, incidents, and policy outcomes |
| Feature 01 / 02 / 03 services | Consume and produce governed decision/control events |
| Auditor / support team | Reconstruct a complete decision and execution chain |

## 6. Scope

### In scope

- Action log for proposals, verdicts, approvals, actions, failures, retries, and outcomes.
- Actor, policy version, model version, correlation, causation, and evidence recording.
- RECOMMEND_ONLY, ASSISTED, and AUTONOMOUS approval modes.
- Permission checks, approval expiry, replay protection, and idempotent decisions.
- Risk severity handling for LOW, MEDIUM, HIGH, and CRITICAL signals.
- Moderation case creation and escalation.
- Emergency Pause activation, propagation, release, and safe-resume checks.
- Adapter validation, idempotency, retry policy, unknown-result handling, and reconciliation.
- Append-only audit receipts and evidence-bundle export.
- Safe redaction and credential isolation.

### Out of scope

- Primary intent and risk classification model.
- Catalog, margin, promotion, or inventory source-of-truth logic.
- Implementing the full host or operator UI.
- Marketplace-specific business rules inside the control plane.
- Automatic incident closure without authorized resolution.
- Long-term legal retention policy beyond the configured audit contract.

## 7. Functional business requirements

| ID | Requirement | Business reason | Trace |
|---|---|---|---|
| BR-F04-001 | The system shall log every proposal, verdict, approval, action, failure, retry, and outcome with tenant/workspace/session scope. | Make consequential behavior visible. | F04.1-FLOW-001–003 |
| BR-F04-002 | The system shall record actor type, policy/model version, event IDs, correlation ID, causation ID, and execution status. | Make decisions attributable and reconstructable. | F04.1-FLOW-004/005 |
| BR-F04-003 | The system shall redact secrets, tokens, raw PII, COGS, and protected financial data from operator-facing detail. | Protect security and privacy. | F04.1-FLOW-006 |
| BR-F04-004 | The system shall preserve action history append-only and represent corrections as new receipts. | Protect evidence integrity. | F04.1-FLOW-007 |
| BR-F04-005 | The system shall enforce RECOMMEND_ONLY mode with no consequential platform mutation. | Let teams observe recommendations safely. | F04.2-FLOW-001 |
| BR-F04-006 | The system shall enforce ASSISTED mode by requiring an authorized host/operator decision. | Keep humans in control when configured. | F04.2-FLOW-002/004 |
| BR-F04-007 | The system shall permit AUTONOMOUS execution only after all configured policy gates pass. | Bound automation instead of granting unrestricted autonomy. | F04.2-FLOW-003 |
| BR-F04-008 | The system shall expire undecided approval requests and prevent approval replay. | Avoid stale or duplicated decisions. | F04.2-FLOW-005/006 |
| BR-F04-009 | The system shall apply approval-mode changes according to an explicit transition policy. | Prevent ambiguous behavior for already-running workflows. | F04.2-FLOW-007 |
| BR-F04-010 | The system shall activate Emergency Pause from an authorized operator control or configured critical condition. | Stop automation quickly during incidents. | F04.3-FLOW-001/002 |
| BR-F04-011 | While paused, the system shall stop product pinning, voucher issuance, new reservations, and scenario automation. | Prevent further consequential mutations. | F04.3-FLOW-003–006 |
| BR-F04-012 | While paused, the system shall continue receiving telemetry, risk events, reconciliation signals, and audit records. | Preserve visibility and evidence during incidents. | F04.3-FLOW-007 |
| BR-F04-013 | The system shall release Emergency Pause only through authorized action after the pause condition is resolved. | Prevent unsafe resume. | F04.3-FLOW-008/009 |
| BR-F04-014 | The system shall map LOW, MEDIUM, HIGH, and CRITICAL risk levels to explicit operational responses. | Make risk handling deterministic. | F04.4-FLOW-001–004 |
| BR-F04-015 | The system shall create moderation cases containing risk type, score, severity, evidence, policy version, and resolution state. | Make escalation actionable and auditable. | F04.4-FLOW-005/006 |
| BR-F04-016 | The system shall deduplicate repeated risk events and maintain one escalation chain per source event. | Prevent alert storms and duplicate cases. | F04.4-FLOW-007 |
| BR-F04-017 | The system shall validate platform, payload, authorization, and idempotency before dispatching external commands. | Prevent malformed or unauthorized mutations. | F04.5-FLOW-001/002 |
| BR-F04-018 | The system shall retry only known-safe transient errors with the same idempotency key. | Prevent duplicate external actions. | F04.5-FLOW-003/004 |
| BR-F04-019 | The system shall reconcile requested, accepted, observed, and final platform state. | Detect platform drift and unknown outcomes. | F04.5-FLOW-005/006 |
| BR-F04-020 | The system shall isolate platform credentials inside adapter boundaries. | Reduce credential exposure and blast radius. | F04.5-FLOW-007 |
| BR-F04-021 | The system shall append complete decision receipts and support redacted evidence-bundle export. | Enable investigation, support, and audit. | F04.6-FLOW-001–005 |

## 8. Business rules and invariants

1. **Operator sovereignty:** An authorized operator can stop consequential automation.
2. **Fail closed:** Unknown, unsafe, unauthorized, or unreconciled actions do not proceed.
3. **Mode enforcement:** RECOMMEND_ONLY never mutates; ASSISTED waits; AUTONOMOUS still honors gates.
4. **Risk severity:** Severity maps to a known response and cannot be silently downgraded.
5. **Pause coverage:** Emergency Pause blocks pinning, voucher issuance, new reservations, and scenarios.
6. **Telemetry continuity:** Pause does not stop chat, risk, reconciliation, or audit ingestion.
7. **Idempotency:** Repeated decisions or platform callbacks cannot create duplicate effects.
8. **Retry safety:** Unknown external results require reconciliation before retry.
9. **Append-only audit:** Historical evidence cannot be overwritten.
10. **Credential isolation:** Platform credentials remain within adapter/service boundaries.
11. **Tenant isolation:** Control state, approvals, risk cases, and audit records are workspace-scoped.
12. **Traceability:** Each consequential action links proposal, verdict, approval, request, response, and outcome.

## 9. Business process

```text
Receive proposal, risk, or platform state
  → append action context
  → classify risk and resolve approval mode
  → recommend, request approval, allow, block, or pause
  → validate adapter command
  → execute with idempotency key
  → reconcile observed platform state
  → commit, compensate, or escalate
  → append immutable audit receipt
```

## 10. Control state models

### Approval mode

```text
RECOMMEND_ONLY
ASSISTED
AUTONOMOUS
```

### Risk response

```text
LOW
→ Record in log

MEDIUM
→ Alert host or moderator

HIGH
→ Hide overlay + stop related actions

CRITICAL
→ Alert operator + activate Emergency Pause by policy
```

### Emergency Pause

```text
RUNNING → PAUSE_REQUESTED → PAUSED → RELEASE_REQUESTED → RUNNING
                         └──────→ RELEASE_BLOCKED
```

## 11. Output contracts

### NATS events

- `approval.requested`
- `approval.resolved`
- `action.logged`
- `action.failed`
- `emergency.pause.activated`
- `emergency.pause.released`
- `compliance.escalated`
- `platform.action.requested`
- `platform.action.completed`
- `platform.action.failed`
- `audit.decision.appended`

Every event must include event ID, occurred time, tenant/workspace/session scope,
correlation ID, causation ID, schema version, producer, and event data.

### Control contract boundaries

- **Approval & Control Service:** mode, permissions, approvals, pause state, kill switches.
- **Audit Service:** append-only decisions, evidence references, and audit projections.
- **Platform Adapter:** external protocol, credentials, idempotency, retries, and callbacks.
- **Moderation case handling:** consumes Feature 01 risk events and returns resolution events.
- **CORE BFF:** exposes safe operator/host views and orchestrates use cases without owning the control rules.

Reference: [OpenAPI and NATS contract index](../../03-architecture/api/README.md)

## 12. Non-functional requirements

| Area | Requirement |
|---|---|
| Pause propagation | Emergency Pause must propagate quickly enough to stop new consequential dispatches; exact SLA is [NEEDS CLARIFICATION]. |
| Decision latency | Approval and mode decisions should remain low-latency for live operation; exact target is [NEEDS CLARIFICATION]. |
| Reliability | Adapter commands require bounded retries, dead-letter handling, and reconciliation. |
| Durability | Audit receipts and control events must survive worker or adapter restart. |
| Security | Enforce least privilege, tenant isolation, credential isolation, and safe redaction. |
| Observability | All events and control transitions share correlation and causation identifiers. |
| Recovery | Pause release, workflow compensation, and adapter recovery must be tested. |
| Availability | Control plane should remain available even when a platform adapter is degraded. |

## 13. Success measures

Numeric targets remain **[NEEDS CLARIFICATION]** until product, compliance, and operations
provide a baseline. The BRD requires measurement of:

- Time from Emergency Pause request to blocked new dispatch.
- Percentage of consequential actions with complete approval and audit evidence.
- Duplicate effective platform action rate.
- Percentage of unknown platform outcomes reconciled without duplicate mutation.
- Risk escalation precision by severity.
- False-negative rate for high and critical risk.
- Unauthorized approval rejection rate.
- Audit evidence retrieval completeness and time.
- Percentage of paused workflows that remain safely stopped.
- Incident recovery time from pause to authorized resume.
- Adapter retry and dead-letter rates.

## 14. Assumptions and open decisions

| ID | Open item | Current treatment |
|---|---|---|
| F04-OPEN-001 | Exact Emergency Pause propagation SLA | Define with operations and platform owners. |
| F04-OPEN-002 | Who may activate and release pause per workspace | Define RBAC/ABAC policy with security and operations. |
| F04-OPEN-003 | Which critical conditions auto-activate pause | Configure as versioned policy; product/compliance approval required. |
| F04-OPEN-004 | Risk severity thresholds and escalation ownership | Confirm with moderation and compliance teams. |
| F04-OPEN-005 | Audit retention, legal hold, and evidence export format | Security/legal decision required. |
| F04-OPEN-006 | Adapter retry taxonomy and reconciliation polling | Each platform adapter must publish its contract. |
| F04-OPEN-007 | Exact decision-latency and recovery targets | Requires incident and live-session baseline. |

## 15. Traceability

- [Feature 04 BDD contract](../bdd/feature-04-risk-operator-control.md)
- [Feature Map — Compliance & Operator Control](../../03-architecture/live-pilot-os-feature-map.md)
- [Feature 01 BRD — Live Chat & Purchase Signal](./feature-01-live-chat-purchase-signal-analysis.md)
- [Feature 02 BRD — Host Screen Assistant](./feature-02-host-screen-assistant.md)
- [Feature 03 BRD — StreamPilot Agent](./feature-03-store-management-profit-protection.md)
- [LivePilot OS Deep Context](../../03-architecture/live-pilot-os-deep-context.md)
- [Production Technology Stack](../../03-architecture/live-pilot-os-tech-stack.md)
- [API contract index](../../03-architecture/api/README.md)

## 16. Review checklist

- [ ] Product confirms approval modes and operator responsibilities.
- [ ] Compliance confirms severity mapping and escalation responses.
- [ ] Security confirms RBAC/ABAC, credential isolation, redaction, and retention.
- [ ] Operations confirms Emergency Pause activation, release, and recovery runbooks.
- [ ] Platform owners confirm idempotency, retry, callback, and reconciliation behavior.
- [ ] Architecture confirms NATS, BFF, adapter, and audit boundaries.
- [ ] Product/operations provide pause, recovery, risk, and audit baselines.
- [ ] BDD scenarios remain traceable to every approved requirement.

