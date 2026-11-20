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
| [openapi.yaml](openapi.yaml) | Canonical HTTP contract | Architecture baseline |
| NATS subject/message schemas | Planned canonical async contract | Architecture baseline |

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
- A future `asyncapi.yaml` or equivalent checked-in schema catalog must define each subject,
  producer, consumer, payload version, delivery guarantee, retry policy, and dead-letter
  behavior before implementation of a new service interaction.

## Related

- [design-spec.md](../design-spec.md)
- [overview.md](../overview.md)
