# Worker Briefing: G-TELM-002

## Objective
Establish golden fixtures and automated schema validation tests for `telemetry-signal` contract.
Enforce backward compatibility, valid envelope headers (`tenant_id`, `session_id`, `traceparent`), and fail-closed rejections for malformed payloads.

## Invariants
- Article I: Zero mocks, zero stubs. The validator must run a real JSON Schema validator (or Ajv-compliant validation runner) against `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`.
- Article II: Automated test execution passes 100%.
