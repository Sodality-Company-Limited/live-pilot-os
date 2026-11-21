# G-AG-013: Finite State Machine (FSM) Runtime Specification

- Goal: G-AG-013 (Normalize provider token counters with fallback estimation)

## State Transitions
`Init` -> `Validated` -> `Dispatched` -> `Completed` / `Rejected`

- On validation failure, transition immediately to `Rejected` fail-closed.
