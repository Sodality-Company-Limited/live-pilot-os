# G-PROMO-015 FSM and Runtime Specification

Relevant Promotion states are `proposed`, `pending`, `approved`, `issued`, `rejected`, `expired`, `cancelled`, and explicit `unknown`.

Allowed transitions require current resource version, authenticated scope, capability, idempotency binding, and all declared evidence. Illegal transitions, stale events, duplicate effects, timeout without observed outcome, and unavailable control state fail closed. Runtime retries are bounded and never create a second effect.

Goal-specific runtime behavior: **repository transaction boundary**.

