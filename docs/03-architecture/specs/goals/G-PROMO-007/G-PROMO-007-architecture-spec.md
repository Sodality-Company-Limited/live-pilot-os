# G-PROMO-007: Architecture Specification

- Outcome: Promotion reliability pause retry DLQ and audit.
- Requirement authority: REQ-LP-013, REQ-LP-015 in the LivePilot requirements baseline.
- Source evidence: docs/03-architecture/api/nats-subject-catalog-sot.md; F03-WORKFLOW-002..006; F04.3-FLOW-003..006.
- Bounded context: Promotion/Voucher lifecycle owned by promotion-service.
- Inbound ports: Core BFF request/reply and versioned NATS commands/events.
- Outbound ports: PostgreSQL authoritative state, inbox/outbox, margin, inventory, approval/control, execution, and audit contracts.
- Boundary decision: no browser-to-service direct call, no cross-service database writes, and no real marketplace credential in the pilot.
- Design decision: Unknown, retryable, non-retryable, pause, and audit outcomes are durable and fail closed.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs

