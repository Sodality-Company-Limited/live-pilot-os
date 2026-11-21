# G-PROMO-001: Architecture Specification

- Outcome: Promotion service contract and SOT.
- Requirement authority: REQ-LP-008, REQ-LP-009, REQ-LP-013 in the LivePilot requirements baseline.
- Source evidence: docs/03-architecture/api/services/promotion-service.md; docs/03-architecture/api/domain-resource-state-sot.md; docs/03-architecture/api/nats-subject-catalog-sot.md.
- Bounded context: Promotion/Voucher lifecycle owned by promotion-service.
- Inbound ports: Core BFF request/reply and versioned NATS commands/events.
- Outbound ports: PostgreSQL authoritative state, inbox/outbox, margin, inventory, approval/control, execution, and audit contracts.
- Boundary decision: no browser-to-service direct call, no cross-service database writes, and no real marketplace credential in the pilot.
- Design decision: promotion-service owns Promotion/Voucher lifecycle; other Engineer 2 services remain separate authorities.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs

