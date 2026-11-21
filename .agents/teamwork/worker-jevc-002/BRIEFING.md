# Worker Briefing: G-JEVC-002

## Task Objective
Register JEV/Copilot NATS and provider schemas according to the 15-step microservice design discipline:
1. Create canonical JSON schema definitions under `docs/03-architecture/api/schemas/nats/`:
   - `jev-suggestion-proposed.schema.json` (events for newly generated recommendations with grounding refs, confidence, expiry)
   - `jev-suggestion-withdrawn.schema.json` (events when suggestions are retracted due to stale facts or manual override)
   - `jev-copilot-delivery-degraded.schema.json` (outage/degraded mode events for live HUD alert)
2. Update `docs/03-architecture/api/nats-subject-catalog-sot.md` with:
   - Subjects: `livepilot.v1.jev.suggestion.proposed`, `livepilot.v1.jev.suggestion.withdrawn`, `livepilot.v1.jev.delivery.degraded`
   - Envelope definitions, Ordering keys (`tenant_id:live_session_id`), Retries, JetStream streams, DLQ.
3. Update `docs/03-architecture/api/asyncapi.yaml` to define channels and message schemas for the new JEV Copilot events.
4. Populate `docs/03-architecture/specs/goals/G-JEVC-002/` specification files.

## Acceptance Criteria
- [ ] JSON schemas are strictly valid draft-07 or draft 2020-12 schemas with required properties and zero `any`.
- [ ] `nats-subject-catalog-sot.md` and `asyncapi.yaml` updated and in bitwise consistency.
- [ ] All 4 architecture and traceability checks pass green with 0 errors.
