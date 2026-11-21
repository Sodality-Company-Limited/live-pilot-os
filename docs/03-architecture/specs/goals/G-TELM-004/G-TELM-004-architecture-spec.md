# Architecture Spec: G-TELM-004
Signals transition through `received` -> `validated` -> `persisted` -> `dispatched` / `failed`. Transitions must be deterministic and fail closed on invalid events.
