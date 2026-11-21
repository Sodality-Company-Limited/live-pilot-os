# G-PROMO-002: Architecture Specification

- Outcome: Promotion event schemas and NATS compatibility.
- Requirement authority: REQ-LP-008, REQ-LP-013 in the LivePilot requirements baseline.
- Source evidence: docs/03-architecture/api/asyncapi.yaml; docs/03-architecture/api/nats-subject-catalog-sot.md; docs/03-architecture/api/schemas/nats/.
- Bounded context: Promotion/Voucher lifecycle owned by promotion-service.
- Inbound ports: Core BFF request/reply and versioned NATS commands/events.
- Outbound ports: PostgreSQL authoritative state, inbox/outbox, margin, inventory, approval/control, execution, and audit contracts.
- Boundary decision: no browser-to-service direct call, no cross-service database writes, and no real marketplace credential in the pilot.
- Design decision: Commands and events are versioned, duplicate-safe, and published after commit.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs

