# Briefing: G-INVT-001 Service Contract & Schemas

## Objective
Author the authoritative Service Contract, JSON Schemas, AsyncAPI channels, and NATS subject mappings for `inventory-service` according to the 15-step standard.

## Acceptance Criteria
- [ ] `docs/03-architecture/api/services/inventory-service.md` specifies ownership, commands, events, state machine, errors, and persistence boundaries.
- [ ] `inventory-reservation-request.schema.json`, `inventory-reservation-reply.schema.json`, and `inventory-stock-updated.schema.json` are valid JSON Schema draft-07 schemas.
- [ ] `docs/03-architecture/api/asyncapi.yaml` and `docs/03-architecture/api/nats-subject-catalog-sot.md` include inventory channels and subjects.
- [ ] Error codes LP13001-LP13005 pass `node scripts/contract-check/error-code-registry.mjs`.
