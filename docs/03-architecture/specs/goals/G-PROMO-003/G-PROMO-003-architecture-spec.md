# G-PROMO-003: Architecture Specification

- Outcome: Promotion persistence and transactional outbox.
- Requirement authority: REQ-LP-008, REQ-LP-013 in the LivePilot requirements baseline.
- Source evidence: docs/03-architecture/api/domain-resource-state-sot.md; docs/03-architecture/technical-specifications-sot.md.
- Bounded context: Promotion/Voucher lifecycle owned by promotion-service.
- Inbound ports: Core BFF request/reply and versioned NATS commands/events.
- Outbound ports: PostgreSQL authoritative state, inbox/outbox, margin, inventory, approval/control, execution, and audit contracts.
- Boundary decision: no browser-to-service direct call, no cross-service database writes, and no real marketplace credential in the pilot.
- Design decision: Promotion aggregate has one writer; state and outbox commit atomically.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs

