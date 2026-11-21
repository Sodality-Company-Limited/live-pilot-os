# Dispatch Contract: INVT-G-INVT-001-CONTRACT-IMPL

**Goal ID:** `G-INVT-001`  
**Role:** `implementer`  
**Persona:** `api_gateway_contracts_lead`  
**Assigned Worktree:** `.` (primary repo root)  
**Assigned Branch:** `feature/G-INVT-001`  
**Touch Map:**
- `docs/03-architecture/api/services/inventory-service.md`
- `docs/03-architecture/api/asyncapi.yaml`
- `docs/03-architecture/api/schemas/nats/inventory-reservation-request.schema.json`
- `docs/03-architecture/api/schemas/nats/inventory-reservation-reply.schema.json`
- `docs/03-architecture/api/schemas/nats/inventory-stock-updated.schema.json`
- `docs/03-architecture/api/nats-subject-catalog-sot.md`
- `docs/03-architecture/api/error-codes.yaml`

**Verification Command:**
```bash
node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs
```

**Completion Gate:**
Zero-drift contract specifications, error codes registered, JSON schemas strictly conforming to JSON Schema draft-07.
