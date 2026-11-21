# G-PROMO-009: Architecture Specification

- Outcome: Promotion service DigitalOcean release and rollback evidence.
- Requirement authority: REQ-LP-013, REQ-LP-015 in the LivePilot requirements baseline.
- Source evidence: docs/03-architecture/deployment/deployment-pipeline-sot.md; docs/03-architecture/deployment/migration-rollback-sot.md; docs/03-architecture/deployment/digitalocean-droplets-sot.md.
- Bounded context: Promotion/Voucher lifecycle owned by promotion-service.
- Inbound ports: Core BFF request/reply and versioned NATS commands/events.
- Outbound ports: PostgreSQL authoritative state, inbox/outbox, margin, inventory, approval/control, execution, and audit contracts.
- Boundary decision: no browser-to-service direct call, no cross-service database writes, and no real marketplace credential in the pilot.
- Design decision: One immutable Promotion service release has health, smoke, observability, backup/rollback, and human approval evidence for DigitalOcean.
- Verification: node scripts/api/check-api-sot-traceability.mjs; node scripts/architecture/check-sot.mjs

