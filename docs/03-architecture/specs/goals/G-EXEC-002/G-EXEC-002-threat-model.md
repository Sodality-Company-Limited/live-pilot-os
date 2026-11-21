# Threat Model: G-EXEC-002: Execution Action FSM

1. **Replay & Double-Execution Attacks:**
   - *Risk:* Malicious or accidental re-sending of pin/voucher requests causing duplicated platform actions.
   - *Mitigation:* Unique composite key on `(tenant_id, session_id, action_id)` and immutable idempotency inbox check.

2. **Phantom Success Elevation:**
   - *Risk:* Dropped HTTP connections to platform adapters leading the service to assume success.
   - *Mitigation:* Explicit `unknown` state and strict fail-closed policy. Only verified observed status allows progression to `succeeded`.

3. **State Desynchronization & Race Conditions:**
   - *Risk:* Concurrent reconciliation probe and delayed adapter callback colliding on status updates.
   - *Mitigation:* Optimistic concurrency locking via `version` column on `execution_actions`.
