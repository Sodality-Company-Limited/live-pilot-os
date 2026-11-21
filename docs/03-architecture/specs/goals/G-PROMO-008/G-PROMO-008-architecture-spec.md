# G-PROMO-008: Architecture Specification

- Outcome: Promotion service runtime health security and observability.
- Requirement authority: REQ-LP-013 in the LivePilot requirements baseline.
- Source evidence: docs/03-architecture/deployment/runtime-topology-sot.md; docs/03-architecture/deployment/service-runtime-mapping-sot.md; docs/03-architecture/software-quality-sot.md.
- Bounded context: Promotion/Voucher lifecycle owned by promotion-service.
- Inbound ports: Core BFF request/reply and versioned NATS commands/events.
- Outbound ports: PostgreSQL authoritative state, inbox/outbox, margin, inventory, approval/control, execution, and audit contracts.
- Boundary decision: no browser-to-service direct call, no cross-service database writes, and no real marketplace credential in the pilot.
- Design decision: The service is production-shaped, private, observable, graceful, and non-root at runtime.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs

