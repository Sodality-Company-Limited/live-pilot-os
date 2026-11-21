# Worker Briefing: G-TELM-001

## Task Objective
Complete the Telemetry service contract in `docs/03-architecture/api/services/telemetry-service.md`, register the required NATS subjects in `asyncapi.yaml` and `nats-subject-catalog-sot.md`, ensure `schemas/nats/telemetry-signal.schema.json` is strictly valid, and add any missing error codes to `error-codes.yaml`.

## Acceptance Criteria
- [ ] `telemetry-service.md` contains ownership, aggregate, commands, events, state machine, errors, and delivery semantics.
- [ ] `telemetry-signal.schema.json` conforms to JSON schema standards.
- [ ] `asyncapi.yaml` defines `livepilot.v1.telemetry.signal.ingest` and `livepilot.v1.telemetry.signal.dlq`.
- [ ] Traceability and contract check commands pass green.
