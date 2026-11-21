# G-JEVC-006 Worktree & Execution Plan

## Touch Map
- `code/services/jev-copilot-service/src/domain/`
  - `suggestion-aggregate.mjs`
- `code/services/jev-copilot-service/src/handlers/`
  - `suggestion-lifecycle-handler.mjs`
- `code/services/jev-copilot-service/test/`
  - `lifecycle.test.mjs`
- `docs/03-architecture/specs/goals/G-JEVC-006/`
  - `G-JEVC-006-architecture-spec.md`
  - `G-JEVC-006-fsm-runtime-spec.md`
  - `G-JEVC-006-invariants-formal-spec.md`
  - `G-JEVC-006-threat-model.md`
  - `G-JEVC-006-worktree-plan.md`

## Verification Command
```bash
node code/services/jev-copilot-service/test/lifecycle.test.mjs && node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node scripts/testing/check-tdd-traceability.mjs
```
