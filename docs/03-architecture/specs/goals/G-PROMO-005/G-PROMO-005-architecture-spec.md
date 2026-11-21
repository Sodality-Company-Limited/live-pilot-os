# G-PROMO-005: Architecture Specification

- Outcome: Promotion status read model and reconciliation projection.
- Requirement authority: REQ-LP-008, REQ-LP-010, REQ-LP-013 in the LivePilot requirements baseline.
- Source evidence: docs/03-architecture/api/schemas/promotion.schema.json; F03.2-FLOW-002..008; F03-WORKFLOW-003.
- Bounded context: Promotion/Voucher lifecycle owned by promotion-service.
- Inbound ports: Core BFF request/reply and versioned NATS commands/events.
- Outbound ports: PostgreSQL authoritative state, inbox/outbox, margin, inventory, approval/control, execution, and audit contracts.
- Boundary decision: no browser-to-service direct call, no cross-service database writes, and no real marketplace credential in the pilot.
- Design decision: Consumers can observe authoritative promotion state including pending/unknown/reconciled outcomes.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs

