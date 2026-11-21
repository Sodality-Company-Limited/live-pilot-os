# G-CORE-056 Invariants and Formal Specification

1. Tenant and live-session scope is preserved end to end.
2. Consequential mutations are idempotent; replaying the same semantic request cannot create a second effect.
3. Unknown, stale, unauthorized, paused, or failed work never reports success.
4. Durable state and outbox evidence commit atomically where applicable.
5. Every emitted event is causally linked to its command and correlation ID.

Verification is executable property, integration, and contract evidence; no test double is accepted as production evidence.

