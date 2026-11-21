# G-JEVC-005 Worktree & Execution Plan

## Touch Map
- `code/services/jev-copilot-service/src/domain/`
  - `suggestion-aggregate.mjs`
- `code/services/jev-copilot-service/src/handlers/`
  - `suggestion-command-handler.mjs`
- `code/services/jev-copilot-service/src/nats/`
  - `nats-publisher.mjs`
  - `nats-consumer.mjs`
- `code/services/jev-copilot-service/test/`
  - `vertical-slice.test.mjs`
- `docs/03-architecture/specs/goals/G-JEVC-005/`
  - `G-JEVC-005-architecture-spec.md`
  - `G-JEVC-005-fsm-runtime-spec.md`
  - `G-JEVC-005-invariants-formal-spec.md`
  - `G-JEVC-005-threat-model.md`
  - `G-JEVC-005-worktree-plan.md`

## Verification Command
```bash
node code/services/jev-copilot-service/test/vertical-slice.test.mjs && node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node scripts/testing/check-tdd-traceability.mjs
```
