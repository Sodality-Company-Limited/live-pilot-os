# G-SEC-002 Design — Identity/Session Persistence Contract

## Intent and architectural rationale

Define the persistence boundary for the Identity/Session service before behavior is implemented. The service owns principals, local-only credential material, server-managed sessions, and revocations. It does not own domain resources or browser presentation.

## Goals

- Persist immutable principal identity references and local-mode credential hashes.
- Persist opaque session records with idle/absolute expiry and revocation state.
- Support deterministic lookup, expiry, revocation, and rollback verification.

## Non-goals and anti-goals

- No OIDC vendor selection or production token verification.
- No Portal BFF, KrakenD, Core BFF, UI, or domain-service implementation.
- No plaintext passwords, raw OIDC tokens, or browser-readable session state.

## Approaches considered

1. Shared identity tables across all services — rejected because service ownership and tenant boundaries require one authoritative identity/session writer.
2. Redis-only sessions — rejected because Redis is reconstructable coordination/cache, not authoritative durable state.
3. PostgreSQL-owned identity/session state — selected because the deployment SOT defines PostgreSQL as authoritative durable state and supports restore evidence.

## Bounded context and touch-map invariants

The implementation is limited to the new `code/services/identity-session-service/` persistence slice and its tests. Maximum operational source files: three. Migrations must be reversible and must not touch domain-service tables.

## Acceptance and TDD strategy

Test schema creation, unique principal/session identifiers, expiry indexes, revocation lookup, tenant-scope fields, rollback, and rejection of unsafe credential/token fields. Verification must run without external marketplace access and must produce a revision-bound receipt.

## Required authorities

- `docs/03-architecture/api/identity-tenancy-authorization-sot.md`
- `docs/03-architecture/deployment/runtime-topology-sot.md`
- `docs/03-architecture/software-quality-sot.md`
- `REQ-LP-017`
