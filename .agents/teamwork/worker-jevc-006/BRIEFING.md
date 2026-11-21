# Worker Briefing: G-JEVC-006

## Task Objective
Implement complete Suggestion Delivery and Withdrawal Lifecycle for `jev-copilot-service` according to Step 11 (Reliability Behavior) & Step 12 (Integration Contract):
1. In `code/services/jev-copilot-service/src/domain/`:
   - Enhance `suggestion-aggregate.mjs` to support all terminal and intermediate state transitions:
     - `deliver()`: transitions from `grounded` to `delivered` when displayed on host HUD.
     - `recordDecision({ decision: 'used' | 'edited' | 'dismissed', actorId, edits })`: records operator feedback.
     - `expire()`: automatic transition to `expired` when TTL expires without operator interaction.
     - `withdraw({ reason, actorId })`: immediate revocation due to changed facts (e.g. inventory stock depleted or margin violation).
2. In `code/services/jev-copilot-service/src/handlers/`:
   - `suggestion-lifecycle-handler.mjs`: Handles `suggestion.deliver`, `suggestion.decision.record`, `suggestion.expire`, and external trigger invalidations (e.g. `catalog.stock.depleted` leading to auto-withdrawal).
3. In `code/services/jev-copilot-service/test/lifecycle.test.mjs`:
   - Unit and integration tests covering:
     - Full state paths: `proposed → grounded → delivered → used / edited / dismissed`.
     - Time-to-live expiration (`expired`).
     - Event-driven withdrawal (`withdrawn`) on external stock drop.
     - Illegal transition rejection (e.g., trying to use an expired or withdrawn suggestion).
4. Populate `docs/03-architecture/specs/goals/G-JEVC-006/` specs.

## Acceptance Criteria
- [ ] Complete FSM transitions verified.
- [ ] Illegal transitions fail-closed with RFC 7807 error codes.
- [ ] All 4 SOT checks pass green.
