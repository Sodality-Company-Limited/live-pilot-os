# API SOT — Route Prefixing and Multi-Tier Boundary Invariant

> **Status:** Frozen target; implementation must provide executable conformance evidence.
> **Architecture:** [overview.md](../overview.md)
> **HTTP contract:** [openapi.yaml](openapi.yaml)
> **Technical SOT:** [technical-specifications-sot.md](../technical-specifications-sot.md)
> **Portal/Core contract status:** No separate source is authoritative until checked in and registered.

This document is the canonical route-prefixing contract for the six-node topology.
It standardizes which boundary owns cookies, bearer authentication, public routing,
internal routing, domain policy, persistence, and message transport.

## 1. Six-node topology

```text
Node 1  Portal UI / Browser / LINE LIFF
   │    same-origin HTTPS + HttpOnly session cookie: /api/*
Node 2  Portal BFF / Next.js
   │    TLS + bearer + W3C trace: /v1/*
Node 3  KrakenD Edge API Gateway
   │    authenticated internal ingress: /v1/*
Node 4  Core BFF / API Engine / orchestration
   │    mTLS HTTP/2 or gRPC: /internal/v1/*
Node 5  Internal KrakenD Mesh
   │    mTLS + schema/routing policy
Node 6  Domain Microservices + PostgreSQL HA
```

NATS request/reply and JetStream are transport contracts inside the service fleet
for commands, queries, events, and jobs. They do not replace the HTTP route boundary
between Nodes 4 and 5 unless an approved decision record changes this invariant.

## 2. Route prefixing conventions

| Boundary | Prefix | Authentication | Owner | Forbidden |
|---|---|---|---|---|
| Node 1 → Node 2 | `/api/*` | Same-origin, Secure/HttpOnly/SameSite cookie | Portal BFF session/DTO boundary | Browser authorization or direct service calls |
| Node 2 → Node 3 | `/v1/*` | Bearer token, TLS, W3C trace | Public versioned API contract | Persona-prefixed domain routes |
| Node 3 → Node 4 | `/v1/*` | Gateway-authenticated service context | Edge routing, rate limits, request policy | Domain policy reimplementation |
| Node 4 → Node 5 | `/internal/v1/*` | mTLS/workload identity, service auth | Internal ingress and schema routing | Public exposure, browser access |
| Node 5 → Node 6 | Service route or NATS subject | mTLS/workload identity | Domain service and transaction owner | Shared database writes |

### Public route rules

- Browser routes are intentionally unversioned and same-origin: `/api/*`.
- Public service-facing routes are versioned and actor-agnostic: `/v1/*`.
- Tenant, organization, persona, and capability scope are resolved server-authoritatively
  from authenticated claims and session context.
- Do not create `/v1/brand/*`, `/v1/agency/*`, or `/v1/creator/*` route families for
  domain resources. Persona affects authorization and representation, not resource identity.
- Public OpenAPI paths must begin with `/v1/` and must match this prefix contract.

### Internal route rules

- `/internal/v1/*` is private and must be rejected at the public edge and browser boundary.
- Internal paths identify service capabilities, not UI screens or personas.
- Internal requests carry correlation, causation, tenant, session, schema, and idempotency
  context where the operation is consequential.
- Node 4 does not connect directly to PostgreSQL. Node 6 service owners execute transactions,
  publish outbox events, and append audit evidence.

## 3. Boundary invariant

```text
Browser session authority
  → Portal BFF presentation/session boundary
    → Edge public API boundary (/v1)
      → Core orchestration boundary
        → Internal ingress boundary (/internal/v1)
          → Domain ownership and persistence boundary
```

Every request crosses each boundary exactly once in the declared direction. A lower
node may reject or enrich a request, but may not silently widen scope, bypass the
preceding identity boundary, or become a second writer for another node’s aggregate.

## 4. Security and session rules

- Browser cookies are Secure, HttpOnly, SameSite=Strict, scoped to the approved host,
  and never copied into service-to-service headers.
- Bearer claims are validated at the edge and re-authorized by the service owner.
- Internal identity uses mTLS or approved workload identity; user identity is propagated
  as signed context, never as an unauthenticated header.
- `X-Correlation-Id`, W3C trace context, tenant/session scope, and `Idempotency-Key`
  are preserved or rejected; they are never regenerated silently for retries.
- All route errors use the canonical ProblemDetails shape and include safe correlation context.

## 5. Routing and compatibility tests

The following tests are required before a route contract is `FROZEN`:

1. `/api/*` is reachable only from the Portal BFF same-origin surface.
2. `/v1/*` is versioned, actor-agnostic, authenticated, rate-limited, and OpenAPI-backed.
3. `/internal/v1/*` is unreachable from browser/public ingress and requires service identity.
4. Persona-prefixed public paths are rejected or explicitly deprecated with a migration response.
5. Every hop preserves correlation, causation, tenant, session, locale, and idempotency context.
6. Gateway retries do not duplicate consequential mutations.
7. A stale, missing, or forged actor/tenant context fails closed at the domain owner.
8. Route version compatibility and deprecation behavior are tested for each consumer.

## 6. Required contract record

Every route family must register owner, source schema, prefix, producer, consumer,
auth mechanism, timeout/retry policy, compatibility policy, and verification command
in [coverage.yaml](../contracts/flows/coverage.yaml).
