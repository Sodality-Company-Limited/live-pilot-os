# G-JEVC-002 — Worktree & Orchestration Plan

Goal ID: `G-JEVC-002`  
Scope: Goal Touch Map, Schema Registrations, Verification Commands, and Output Artifacts  
Status: `APPROVED`

---

## 1. Goal Touch Map & Boundary Allocation

All work in G-JEVC-002 is confined strictly to the declared touch map:

| File Path | Responsibility / Purpose |
|---|---|
| `docs/03-architecture/api/schemas/nats/jev-suggestion-proposed.schema.json` | JSON Schema for `livepilot.v1.copilot.suggestion.proposed` |
| `docs/03-architecture/api/schemas/nats/jev-suggestion-withdrawn.schema.json` | JSON Schema for `livepilot.v1.copilot.suggestion.withdrawn` |
| `docs/03-architecture/api/schemas/nats/jev-copilot-delivery-degraded.schema.json` | JSON Schema for `livepilot.v1.copilot.delivery.degraded` |
| `docs/03-architecture/api/nats-subject-catalog-sot.md` | SOT subject inventory, payload registry, and JEV JetStream contracts |
| `docs/03-architecture/api/asyncapi.yaml` | AsyncAPI 3.0.0 channels and message components for JEV events |
| `docs/03-architecture/specs/goals/G-JEVC-002/` | Architecture spec, FSM spec, invariants spec, threat model, worktree plan |

---

## 2. Verification Command

Execution of the multi-gate verification pipeline:
```bash
node scripts/contract-check/error-code-registry.mjs && \
node scripts/api/check-api-sot-traceability.mjs && \
node scripts/architecture/check-sot.mjs && \
node scripts/testing/check-tdd-traceability.mjs
```

Pass criteria:
- 0 errors, 0 warnings across all 4 gates.
- Bitwise parity and valid SHA-256 digests in catalog files.
