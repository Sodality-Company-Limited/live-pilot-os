# G-PROMO-004: Architecture Specification

- Outcome: Promotion proposal lifecycle and idempotency.
- Requirement authority: REQ-LP-008, REQ-LP-009, REQ-LP-013 in the LivePilot requirements baseline.
- Source evidence: docs/03-architecture/api/openapi.yaml; docs/03-architecture/api/api-operation-catalog-sot.md; F03-FLOW-001..004.
- Bounded context: Promotion/Voucher lifecycle owned by promotion-service.
- Inbound ports: Core BFF request/reply and versioned NATS commands/events.
- Outbound ports: PostgreSQL authoritative state, inbox/outbox, margin, inventory, approval/control, execution, and audit contracts.
- Boundary decision: no browser-to-service direct call, no cross-service database writes, and no real marketplace credential in the pilot.
- Design decision: A valid proposal produces one pending lifecycle and duplicate/conflicting requests fail safely.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs

