# Worker Briefing: G-JEVC-004

## Task Objective
Implement production-grade, provider-neutral inference adapter for `jev-copilot-service` according to Step 9 (Adapter/Infrastructure Boundary):
1. In `code/services/jev-copilot-service/src/provider/`:
   - `provider-adapter.mjs`: Unified interface defining `generateSuggestion({ prompt, context, constraints, tenantId, sessionId })`.
   - Implement provider backends or deterministic protocol runner supporting Gemini/OpenAI/Anthropic compatible interfaces.
   - Enforce token budgets, microsecond timeout ceilings, and structured JSON output validation conforming to `jev-suggestion-proposed.schema.json`.
   - Calculate cost accounting using Money Value Object pattern `(cost_minor: BigInt, cost_currency: 'USD', cost_scale: 6)`.
   - Handle provider failure states cleanly: map to `accepted`, `deferred`, `refused`, `timeout`, `unknown`, `conflict`. Fail closed on timeout/network error with visible degraded alert.
2. In `code/services/jev-copilot-service/test/provider.test.mjs`:
   - Test structured response parsing, schema validation, timeout failure-closed handling, token cost minor accounting, and degraded failover.
3. Complete spec files under `docs/03-architecture/specs/goals/G-JEVC-004/`.

## Acceptance Criteria
- [ ] 100% Zero Mocks, Zero Stubs in production provider adapter.
- [ ] Money Value Object cost representation.
- [ ] Fail-closed degraded state handling.
- [ ] All unit tests and 4 SOT checks pass green.
