# Architecture Spec: G-TELM-003
Telemetry ingestion requires append-only persistence with partition pruning by tenant and session, unique deduplication indexes, and RLS tenant isolation.
