# G-TELM-002 Pre-Execution Design Specification

## 1. Intent & Architectural Rationale

Verify backward compatibility, strict envelope conformance, and fail-closed rejection semantics for the frozen `telemetry.signal.livepilot.v1` contract (`docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json`) before database schema migrations (`G-TELM-003`), domain state machine code (`G-TELM-004`), or NATS JetStream ingestion workers (`G-TELM-005`) are built. Executing deterministic contract verification against golden positive and negative fixtures prevents silent schema drift, unversioned field leakage, header/body tenant mismatch, and floating-point timestamp corruption across producer versions (`1.0.0`, `1.x.y`).

## 2. Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Provide canonical golden positive fixtures (`tests/contracts/telemetry/fixtures/telemetry-signal.valid.json`) covering all four semantic telemetry categories (`chat`, `purchase` [`order`, `payment`, `checkout`, `cart_add`, `voucher`], `engagement` [`engagement`, `product_click`], and `system` [`viewer_count`, `stock`, DLQ replay envelope]) and all 10 schema-permitted `signal_type` variants.
  - Provide fail-closed negative fixtures (`tests/contracts/telemetry/fixtures/telemetry-signal.invalid.json`) verifying rejection of missing `tenant_id` / `session_id`, invalid RFC 3339 `occurred_at` timestamps, float `occurred_at_ms`, malformed SHA-256 `payload_hash`, illegal field types, unsupported `signal_type` values, unversioned additional properties, malformed `X-Traceparent` headers, breaking major `schema_version` bumps, invalid `dlq_metadata`, and envelope-to-header scope mismatches.
  - Execute a real, zero-dependency JSON Schema Draft 2020-12 validator (`tests/contracts/telemetry/run-contract-tests.mjs` and `tests/contracts/telemetry/telemetry-signal-contract.spec.ts`) directly against the frozen SOT schema file on disk.
- **Non-Goals / Anti-Goals:**
  - Modifying the frozen `telemetry-signal.schema.json` contract (`G-TELM-001`).
  - Connecting to live NATS JetStream brokers or PostgreSQL databases.
  - Simulating or mocking schema validation outcomes.

## 3. Approaches Considered & Rejected Alternatives

1. **String-based / regex smoke test over fixtures (Rejected):** Cannot verify nested `$defs` (`MessageHeaders`, `DlqMetadata`), `additionalProperties: false`, integer-vs-float bounds, or schema evolution rules reliably.
2. **Installing external `ajv` dependency in root without a root `package.json` (Rejected):** Mutates workspace dependency manifests outside the touch map and breaks zero-dependency Soda OS script execution.
3. **Self-contained JSON Schema Draft 2020-12 validator + Node native TypeScript `node:test` spec sharing one core engine (Selected):** Reads `telemetry-signal.schema.json` directly from disk, resolves `$ref` definitions (`#/$defs/...`), enforces strict type/format/pattern/range/additionalProperties constraints, checks envelope-header consistency, and exposes both a standalone CLI runner (`node tests/contracts/telemetry/run-contract-tests.mjs`) and a `node:test` TypeScript suite (`node --test tests/contracts/telemetry/telemetry-signal-contract.spec.ts`) with zero duplicated validation logic.

## 4. Selected Approach & Trade-off Analysis

Implementing a deterministic Draft 2020-12 schema validator in `run-contract-tests.mjs` and importing it into `telemetry-signal-contract.spec.ts` guarantees zero external package drift while maintaining a single source of validation truth. The validator enforces:
- Structural schema compliance against `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json` (`required`, `type`, `integer`, `enum`, `const`, `minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `format: "date-time"`, `additionalProperties`, `$ref`).
- Transport envelope consistency invariants between top-level fields (`tenant_id`, `session_id`, `correlation_id`, `idempotency_key`, `schema_version`, `producer`, `mode`) and NATS `headers` (`X-Tenant-Id`, `X-Session-Id`, `X-Correlation-Id`, `X-Idempotency-Key`, `X-Schema-Version`, `X-Producer`, `X-Mode`), plus W3C `X-Traceparent` compliance.
- Payload cryptographic integrity (`payload_hash` matches SHA-256 of canonical `payload` JSON when present) and zero-float integer `occurred_at_ms` invariants.

## 5. Bounded Context & Touch Map Invariants

All artifacts remain strictly within the declared `G-TELM-002` touch map:
- `tests/contracts/telemetry/telemetry-signal-contract.spec.ts`
- `tests/contracts/telemetry/run-contract-tests.mjs`
- `tests/contracts/telemetry/fixtures/telemetry-signal.valid.json`
- `tests/contracts/telemetry/fixtures/telemetry-signal.invalid.json`
- `docs/07-backlog/goals/G-TELM-002.md`
- `docs/03-architecture/specs/goals/G-TELM-002/design.md`

The frozen schema at `docs/03-architecture/api/schemas/nats/telemetry-signal.schema.json` is read-only and never altered.

## 6. Acceptance Test & TDD Verification Strategy

1. **Positive Golden Suite:** Every fixture in `telemetry-signal.valid.json` (covering `chat`, `purchase` [`order`, `payment`, `checkout`, `cart_add`, `voucher`], `engagement` [`engagement`, `product_click`], and `system` [`viewer_count`, `stock`, `dead_lettered` DLQ], across `1.0.0` and additive `1.x.y` versions) passes Draft 2020-12 validation, header consistency checks, and payload SHA-256 verification with zero errors.
2. **Negative Fail-Closed Suite:** Every fixture in `telemetry-signal.invalid.json` is rejected fail-closed with structured diagnostic errors (`path`, `keyword`, `code`, `message`) matching its declared expected failure mode.
3. **Verification Commands:**
   - `node tests/contracts/telemetry/run-contract-tests.mjs`
   - `node --test tests/contracts/telemetry/telemetry-signal-contract.spec.ts`
   - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-TELM-002.md`
