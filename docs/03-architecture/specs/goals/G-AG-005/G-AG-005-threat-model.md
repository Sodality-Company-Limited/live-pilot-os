# G-AG-005: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-005 (Reject full-goal context in step packets)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
