# Worker Briefing: G-AUDI-004 Domain State Machine & Redaction Filter

## Objective
Implement pure domain models for `audit-service`:
1. `code/services/audit-service/src/domain/audit-state-machine.ts`:
   - States: `received`, `validated`, `redacted`, `hashed`, `committed`, `failed`, `dead_lettered`
   - Legal forward transitions: `received -> validated -> redacted -> hashed -> committed`
   - Failure transitions: any non-terminal state -> `failed -> dead_lettered`
   - Monotonic state progression, immutable event transitions, zero-float epoch timestamps
2. `code/services/audit-service/src/domain/redaction-filter.ts`:
   - Redact sensitive keys: `password`, `token`, `secret`, `authorization`, `cogs`, `cost`, `margin_rate`, `credit_card`, `api_key`
   - Recursively sanitize payloads, preserving structure while masking values with `[REDACTED]`
3. Unit test suites under `code/services/audit-service/test/unit/`:
   - `audit-state-machine.spec.ts`: test all legal edges, illegal transitions, terminal states
   - `redaction-filter.spec.ts`: test key scrubbing, nested objects, array values, fail-closed handling
4. Update `package.json` with `"scripts": { "test:unit": "node --test test/unit/*.spec.ts" }`
5. Author `docs/03-architecture/specs/goals/G-AUDI-004/design.md` satisfying Invariant 13.
6. Update `docs/07-backlog/goals/G-AUDI-004.md` to `status: done`, steps and criteria `[x]`, phase `SHIP`.
