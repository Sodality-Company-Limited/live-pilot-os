# G-CORE-078 Step 1 Design

## Intent and architectural rationale

Provide the session-service process boundary and PostgreSQL persistence seam before lifecycle behavior is implemented. NestJS owns process composition; Kysely provides typed SQL composition over a `pg` pool; migrations remain explicit SQL source of truth.

## Goals and non-goals

- Goal: compile a minimal NestJS/TypeScript service with typed Kysely database wiring.
- Goal: verify the session migration against a real PostgreSQL connection.
- Non-goal: lifecycle commands, authorization handlers, NATS consumers/producers, or HTTP routes.

## Approaches considered

1. TypeORM: rejected because the repository contract requires Kysely and explicit SQL migrations.
2. In-memory or mocked persistence: rejected because production behavior and real migration verification are required.

## Selected approach and trade-offs

Use a strict TypeScript Kysely schema backed by a lazily-created `pg` pool and an idempotent SQL migration. The verifier runs the migration inside a transaction and rolls it back, proving PostgreSQL compatibility without changing the target database.

## Bounded context and touch-map invariants

Only `code/services/session-service` and this goal specification directory are changed. Lifecycle behavior remains outside step 1.

## Acceptance test and TDD verification strategy

`npm run typecheck` validates the scaffold. `DATABASE_URL=... npm run verify:migrations` executes the migration against PostgreSQL in a transaction and asserts the resulting table exists.
