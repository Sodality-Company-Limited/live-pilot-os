# Orchestrator Briefing: AUDI Epic Autonomous Execution

## Mission Objective
Drive end-to-end delivery of the **Audit Service & Immutable Decision Ledger** (`audit-service`) across all 8 atomic goals:
1. `G-AUDI-001`: Contract, Schemas, AsyncAPI, and Error Registry (LP13xxx)
2. `G-AUDI-002`: Schema Conformance & Golden Fixture Compatibility Tests
3. `G-AUDI-003`: PostgreSQL 16 Persistence Migrations, Inbox, and Hash-chaining
4. `G-AUDI-004`: Domain State Machine & Secret/PII/COGS Redaction Filter
5. `G-AUDI-005`: Ingestion Vertical Slice (NATS append command to DB commit)
6. `G-AUDI-006`: Safe Action Log Query Projection & DLQ Replay Worker
7. `G-AUDI-007`: PRR Certification, Concurrency Proofs, and Verification Receipt
8. `G-AUDI-008`: Hardened Dockerfile, Kubernetes Manifests, and DigitalOcean Deployment

## Rules of Engagement
- Zero Mocks, Zero Stubs, Zero Fallbacks (Article I).
- Mandatory verification pass at every transition (Article II).
- Ephemeral worker lifecycle: spawn worker -> execute step -> verify -> kill worker -> advance goal.
- Strict touch map adherence: no scope creep outside goal declarations.
