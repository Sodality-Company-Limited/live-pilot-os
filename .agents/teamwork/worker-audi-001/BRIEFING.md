# Worker Briefing: G-AUDI-001 Contract & Error Registry

## Objective
Freeze the contract for `audit-service`:
1. Author `docs/03-architecture/api/services/audit-service.md` following canonical service contract format.
2. Ensure `docs/03-architecture/api/schemas/nats/audit-receipt.schema.json` is comprehensive.
3. Register error codes `LP13001` through `LP13005` in `docs/03-architecture/api/error-codes.yaml`.
4. Ensure NATS subject registrations in `asyncapi.yaml` and `nats-subject-catalog-sot.md`.
5. Verify zero deviations with architecture traceability harnesses.
