# Identity/Session Service — Socratic 5-Why Blueprint

This is a goal-generation evidence blueprint, not implementation evidence.

1. Why is a dedicated identity/session service required? Because browser and gateway state cannot be the authority for principal, tenant, role, or session scope.
2. Why must the service own the state? Because multiple writers would permit stale or conflicting authorization and revocation facts.
3. Why must sessions be server-managed and opaque? Because raw OIDC tokens, passwords, and browser claims must not cross the browser, log, event, or audit boundary.
4. Why are idempotency, timeout, and audit first-class? Because authentication and revocation are consequential mutations whose transport result can be unknown or delivered more than once.
5. Why is DigitalOcean release a separate final goal? Because runtime, secret, issuer/JWKS, backup, health, rollback, and smoke evidence must be proven without conflating them with domain correctness.

Sources: `docs/03-architecture/api/identity-tenancy-authorization-sot.md`, `docs/02-product/bdd/feature-05-test-authentication-access-gate.md`, `docs/03-architecture/source-of-truth-flows/features/F05-test-authentication/`, `docs/03-architecture/deployment/runtime-topology-sot.md`, and `REQ-LP-017`.
