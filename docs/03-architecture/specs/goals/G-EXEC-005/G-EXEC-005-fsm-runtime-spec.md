# FSM Runtime Spec: G-EXEC-005: Transactional State Transitions

`TransactionalBoundary.transitionActionState`:
1. Validates `fromStatus` -> `toStatus` using domain rules.
2. Evaluates expected version vs current version ($v_{next} = v_{curr} + 1$).
3. Updates aggregate record with optimistic lock check.
4. Appends transition record to audit history.
5. Stages outbox message atomically with action state.
If any step fails, the entire transaction rolls back fail-closed.
