# G-JEVC-008: Finite State Machine (FSM) Runtime Specification

- Goal: `G-JEVC-008` (Certify JEV/Copilot service-level contracts)
- Target: `SuggestionAggregate` Lifecycle State Machine

## FSM Transition Matrix

```
  [ proposed ] ─────────────────────────► [ withdrawn ] (External Trigger / Signal)
       │
       ▼ (evidence grounded + calibrated score >= threshold)
  [ grounded ] ─────────────────────────► [ withdrawn ] (Price changed, out-of-stock, operator pause)
       │
       ▼ (delivered to host screen HUD)
  [ delivered ] ────────────────────────► [ withdrawn ] (Stale trigger)
       │
       ├────────────────────────────────► [ expired ] (Freshness TTL elapsed)
       ├────────────────────────────────► [ used ] (Operator accepted suggestion)
       ├────────────────────────────────► [ edited ] (Operator edited payload parameters)
       └────────────────────────────────► [ dismissed ] (Operator dismissed suggestion)
```

## State Guard Rules
1. **Initial State:** Suggestions are initialized in `proposed` with aggregate version `1`.
2. **Grounding Gate:** Suggestions advance to `grounded` only when evidence references are verified and calibrated confidence score meets threshold; otherwise fails closed to `deferred` or `degraded`.
3. **Terminal Decision States:** `used`, `edited`, `dismissed`, and `expired` are terminal. Any subsequent decision attempt fails closed with `LP05002` (`INVALID_STATE_TRANSITION`).
4. **Withdrawal Invariant:** Active suggestions in `grounded` or `delivered` can be withdrawn via external signals (`STOCK_DEPLETED`, `EMERGENCY_PAUSE`). Withdrawn suggestions cannot be reused.
