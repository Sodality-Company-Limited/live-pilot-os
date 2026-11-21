# G-LIVE-004 invariants

Tenant/session scope is server-enforced. Only valid transitions succeed. Accepted transitions increment expected_version once. Idempotency key plus semantic fingerprint is replay-safe; conflicting reuse is rejected. Mutation and fact publication use the outbox boundary. Ended is terminal; unknown outcomes are reconciled, never inferred as success.

