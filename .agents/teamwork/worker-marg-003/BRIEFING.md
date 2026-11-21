# Subagent Briefing: G-MARG-003

## Objective
Author the NATS message schemas, AsyncAPI channel definitions, error code entries, and contract tests for `margin-policy-service`.

## Requirements
1. **JSON Schemas:**
   - `docs/03-architecture/api/schemas/nats/margin-evaluation-request.schema.json`:
     Envelope with `live_session_id`, `tenant_id`, `correlation_id`, `causation_id`, `price_minor` (integer >= 0), `candidate_discount_minor` (integer >= 0), `cogs_minor` (integer >= 0), `platform_fee_minor` (integer >= 0), `shipping_fee_minor` (integer >= 0), `currency` (3 uppercase letters), `scale` (integer 0-4).
   - `docs/03-architecture/api/schemas/nats/margin-evaluation-reply.schema.json`:
     `verdict_id`, `status` (`APPROVED`, `NEEDS_APPROVAL`, `REJECTED`, `UNKNOWN`), `net_margin_minor` (integer), `margin_bps` (integer), `floor_bps` (integer), `safer_alternative_discount_minor`, `safer_alternative_margin_bps`, breakdown details.
   - `docs/03-architecture/api/schemas/nats/margin-verdict-recorded.schema.json`:
     Domain event schema for verdict broadcast.

2. **AsyncAPI & NATS Catalog:**
   - Update `docs/03-architecture/api/asyncapi.yaml` with channels:
     - `livepilot.v1.margin.evaluation.request` / `reply`
     - `livepilot.v1.margin.verdict.recorded` / DLQ
   - Update `docs/03-architecture/api/nats-subject-catalog-sot.md`.

3. **Error Codes:**
   - Ensure error codes `LP04001` to `LP04006` are declared in `docs/03-architecture/api/error-codes.yaml` and pass `node scripts/contract-check/error-code-registry.mjs`.

4. **Contract Tests:**
   - Create `tests/contracts/margin/margin-contract.test.mjs` verifying valid payloads pass, invalid payloads fail closed, and float values are rejected.
