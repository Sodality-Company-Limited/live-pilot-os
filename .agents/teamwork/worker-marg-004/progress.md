# Worker Progress: worker-marg-004

- **Goal:** `G-MARG-004` (Implement Core Margin Calculation and First Vertical Slice)
- **Status:** In Progress -> Complete

## Work Log
- [x] Initialized `code/services/margin-policy-service/package.json` with Node test runner script.
- [x] Configured `code/services/margin-policy-service/tsconfig.json`.
- [x] Implemented domain calculator `code/services/margin-policy-service/src/domain/margin-calculator.mjs`:
  - BigInt integer minor-unit arithmetic
  - Banker's Rounding Half-Even `divHalfEven`
  - Strict zero-float assertion `assertMinorUnits`
  - Margin bps calculation and floor policy comparison (F03.3-FLOW-001, FLOW-002, FLOW-003)
  - Safer alternative discount and bps computation for rejected evaluation
- [x] Implemented persistence and transactional outbox boundary `code/services/margin-policy-service/src/storage/margin-repository.mjs`:
  - PostgreSQL / in-memory ACID dual-mode
  - Atomic verdict, outbox event, and idempotency write in one transaction
- [x] Implemented service entry point `code/services/margin-policy-service/src/margin-policy-service.mjs`:
  - Handles `livepilot.v1.margin.evaluation.request`
  - Idempotency check and replay protection
  - Emits outbox events `livepilot.v1.margin.verdict.approved` and `livepilot.v1.margin.verdict.rejected`
- [x] Authored zero-mock test suite `code/services/margin-policy-service/test/margin-vertical-slice.test.mjs`:
  - Article V zero-float validation & float rejection
  - FLOW-001 & FLOW-002 APPROVED verdict evaluation
  - FLOW-003 REJECTED verdict evaluation with safer alternative discount
  - Transactional outbox atomicity and idempotency replay verification
- [x] Ran test suite: `npm test --prefix code/services/margin-policy-service` (6/6 tests passing, 0 failing).
- [x] Validated goal conformance: `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-MARG-004.md` (51/51 sections passed).
