# G-PROMO-028 Architecture Specification

## Atomic outcome

Implement the Promotion Service capability: **DigitalOcean release**.

## Boundary

Promotion owns Promotion/Voucher lifecycle, proposal state, and status projection. It does not own margin calculation, inventory reservation, approval decisions, platform adapters, or the audit ledger. Dependencies: G-PROMO-027.

## Ports and adapters

- Inbound: authenticated Core BFF HTTP and versioned NATS messages.
- Application: one typed use case for this goal.
- Outbound: only the declared PostgreSQL, NATS, or integration ports in the touch map.

## Allowed files

- `code/apps/services/promotion-service/Dockerfile`
- `infra/promotion-service/docker-compose.yml`
- `docs/03-architecture/deployment/promotion-service-release-runbook.md`

## Verification

Run the goal conformance harness, architecture harness, API/SOT traceability, SOT hierarchy, error registry, service tests, and `git diff --check`. No production deployment is performed by this goal.

## Socratic five-why

The capability is split into one independently verifiable outcome so Team Agent waves can execute disjoint files without bypassing Promotion's authoritative-writer boundary.

