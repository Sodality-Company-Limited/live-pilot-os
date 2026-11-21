---
name: soda-api-spec-generation
version: "1.0.0"
description: Generate OpenAPI, AsyncAPI, JSON Schema, and client-contract plans from BRD, BDD, sub-feature flows, and registered LivePilot API SOTs without inventing behavior.
triggers: API spec, OpenAPI, AsyncAPI, JSON Schema, generate API, contract generation, API design
touches:
  - docs/03-architecture/api/
  - docs/03-architecture/contracts/flows/coverage.yaml
---

# API specification generation

Use this skill when generating or revising LivePilot API specifications.

## Required order

1. Read BRD/product brief, requirements, acceptance/BDD contracts, sub-feature indexes,
   and every linked detailed flow before proposing operations.
2. Run `node scripts/api/check-api-sot-traceability.mjs`.
3. Populate the API operation catalog with requirement, BDD, flow, owner, authorization,
   request, response, events/jobs, errors, idempotency, and verification references.
4. Resolve or record `[NEEDS CLARIFICATION]`; do not infer missing domain behavior.
5. Generate/update OpenAPI only from approved catalog rows. Generate AsyncAPI/NATS
   contracts from the subject catalog and JSON Schemas from domain/persistence SOTs.
6. Run the API harness and all registry/SOT gates before review.

## Mandatory authorities

- `docs/03-architecture/api/README.md`
- `docs/03-architecture/api/api-operation-catalog-sot.md`
- `docs/03-architecture/api/domain-resource-state-sot.md`
- `docs/03-architecture/api/identity-tenancy-authorization-sot.md`
- `docs/03-architecture/api/error-codes.yaml`
- `docs/03-architecture/api/nats-subject-catalog-sot.md`
- `docs/03-architecture/api/realtime-transport-sot.md`
- `docs/03-architecture/api/route-prefixing-and-boundary-invariant.md`

Never generate an endpoint from a database table or a route name alone. Every
consequential operation must preserve authorization, idempotency, explicit pending/
unknown states, audit lineage, localization keys, and failure semantics.
