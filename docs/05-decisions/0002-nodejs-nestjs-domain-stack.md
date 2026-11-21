# ADR-0002: Use Node.js LTS and NestJS for Domain Services

**Status:** accepted  
**Date:** 2026-11-21  
**Deciders:** LivePilot OS project owner

## Context

LivePilot OS originally proposed Rust for domain and policy services. The Hackathon
requires a faster delivery path, shared TypeScript contracts with the Next.js UI,
and a production-capable runtime for I/O-heavy APIs, event consumers, policy
orchestration, and simulated platform adapters.

The system still requires strict domain boundaries, OpenAPI contracts, server-side
authorization, deterministic money calculations, idempotency, reconciliation,
auditability, and failure-state testing. The runtime choice must not weaken those
invariants.

## Decision

Use **Node.js LTS + NestJS + TypeScript** for LivePilot domain, policy, BFF, and
worker services.

The concrete implementation baseline is:

| Concern | Decision |
|---|---|
| HTTP runtime | NestJS Node adapter on Node.js LTS |
| HTTP validation | NestJS `ValidationPipe` with `class-validator` and `class-transformer` |
| Event validation | Ajv with checked-in JSON Schema |
| PostgreSQL | `pg` plus Kysely repositories |
| NATS | Official `nats` TypeScript client and JetStream consumers |
| Workflows | Temporal TypeScript SDK, limited to timers, approvals, retries, compensation, and reconciliation |
| Testing | Jest, Supertest, fast-check, and real persistence/messaging fixtures where available |
| Observability | OpenTelemetry Node SDK with NestJS request and consumer instrumentation |

NestJS modules, providers, guards, pipes, interceptors, and adapters must remain
outside the domain core. Domain/application code depends on ports and typed
interfaces; database clients, NATS, Temporal, Redis, and platform SDKs are injected
through infrastructure adapters.

Use NestJS for structured service composition and lifecycle management. Keep the
Hackathon deployment as a small number of modules or one application boundary, and
extract independently deployable services only when scaling, security, ownership,
or failure boundaries justify the split.

## Dependency graph

| Relation | IDs |
|----------|-----|
| **Evidence** | LivePilot OS Hackathon scope and proposed production technology baseline |
| **Depends on** | `docs/03-architecture/technical-specifications-sot.md` |
| **Unblocks** | Node.js/NestJS implementation goals and service scaffolding |
| **Goals affected** | Future LivePilot backend and adapter goals |

## Consequences

### Positive

- Shared TypeScript types and validation patterns across Next.js and backend services.
- Faster Hackathon delivery with one primary application language.
- Structured modules and dependency injection for bounded-context isolation.
- Explicit Node.js/NestJS choices for transport, validation, persistence, messaging,
  workflows, testing, and observability.
- Mature Node.js ecosystem for PostgreSQL, NATS, Temporal, OpenTelemetry, and testing.
- Easier recruitment, local development, and operational handoff than a Rust-first stack.

### Negative / tradeoffs

- Runtime memory safety is not provided by the language and must be covered by tests,
  validation, linting, dependency controls, and operational limits.
- CPU-heavy work must not block the event loop; use worker processes or external
  compute for expensive inference or media processing.
- TypeScript type safety does not replace runtime validation at HTTP, event, and
  adapter boundaries.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Rust + Axum | Strong runtime and memory properties, but higher delivery and cross-language contract cost for this Hackathon. |
| Bun + Elysia | Attractive developer experience, but the project prioritizes Node.js LTS ecosystem and operational compatibility for the production path. |
| Node.js + Fastify | Viable, but NestJS provides stronger module, dependency-injection, and service-organization conventions for the planned bounded services. |

## Links

- [Production technology stack](../03-architecture/live-pilot-os-tech-stack.md)
- [Technical specifications SOT](../03-architecture/technical-specifications-sot.md)
- [Architecture overview](../03-architecture/overview.md)
