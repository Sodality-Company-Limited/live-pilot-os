# BRIEFING: worker-live-004

## Objective
Execute G-LIVE-004:
1. Prove reliability and isolated service readiness for `code/services/session-service`:
   - Duplicate-safety & idempotency cache retention.
   - Timeout & dependency uncertainty handling (pending / unknown responses, fail-closed).
   - Retry policy and dead-letter queue (DLQ) subject verification (`livepilot.v1.session.lifecycle.dlq`).
   - Replay authorization verification.
   - Pause state fail-closed verification.
   - Outbox atomicity & secret/PII redaction checks.
2. Implement reliability test suite `code/services/session-service/test/reliabilityAndGates.test.mjs`.
3. Deliver design spec to `docs/03-architecture/specs/goals/G-LIVE-004/design.md`.
4. Ensure all repository gates pass:
   - `node scripts/contract-check/error-code-registry.mjs`
   - `node scripts/api/check-api-sot-traceability.mjs`
   - `node scripts/testing/check-tdd-traceability.mjs`
   - `npm --prefix code/services/session-service run test`
5. Advance `docs/07-backlog/goals/G-LIVE-004.md` through `ready` -> `in_progress` -> `done`, check off criteria, and run `node ./cli.js goal close G-LIVE-004`.
6. Write terminal handoff to `.agents/teamwork/worker-live-004/handoff.md`.

## Acceptance Criteria
- [ ] Reliability & DLQ test suite executed and passing 100% green.
- [ ] All Soda OS architecture and contract gates passing.
- [ ] Goal closed and archived cleanly.
