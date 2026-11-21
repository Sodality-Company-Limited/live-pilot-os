# API contracts

> **Single source of truth** for HTTP/RPC endpoints. One file per resource or service area.

Agents and humans read contracts here **before** implementing or reviewing API goals.

## Conventions

- File naming: `{resource}.md` or `{service}-{resource}.md` (lowercase, hyphenated)
- Every endpoint documents: method, path, auth, request, response, errors
- Link **Goal:** G-xxx on each new or changed endpoint
- Keep in sync with `code/` — update contract in the same goal as the code change

## Template

See [.agents/skills/soda-rest-api/SKILL.md](../../../.agents/skills/soda-rest-api/SKILL.md) for the contract block format.

## Index

| Contract | Status | Goal |
|----------|--------|------|
| [openapi.yaml](openapi.yaml) | HTTP transport draft; generation blocked pending catalog reconciliation | Architecture baseline |
| [portal-bff/openapi.yaml](portal-bff/openapi.yaml) | Browser same-origin `/api/*` contract | Portal BFF |
| [core-bff/openapi.yaml](core-bff/openapi.yaml) | Private `/internal/v1/core/*` orchestration contract | Core BFF |
| [services/README.md](services/README.md) | Microservice ownership and NATS contract boundary | Domain services |
| [authentication.md](authentication.md) | Test-mode login, session, and logout contract | REQ-LP-017 |
| [route-prefixing-and-boundary-invariant.md](route-prefixing-and-boundary-invariant.md) | Canonical route topology and prefixes | Architecture baseline |
| [NATS subject/message template](nats-subject-message-template.md) | Canonical async contract template | Architecture baseline |
| [error-codes.md](error-codes.md) + [error-codes.yaml](error-codes.yaml) | Canonical public error allocation registry | Required for every public error |
| [identity-tenancy-authorization-sot.md](identity-tenancy-authorization-sot.md) | Identity, tenant, actor, and capability authority | Required before auth spec |
| [domain-resource-state-sot.md](domain-resource-state-sot.md) | Resource ownership and lifecycle states | Required before resource spec |
| [api-operation-catalog-sot.md](api-operation-catalog-sot.md) | Operation inventory for OpenAPI generation | Required before path generation |
| [error-problem-details-sot.md](error-problem-details-sot.md) | Stable error and retry semantics | Required before error generation |
| [idempotency-mutation-sot.md](idempotency-mutation-sot.md) | Consequential mutation behavior | Required before mutation generation |
| [realtime-transport-sot.md](realtime-transport-sot.md) | SSE/WebSocket client contract | Required before realtime generation |
| [nats-subject-catalog-sot.md](nats-subject-catalog-sot.md) | Async subject ownership and delivery | Required before AsyncAPI generation |
| [integration-adapter-contract-sot.md](integration-adapter-contract-sot.md) | Provider adapter boundary | Required before provider API generation |
| [query-versioning-pagination-sot.md](query-versioning-pagination-sot.md) | Query, pagination, and compatibility rules | Required before collection generation |
| [data-persistence-contract-sot.md](data-persistence-contract-sot.md) | Field ownership and persistence mapping | Required before schema generation |

## SOT coverage

- [Flow coverage registry](../contracts/flows/coverage.yaml)
- [Live session control flow SOT](../source-of-truth-flows/live-session-control-sot.md)
- [Enterprise technical specifications SOT](../technical-specifications-sot.md)
- [Software quality SOT](../software-quality-sot.md)
- [Testing SOT](../testing-sot.md)
- [NATS subject/message contract template](nats-subject-message-template.md)
- [Route prefixing and boundary invariant](route-prefixing-and-boundary-invariant.md)
- [API SOT generation set](api-operation-catalog-sot.md)
- [Identity and authorization SOT](identity-tenancy-authorization-sot.md)
- [Domain resource/state SOT](domain-resource-state-sot.md)
- [Error and ProblemDetails SOT](error-problem-details-sot.md)
- [Error-code SOT](error-codes.md)
- [Error-code registry](error-codes.yaml)
- [Realtime transport SOT](realtime-transport-sot.md)
- [NATS subject catalog SOT](nats-subject-catalog-sot.md)
- [Integration adapter contract SOT](integration-adapter-contract-sot.md)
- [Query/versioning/pagination SOT](query-versioning-pagination-sot.md)
- [Data persistence contract SOT](data-persistence-contract-sot.md)

The registry records contract owners, source hashes, producer/consumer references,
and executable verification commands. It is evidence of coverage, not a substitute
for the owning schema.

Run the hierarchy gate from the repository root:

```bash
node scripts/architecture/check-sot.mjs
node scripts/contract-check/error-code-registry.mjs
```

The gate checks all feature indexes and all detailed F01–F04 flow SOT files.

## Boundary ownership

- **Next.js BFF:** public UI-facing REST/JSON contract and UI DTO shaping.
- **CORE BFF:** application orchestration and aggregation; it does not own domain rules.
- **CORE BFF ↔ microservices:** NATS request/reply with explicit subjects and versioned
  message schemas.
- **Microservices ↔ microservices:** NATS JetStream for durable immutable facts.
- **Events:** immutable facts exchanged through NATS; commands are not represented as facts.

All consequential mutations require authorization, `X-Correlation-Id`, and an
`Idempotency-Key`. Public errors use the `ProblemDetails` schema. See the contract topology
and boundary rules in [LivePilot OS Deep Context](../live-pilot-os-deep-context.md).

## Contract split

- OpenAPI governs synchronous HTTP at the frontend/BFF boundary.
- NATS subject and message schemas govern service-to-service request/reply and events.
- The [NATS subject/message contract template](nats-subject-message-template.md) must be copied
  and completed for each new subject or message. A future `asyncapi.yaml` or equivalent checked-in schema catalog must define each subject,
  producer, consumer, payload version, delivery guarantee, retry policy, and dead-letter
  behavior before implementation of a new service interaction.

## Related

- [design-spec.md](../design-spec.md)
- [overview.md](../overview.md)
