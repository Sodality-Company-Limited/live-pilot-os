# G-CORE-090: Invariants and Formal Specification

- INV-001: startup, liveness, readiness, degradation, and shutdown states are explicit.
- INV-002: release evidence names the exact commit, image digest, schema/config revisions, and environment.
- INV-003: failure or unknown dependency state cannot be reported as healthy or deployed success.
- INV-004: secrets, tokens, and raw protected data are excluded from source, logs, images, probes, and receipts.
- Proof class: executable operational, security, contract, and recovery tests.
