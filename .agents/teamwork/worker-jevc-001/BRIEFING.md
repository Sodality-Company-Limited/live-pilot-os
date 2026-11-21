# Worker Briefing: G-JEVC-001

## Task Objective
Freeze JEV/Copilot service scope and contract in `docs/03-architecture/api/services/jev-copilot-service.md` and complete its specification files under `docs/03-architecture/specs/goals/G-JEVC-001/` according to the 15-step microservice design discipline:
1. Ownership & Non-ownership boundary (owns Suggestion & ProviderReceipt; does NOT own Voucher, Margin, Inventory, Approval, Platform execution).
2. Authoritative writer definition.
3. Suggestion State Machine (`proposed → grounded → delivered → used | edited | dismissed | expired | withdrawn`).
4. Commands, Events, NATS subjects, Idempotency, and DLQ semantics.
5. Error mapping (LPxxxxx registry mapping).
6. Security redaction (PII, COGS, tokens) and audit receipts.

## Acceptance Criteria
- [ ] `docs/03-architecture/api/services/jev-copilot-service.md` completely detailed with all 14 mandatory contract sections.
- [ ] Invariant specs and FSM runtime spec fully filled without placeholders.
- [ ] All 4 architecture and traceability checks pass green with zero errors.
