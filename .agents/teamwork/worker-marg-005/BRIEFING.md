# Subagent Briefing: G-MARG-005

## Objective
Extend `margin-policy-service` with enterprise resilience, alternative discount generation, stale economics invalidation, and DLQ/replay mechanics (F03.3-FLOW-004 through FLOW-008).

## Requirements
1. **Alternative Discount & Bundle Engine (`src/domain/alternatives-engine.mjs`):**
   - Calculate exact maximum allowable discount `max_discount_minor` that guarantees `margin_bps >= floor_bps`:
     `max_discount_minor = ( (10000n - floor_bps) * price_minor - 10000n * (cogs + fees) ) / (10000n - floor_bps)`
   - Propose bundle alternative (e.g. recommend Duo Glow Set) when single-item discount is rejected.

2. **Stale Economics & Re-evaluation (`src/service/stale-economics-handler.mjs`):**
   - Invalidate existing pending approvals when catalog price or COGS changes.
   - Re-evaluate candidate discount against updated catalog economics.

3. **Idempotency & Deduplication Guard:**
   - Detect repeated `idempotency_key` requests and return cached verdict without emitting duplicate outbox events.

4. **DLQ Interceptor & Error Classification:**
   - Classify transient vs non-transient errors.
   - Route unprocessable messages to DLQ subject `livepilot.v1.margin.verdict.recorded.dlq`.

5. **Unit & Integration Tests:**
   - Author tests in `code/services/margin-policy-service/test/margin-reliability.test.mjs` covering alternatives, stale economics re-evaluation, idempotency caching, and DLQ handling.
