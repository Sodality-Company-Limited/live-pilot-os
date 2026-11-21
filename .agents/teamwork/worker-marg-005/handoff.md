# Handoff: worker-marg-005 (G-MARG-005)

- **Worker:** `worker-marg-005`
- **Role:** `implementer`
- **Persona:** `Lead Reliability & Edge-Case Resilience Engineer`
- **Goal:** `G-MARG-005` (Implement Safer Alternatives, Re-evaluation, and Reliability Engine)
- **Terminal Status:** `COMPLETE`

## Deliverables Summary
1. **Safer Alternatives Engine (`code/services/margin-policy-service/src/domain/alternatives-engine.mjs`):**
   - Implemented `calculateMaxAllowableDiscount`: exact integer ceiling division calculating maximum discount maintaining `>= floor_bps`.
   - Implemented `generateAlternatives`: returns safer discount recommendations and verified bundle alternatives (e.g., Duo Glow Set at 47.93% margin).
2. **Stale Economics Handler (`code/services/margin-policy-service/src/service/stale-economics-handler.mjs`):**
   - Handles `livepilot.v1.catalog.product.updated`.
   - Invalidates stale pending approvals with `livepilot.v1.margin.verdict.invalidated` events.
   - Automatically re-evaluates pending proposals against updated price/COGS economics.
3. **Core Reliability & Policy Service Enhancement (`code/services/margin-policy-service/src/margin-policy-service.mjs`):**
   - F03.3-FLOW-004: Conditional review band routing to `NEEDS_APPROVAL`.
   - F03.3-FLOW-005: Safer discount alternatives and Duo bundle attachment on non-approval.
   - F03.3-FLOW-007: SHA-256 evidence hashing and immutable correlation/causation preservation.
   - Idempotency deduplication guard returning cached verdicts without duplicate outbox emissions.
   - Fatal unhandled error interceptor and DLQ routing to `livepilot.v1.margin.verdict.recorded.dlq`.
4. **Storage Outbox DLQ Support (`code/services/margin-policy-service/src/storage/margin-repository.mjs`):**
   - Added `recordDlqEvent` with `status: DEAD_LETTER`.
   - Added `review_band_bps` persistence to policy store.
5. **Zero-Mock Test Suite (`code/services/margin-policy-service/test/margin-reliability.test.mjs`):**
   - 7 new test cases covering all 6 resilience & reliability invariants.
   - 100% pass across all 13 tests in `margin-policy-service`.

## Verification Evidence
- `npm test --prefix code/services/margin-policy-service`:
  ```
  ℹ tests 13
  ℹ suites 12
  ℹ pass 13
  ℹ fail 0
  ```
- `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-MARG-005.md`:
  ```
  ✅ 100% Conformance Verified (51/51 sections & invariants passed)
  ```

## Acceptance Criteria Satisfied
- [x] Alternative recommendation lowers discount to achieve >= 1000 bps without exceeding original discount.
- [x] Economics change events trigger re-evaluation and invalidate prior pending approvals.
- [x] Duplicate requests return identical cached verdict without duplicate outbox events.
- [x] Review band triggers `NEEDS_APPROVAL` status.
- [x] Unhandled fatal errors route cleanly to DLQ subject.
