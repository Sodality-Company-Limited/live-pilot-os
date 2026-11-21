# approval-control-service Contract

Goal: `G-APPR-001`. Contract only: defines authoritative service boundaries, control-plane state machine, NATS JetStream subjects, JSON schemas, persistence ownership, error mappings, and verification gates.

## 1. Contract identity and ownership

| Field | Value |
|---|---|
| Contract ID | `control.approval.livepilot.v1` |
| Status | `FROZEN` |
| Owner / single authoritative writer | `approval-control-service` |
| Authority | Tenant/session-scoped approval requests, approval decisions, approval modes (`RECOMMEND_ONLY`, `ASSISTED`, `AUTONOMOUS`), and emergency pause state |
| Authoritative persistence | PostgreSQL 16 `approvals`, `control_modes`, `emergency_pauses` tables and transactional outbox (`data-persistence-contract-sot.md`) |
| Public exposure | None; Core BFF and Portal BFF communicate via versioned internal NATS JetStream commands and events |
| Requirements / flows | `REQ-LP-013`, `REQ-LP-014`, `REQ-LP-016`; `F02.4-FLOW-008`, `F04.2-FLOW-002`, `F04.2-FLOW-003`, `F04.2-FLOW-004`, `F04.2-FLOW-005`, `F04.2-FLOW-006`, `F04.2-FLOW-007`, `F04.3-FLOW-001`, `F04.3-FLOW-008`, `F04.3-FLOW-009` |
| Registry | `docs/03-architecture/contracts/flows/coverage.yaml` |
| Schemas | `approval-decision.schema.json` (`28de8c2d49a6811d99f1ccef4d74aab51d568377e1ddd5bb99cc44caec757fd4`), `control-mode.schema.json` (`bdc22ee34095fb0e7e9fccf259b956bbc9c8afe4dc38fccf01ebc4a4448f8402`), `emergency-pause.schema.json` (`5de29dac4a6736f91722769e0d6a64ad87f20c3df0861f4be964a187321cb3f4`) |
| Ordering key | `session_id` |

Producer: `approval-control-service`. Consumers: `core-bff`, `portal-bff`, `promotion-service`, `inventory-service`, `jev-copilot-service`, `execution-service`, and `audit-service`. Other services never write approval or control tables, never bypass the approval gate, and never declare autonomous authorization without control-plane verification.

## 2. Explicit non-ownership (Does NOT own)

`approval-control-service` is the single authoritative control plane writer for operator approvals, mode transitions, and emergency pause. It strictly **does NOT own** or mutate:

- **Promotion lifecycle & vouchers:** campaign creation, discount percentage calculations, voucher generation, or distribution (`promotion-service`).
- **Margin calculations & economic policy:** COGS evaluation, margin floor verification, or financial thresholds (`margin-policy-service`).
- **Inventory stock & reservations:** stock counts, SKU locks, reservation holding, or release (`inventory-service`).
- **Platform execution adapters:** TikTok Shop / external API calls, HTTP dispatch, simulated voucher claims, or adapter retries (`execution-service`).
- **Host suggestion generation:** prompt engineering, context assembling, LLM streaming, or talking points (`jev-copilot-service`).
- **Raw telemetry & intent classification:** chat signal ingestion, comment filtering, or customer sentiment clustering (`telemetry-service`, `intent-risk-service`).
- **Append-only audit ledger:** cryptographic Merkle chaining and global audit log verification (`audit-service`).

`approval-control-service` never reads another service's private PostgreSQL tables and never directly calls third-party marketplace APIs.

## 3. Aggregate and resource models

### 3.1 `ApprovalRequest` Aggregate
- **Identity:** Composite key `(tenant_id, session_id, approval_id)`
- **Attributes:** `approval_id`, `session_id`, `tenant_id`, `target_type` (`promotion`, `product_pin`, `scenario_automation`, `copilot_action`), `target_id`, `status` (`requested`, `approved`, `rejected`, `expired`, `revoked`), `actor_ref`, `actor_role`, `resource_version`, `created_at`, `expires_at`, `decided_at`, `reason`, `evidence_ids`.
- **Invariants:** 
  1. Once transitioned to a terminal state (`approved`, `rejected`, `expired`, `revoked`), an approval request is immutable; subsequent decision attempts reject fail-closed (`LP05007: APPROVAL_DECISION_ALREADY_RECORDED`).
  2. If `now() > expires_at` and state is `requested`, the aggregate deterministically transitions to `expired` on next read or write.

### 3.2 `ControlMode` Aggregate
- **Identity:** Composite key `(tenant_id, session_id)`
- **Attributes:** `session_id`, `tenant_id`, `current_mode` (`RECOMMEND_ONLY`, `ASSISTED`, `AUTONOMOUS`), `previous_mode`, `control_revision`, `actor_ref`, `actor_role`, `updated_at`, `reason`.
- **Invariants:**
  1. Default mode on live session creation is `RECOMMEND_ONLY`.
  2. Transitioning to `AUTONOMOUS` requires explicit operator capability authorization and active session verification; unauthorized transitions reject fail-closed (`LP05008: APPROVAL_MODE_TRANSITION_DENIED`).
  3. `control_revision` is strictly monotonic ($r_{n+1} > r_n$).

### 3.3 `EmergencyPause` Aggregate
- **Identity:** Composite key `(tenant_id, session_id)`
- **Attributes:** `session_id`, `tenant_id`, `pause_state` (`active`, `inactive`), `control_revision`, `reason`, `actor_ref`, `actor_role`, `occurred_at`, `incident_ref`.
- **Invariants:**
  1. Emergency Pause state has absolute precedence over all approvals, copilot suggestions, and execution dispatches.
  2. While `pause_state = active`, all pending approval decision commands fail closed with `LP05004: EMERGENCY_PAUSE_ACTIVE`.
  3. Resumption requires explicit operator authorization; automated systems cannot deactivate emergency pause (`LP05008`).

## 4. State machines

### 4.1 Approval Lifecycle FSM
```text
                  ┌───────────────┐
                  │   requested   │
                  └───┬───┬───┬───┘
          approve     │   │   │ expire (ttl passed)
     ┌────────────────┘   │   └────────────────┐
     ▼                    ▼                    ▼
┌──────────┐        ┌──────────┐        ┌──────────┐
│ approved │        │ rejected │        │ expired  │
└────┬─────┘        └──────────┘        └──────────┘
     │ revoke
     ▼
┌──────────┐
│ revoked  │
└──────────┘
```

| From state | Trigger / Guard | To state | Failure / Invariant |
|---|---|---|---|
| `requested` | Valid operator approve command, pause inactive, version match | `approved` | If pause is active, reject with `LP05004`; if version mismatch, reject with `LP04001` |
| `requested` | Valid operator reject command, optional reason, pause inactive | `rejected` | Terminal state; cannot be re-approved |
| `requested` | `now() > expires_at` TTL elapsed | `expired` | Terminal state (`LP05005`); downstream action cancelled |
| `approved` | Authorized operator revocation prior to execution dispatch | `revoked` | Terminal state; downstream execution adapter halts |
| Any terminal | Any mutation command | Terminal (no change) | Rejects fail-closed with `LP05007` (`APPROVAL_DECISION_ALREADY_RECORDED`) |

### 4.2 Emergency Pause FSM
```text
┌────────────┐        pause request        ┌──────────┐
│  inactive  ├────────────────────────────▶│  active  │
│  (normal)  │◀────────────────────────────┤ (paused) │
└────────────┘        resume request       └──────────┘
```

| From state | Trigger / Guard | To state | Failure / Invariant |
|---|---|---|---|
| `inactive` | Emergency pause command from authorized operator or automated risk engine | `active` | Broadcasts `livepilot.v1.control.emergency_pause.changed`; all mutations halted |
| `active` | Resume command with verified operator capability (`role: admin` or `live_ops`) | `inactive` | Rejects if issued by non-human automated system (`LP05008`) |

## 5. NATS JetStream subjects and communication topology

| Subject | Kind | Producers | Consumers | Delivery & Ordering |
|---|---|---|---|---|
| `livepilot.v1.control.approval.decision.request` | command | `core-bff`, `portal-bff` | `approval-control-service` | JetStream at-least-once, durable pull consumer, ordered by `session_id` |
| `livepilot.v1.control.approval.decision.recorded` | event | `approval-control-service` | `core-bff`, `promotion-service`, `execution-service`, `audit-service` | JetStream at-least-once, published only after atomic PostgreSQL commit |
| `livepilot.v1.control.mode.update.request` | command | `core-bff`, `portal-bff` | `approval-control-service` | JetStream at-least-once, ordered by `session_id` |
| `livepilot.v1.control.mode.updated` | event | `approval-control-service` | `core-bff`, `jev-copilot-service`, `promotion-service`, `audit-service` | JetStream at-least-once, published only after atomic PostgreSQL commit |
| `livepilot.v1.control.emergency_pause.changed` | event | `approval-control-service` | All mutating services, `audit-service` | JetStream at-least-once broadcast, fail-closed handling |
| `livepilot.v1.control.pause.request` | command | `core-bff`, `portal-bff`, risk systems | `approval-control-service` | JetStream at-least-once, ordered by `session_id` |

## 6. Envelope, headers, and zero-float data invariants

Every message strictly adheres to the canonical envelope and transport headers:
- `Nats-Msg-Id`: Unique message ID for broker-level deduplication
- `X-Correlation-Id`: End-to-end W3C trace correlation ID
- `X-Causation-Id`: Causation ID linking to triggering request/event
- `X-Idempotency-Key`: Mandatory command idempotency key
- `X-Tenant-Id`: Server-resolved tenant scope (never trusted from browser claims)
- `X-Session-Id`: Active live session scope
- `X-Schema-Version`: Contract version (e.g. `1.0.0`)
- `X-Producer`: Producing workload identity (`approval-control-service`)
- `X-Traceparent`: W3C distributed tracing context
- `X-Mode`: Execution mode (`SIMULATED`, `SANDBOX`, `CONFIRMED`)

**Zero-Float Invariant (Article V):**
All timestamps and duration measurements are exact integer millisecond values (`decided_at_ms`, `updated_at_ms`, `occurred_at_ms`). Floating-point types are strictly banned.

## 7. Error code mappings (LP05xxx policy domain)

| Condition | Error Code | Symbol | HTTP Status | Exposure | Retry Policy | Remediation |
|---|---|---|---|---|---|---|
| Policy rejects action | `LP05001` | `POLICY_REJECTED` | 422 | public | never | Fail closed; adjust parameters to satisfy policy |
| Approval required for action | `LP05002` | `APPROVAL_REQUIRED` | 202 | public | never | Prompt operator in Live Ops portal for approval |
| Unsupported session mode | `LP05003` | `UNSUPPORTED_SESSION_MODE` | 422 | public | never | Specify one of RECOMMEND_ONLY, ASSISTED, AUTONOMOUS |
| Emergency pause active | `LP05004` | `EMERGENCY_PAUSE_ACTIVE` | 422 | public | never | Reject mutation fail-closed; operator must resume session first |
| Approval request expired | `LP05005` | `APPROVAL_REQUEST_EXPIRED` | 410 | public | never | Time-to-live expired; request must be re-initiated |
| Approval request not found | `LP05006` | `APPROVAL_REQUEST_NOT_FOUND` | 404 | public | never | Verify approval_id and session_id scope |
| Decision already recorded | `LP05007` | `APPROVAL_DECISION_ALREADY_RECORDED` | 409 | public | never | Approval aggregate is terminal; duplicate decision rejected |
| Mode transition unauthorized | `LP05008` | `APPROVAL_MODE_TRANSITION_DENIED` | 403 | public | never | Elevate operator permissions or fulfill mode preconditions |

## 8. Verification gates

To verify the frozen contract and registrations, execute:
```bash
node scripts/contract-check/error-code-registry.mjs && \
node scripts/api/check-api-sot-traceability.mjs && \
node scripts/architecture/check-sot.mjs
```
All schema definitions, error code mappings, and SOT hierarchy tests must pass with zero errors.
