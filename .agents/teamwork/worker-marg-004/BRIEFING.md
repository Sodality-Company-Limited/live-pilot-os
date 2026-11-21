# Subagent Briefing: G-MARG-004

## Objective
Implement the first vertical slice of `margin-policy-service` executing F03.3-FLOW-001, FLOW-002, and FLOW-003 with zero mocks.

## Requirements
1. **Service Setup:**
   - Initialize `code/services/margin-policy-service/package.json` and `tsconfig.json`.
   - Node.js ES modules (`"type": "module"`).

2. **Core Domain Math (`src/domain/margin-calculator.ts` or `.mjs`):**
   - Exact integer minor-unit arithmetic:
     - `effective_price = price_minor - candidate_discount_minor`
     - `net_margin_minor = effective_price - cogs_minor - platform_fee_minor - shipping_fee_minor`
     - `margin_bps = Math.floor(Number((net_margin_minor * 10000n) / effective_price))` (using Banker's rounding / BigInt integer division; handle zero effective price)
   - Verdict determination:
     - If `margin_bps >= floor_bps`: `APPROVED`
     - Else: `REJECTED` (with floor calculation)
   - Strict Zero-Float: Reject any input with decimal point or floating representation.

3. **Repository & Outbox Boundary (`src/storage/`):**
   - In-memory or pg-compatible persistence boundary for policies and verdicts.
   - Transactional outbox pattern: writes to `margin_outbox` atomically with verdict.

4. **Service Handler & Vertical Slice Runner (`src/service.ts` or `src/index.ts`):**
   - Request handler for `livepilot.v1.margin.evaluation.request`:
     Validates request -> checks policy -> calculates margin -> records verdict + outbox -> emits reply.

5. **Zero-Mock Unit Tests (`tests/unit/margin-policy-service/` or `code/services/margin-policy-service/test/`):**
   - Test F03.3-FLOW-001 (Calculate contribution margin)
   - Test F03.3-FLOW-002 (Approve safe discount >= 10% floor)
   - Test F03.3-FLOW-003 (Reject loss-making discount < 10% floor)
   - Test Transactional Outbox atomicity
   - Test zero float rejection
