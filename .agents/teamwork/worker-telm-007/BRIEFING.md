# Worker Briefing: G-TELM-007

## Objective
Execute isolated service behavior certification and high-throughput stress benchmark for `telemetry-service`:
- Benchmark: 10,000 signals ingested across 50 simulated concurrent live sessions
- Strict integer latency SLA verification: p95 < 50ms, p99 < 100ms
- Zero message loss invariant: exactly 10,000 signals committed and acknowledged
- Emit cryptographic proof receipt `artifacts/proofs/G-TELM-007_certification.json` with source file SHA-256 digests and formal scorecard.
