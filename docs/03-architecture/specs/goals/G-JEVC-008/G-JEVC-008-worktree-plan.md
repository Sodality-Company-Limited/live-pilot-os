# G-JEVC-008: Worktree Plan & Verification Gates

- Goal: `G-JEVC-008` (Certify JEV/Copilot service-level contracts)
- Owner: `Lead QA & Contract Certification Architect`
- Mode: Multi-worktree certification

## Declared Touch Map
- `code/services/jev-copilot-service/test/service-contracts.test.mjs`
- `docs/07-backlog/evidence/G-JEVC-008-certification-evidence.json`
- `docs/03-architecture/contracts/flows/coverage.yaml`
- `docs/03-architecture/specs/goals/G-JEVC-008/`

## Deterministic Verification Gate
```bash
node code/services/jev-copilot-service/test/service-contracts.test.mjs && \
node scripts/contract-check/error-code-registry.mjs && \
node scripts/api/check-api-sot-traceability.mjs && \
node scripts/architecture/check-sot.mjs && \
node scripts/testing/check-tdd-traceability.mjs
```
