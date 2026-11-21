# Worker Briefing: G-AUDI-007 PRR Certification & Cryptographic Proof Receipt

## Objective
Execute exhaustive production readiness review (PRR) and concurrency certification:
1. `code/services/audit-service/test/certification/audit-certification.spec.ts`:
   - High-concurrency stress test delivering 2,000 audit receipts concurrently across multiple sessions and tenants
   - Strict verification of SHA-256 hash chaining serialization: every record's `prev_record_hash` strictly equals the prior record's `record_hash` with zero fork or split
   - Latency SLA verification: p95 < 50ms, p99 < 100ms using exact integer `process.hrtime.bigint()`
   - Tamper-evident simulation test: mutating any stored field invalidates the hash chain and triggers detection
   - Emits verified cryptographic proof receipt to `artifacts/proofs/G-AUDI-007-audit-certification.json`
2. Update `package.json` with `"scripts": { ..., "test:certification": "node --test test/certification/*.spec.ts" }`
3. Author `docs/03-architecture/specs/goals/G-AUDI-007/design.md` satisfying Invariant 13.
4. Update `docs/07-backlog/goals/G-AUDI-007.md` to `status: done`, steps and criteria `[x]`, phase `SHIP`.
