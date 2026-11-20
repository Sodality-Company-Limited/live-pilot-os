---
name: soda-api-sot-traceability
version: "1.0.0"
description: Audit traceability from LivePilot BRD, requirements, BDD, and sub-feature flows to API operation, schema, error, event, and verification records.
triggers: API traceability, API SOT audit, contract coverage, BDD to API, flow to endpoint, API readiness
touches:
  - docs/03-architecture/api/api-operation-catalog-sot.md
  - docs/03-architecture/contracts/flows/coverage.yaml
---

# API SOT traceability

Use this skill before API generation or review. It proves that the API catalog is
grounded in product and flow evidence.

Run:

```bash
node scripts/api/check-api-sot-traceability.mjs
```

The audit must identify the source requirements, BDD/acceptance scenarios, sub-feature
flow IDs, domain owner, authorization rule, state transition, error-code mapping,
localization key, async/realtime effect, idempotency behavior, and verification command
for every API operation. Missing evidence blocks API generation; it is not permission
to invent a route or payload.
