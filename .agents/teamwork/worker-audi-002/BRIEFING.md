# Worker Briefing: G-AUDI-002 Message Compatibility & Golden Fixtures

## Objective
Implement comprehensive contract compatibility tests and golden fixtures for `audit-receipt.schema.json`:
1. Create `tests/contracts/audit/fixtures/audit-receipt.valid.json` covering all valid variants (accepted, rejected, failed, unknown, reconciled).
2. Create `tests/contracts/audit/fixtures/audit-receipt.invalid.json` covering missing fields, short IDs, invalid result enums, extra properties, etc.
3. Create `tests/contracts/audit/run-contract-tests.mjs` verifying JSON schema conformance and envelope consistency.
4. Author `docs/03-architecture/specs/goals/G-AUDI-002/design.md` satisfying Invariant 13.
5. Update `docs/07-backlog/goals/G-AUDI-002.md` to `status: done`, steps and criteria `[x]`, phase `SHIP`.
6. Verify 100% test pass with zero mocks.
