# G-PROMO-006: Architecture Specification

- Outcome: Promotion policy approval inventory and execution integrations.
- Requirement authority: REQ-LP-009, REQ-LP-010, REQ-LP-013 in the LivePilot requirements baseline.
- Source evidence: docs/03-architecture/api/services/README.md; F03.3-FLOW-001..008; F03.4-FLOW-001..008; F03-WORKFLOW-001..003.
- Bounded context: Promotion/Voucher lifecycle owned by promotion-service.
- Inbound ports: Core BFF request/reply and versioned NATS commands/events.
- Outbound ports: PostgreSQL authoritative state, inbox/outbox, margin, inventory, approval/control, execution, and audit contracts.
- Boundary decision: no browser-to-service direct call, no cross-service database writes, and no real marketplace credential in the pilot.
- Design decision: Promotion lifecycle advances only from versioned margin, approval, inventory, and adapter evidence.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs

