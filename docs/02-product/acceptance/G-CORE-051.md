# G-CORE-051 Acceptance Contract

## Scope

Add service-owned live-session persistence using the canonical NestJS/TypeScript,
PostgreSQL via `pg` + Kysely stack. This contract covers only the migration and
its executable verification; domain transitions, transport, Redis, and deployment
are out of scope.

## Acceptance criteria

- A fresh database applies the migration successfully and repeat application is safe.
- Session identity, tenant/workspace scope, lifecycle status/version, timestamps,
  idempotency key, audit/outbox linkage, and required indexes are present.
- Tenant isolation and uniqueness constraints are enforced by executable tests.
- The expand path is rollback-safe and does not perform a destructive automatic down migration.
- Session state and outbox records can be committed atomically.
- Restore/recovery verification is recorded with a reproducible command.

## Verification

Run the service-scoped command recorded by the session-service scaffold and
`npm test -- session-service` from the repository's supported Node.js workspace.
