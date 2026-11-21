# G-JEVC-004 Worktree & Execution Plan

## Touch Map
- `code/services/jev-copilot-service/src/provider/`
  - `provider-interface.mjs`
  - `inference-adapter.mjs`
  - `openai-provider.mjs`
  - `gemini-provider.mjs`
  - `provider-adapter.mjs`
- `code/services/jev-copilot-service/test/provider.test.mjs`
- `docs/03-architecture/specs/goals/G-JEVC-004/`
  - `G-JEVC-004-architecture-spec.md`
  - `G-JEVC-004-invariants-formal-spec.md`
  - `G-JEVC-004-fsm-runtime-spec.md`
  - `G-JEVC-004-threat-model.md`
  - `G-JEVC-004-worktree-plan.md`

## Verification Command
```bash
node code/services/jev-copilot-service/test/provider.test.mjs && node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node scripts/testing/check-tdd-traceability.mjs
```
