# Architecture Spec: G-APPR-001 (Approval & Control Service Contract)

## 1. System Context & Bounded Context Authority
Approval & Control service owns `livepilot.v1.control.approval.*`, `livepilot.v1.control.mode.*`, and `livepilot.v1.control.emergency_pause.*`. It is the authoritative control-plane writer for operator approvals, approval modes (`RECOMMEND_ONLY`, `ASSISTED`, `AUTONOMOUS`), and emergency pause state.

## 2. Ports & Adapters Architecture
- **Inbound Transport Port:** NATS JetStream consumer subscribing to:
  - `livepilot.v1.control.approval.decision.request`
  - `livepilot.v1.control.mode.update.request`
  - `livepilot.v1.control.pause.request`
- **Outbound Persistence Port:** PostgreSQL 16 connection pool driving transactions over `approvals`, `control_modes`, and `emergency_pauses` tables alongside transactional `control_outbox`.
- **Outbound Event Port:** NATS JetStream publisher emitting:
  - `livepilot.v1.control.approval.decision.recorded`
  - `livepilot.v1.control.mode.updated`
  - `livepilot.v1.control.emergency_pause.changed`

## 3. Explicit Non-Ownership Boundaries
The service strictly does not own:
- Promotion vouchers, discount curves, or coupon codes (`promotion-service`)
- Margin floors, COGS thresholds, or gross profit calculations (`margin-policy-service`)
- Stock levels, SKU reservations, or inventory commits (`inventory-service`)
- TikTok Shop / marketplace adapters or live HTTP requests (`execution-service`)
- Audit ledger append-only Merkle tree chaining (`audit-service`)
