# Epics

> An epic is a **namespace** for goal IDs (`G-PAY-001`). It is not a goal and has no status machine.  
> Contract: [goal-id.md](../06-workflows/goal-id.md)

Register a slug here **before** `soda-os goal next <EPIC>`. Slug = 2–8 letters `A-Z`. Do not use `E-` (Evidence).

## Registered epics

| Epic | Name | Notes |
|------|------|-------|
| CORE | Core / unscoped | Implicit home of legacy `G-001`. New unscoped work: `soda-os goal next CORE` |
| APPR | Approval and Control Service | Approval modes, operator approvals, Emergency Pause, and DigitalOcean readiness |
| AUDI | Audit Service & Immutable Decision Ledger | Append-only execution and decision ledger, hash chaining, and DO deployment |
| CATA | Catalog Service | Catalog bounded-context delivery through DigitalOcean readiness |
| DAVE | DAVE Decision System & Governance | Domain-Adaptive, Evidence-Grounded, Confidence-Calibrated SYSTEM 1 decision engine |
| EXEC | Execution & Platform Adapter Safety | Contract-first execution action dispatch, adapter idempotency, retry, timeout, DLQ, and reconciliation through DigitalOcean readiness |
| IDEN | Identity and Session Service | Active queue |
| INTE | Intent/Risk Service | Independently deployable intent classification and moderation-risk service |
| INVT | Inventory Service | Authoritative stock reservation, concurrency locking, and DigitalOcean readiness |
| JEVC | JEV/Copilot Service | Independently deployable governed JEV and Host Co-pilot service |
| LIVE | Live-session service | Live-session lifecycle through DigitalOcean readiness |
| MARG | Margin Policy Service | Margin protection and economic policy through DigitalOcean readiness |
| ML | Machine Learning & Cognitive Calibration | Autoregressive model training with RLCD calibrated rewards & Soda OS integration |
| OPS | DAVE Operations & Deployment Governance | Active queue |
| PAY | PAY | Active queue |
| PROMO | Promotion Service | Promotion service contract-to-DigitalOcean delivery |
| PROOF | DAVE Mathematical Invariant & Assurance Proofs | Executable property registry, statistical claims, and cryptographic proof receipts |
| SEC | DAVE Multimodal Security & Privacy Controls | Active queue |
| TELM | Telemetry Service | Contract-first service delivery through DigitalOcean pilot runtime |
| TEMPLATE | TEMPLATE | Active queue |
| UX | Multimodal UX/UI Design Decision Layer | Mathematically grounded, confidence-calibrated multimodal design decision making, vision perception, 12-persona deliberation, and calibration-aware RL (G-UX-001..028) |
| WEB | DAVE Exact Web Application Pipeline | Reference-grounded, confidence-calibrated exact design web application pipeline (G-WEB-001..012) |

## Create an epic

Do this on **`main`** so the epic branch never has to patch shared index files.

1. Pick a unique slug (`PAY`, `AUTH`, `ONBOARD`)
2. Add a row to the table above
3. Copy [`queues/_template.md`](queues/_template.md) → `queues/PAY.md`
4. Add one Dashboard link in [`goals.md`](goals.md)
5. Optional: copy [`epics/_template.md`](epics/_template.md) → `epics/PAY.md`
6. Cut branch **`epic/PAY`**. On that branch, **"สร้าง goal"** / `soda-os goal next` allocates PAY automatically. No need to reserve a count first.

## Related

- [goals.md](goals.md) — process + Dashboard links (no per-goal rows)
- [queues/CORE.md](queues/CORE.md) — per-epic queues
- [goal-id-registry.yaml](goal-id-registry.yaml) — sequence reservation
- [goal-id.md](../06-workflows/goal-id.md) — merge protocol
