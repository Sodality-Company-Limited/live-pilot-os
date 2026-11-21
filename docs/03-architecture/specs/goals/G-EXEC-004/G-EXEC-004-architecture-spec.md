# Architecture Spec: G-EXEC-004: Schema Compatibility

Validates that Execution & Platform Adapter Safety event payloads strictly conform to:
- JSON Schema Draft 2020-12 definition in `docs/03-architecture/api/schemas/nats/execution-update.schema.json`.
- AsyncAPI 3.0.0 channel definition in `docs/03-architecture/api/asyncapi.yaml`.
- Canonical NATS Subject Catalog registration and SHA-256 integrity hash in `docs/03-architecture/api/nats-subject-catalog-sot.md`.
- Required transport header contract (`Nats-Msg-Id`, `X-Correlation-Id`, `X-Idempotency-Key`, `X-Tenant-Id`, `X-Session-Id`, `X-Schema-Version`, `X-Producer`, `X-Traceparent`, `X-Mode`).
