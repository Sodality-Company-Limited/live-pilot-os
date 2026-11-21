# LivePilot OS — Contract Validation Report

**Revision:** `mart` contract artifact set  
**Scope:** Portal BFF, Core BFF, JSON Schema, AsyncAPI/NATS, SDK/types  
**Date:** 2026-11-21

## Gate results

| Gate | Result | Evidence |
|---|---|---|
| OpenAPI/AsyncAPI structural lint | PASS | Ruby YAML parser; roots, paths/channels, and contract documents loaded successfully |
| JSON Schema syntax and registry hashes | PASS | All shared/NATS JSON files parse; checked-in SHA-256 values match the NATS catalog |
| Error-code validation | PASS | `node scripts/contract-check/error-code-registry.mjs` — 18 registered codes |
| Producer/consumer compatibility | BLOCKED | Service processes and compatibility fixtures are not implemented; only subject ownership/schema bindings exist |
| Flow-to-endpoint traceability | PASS | `node scripts/api/check-api-sot-traceability.mjs`; SOT hierarchy: 179 flows, 0 errors |

## Structural checks performed

```text
docs/03-architecture/api/openapi.yaml              STRUCTURE PASS
docs/03-architecture/api/portal-bff/openapi.yaml  STRUCTURE PASS
docs/03-architecture/api/core-bff/openapi.yaml    STRUCTURE PASS
docs/03-architecture/api/asyncapi.yaml             STRUCTURE PASS
JSON schemas                                         PASS
NATS schema hash registry                            PASS
Error-code registry                                  PASS (18)
API SOT traceability                                 PASS
SOT hierarchy                                        PASS (179 flows, 0 errors)
```

## Compatibility gate required before implementation release

For every AsyncAPI subject, add a producer fixture and consumer fixture that:

1. validate the shared message headers and payload against the registered schema;
2. accept additive fields and reject incompatible major/schema versions;
3. preserve tenant/session/correlation/causation/idempotency lineage;
4. prove duplicate delivery does not duplicate state or effects;
5. prove timeout, retry, DLQ, replay, pause, and recovery behavior; and
6. emit a compatibility receipt containing subject, schema hash, producer,
   consumer, test command, commit revision, and exit code.

The contract set is structurally valid, but it is not a production launch
certificate until the compatibility gate is green.
