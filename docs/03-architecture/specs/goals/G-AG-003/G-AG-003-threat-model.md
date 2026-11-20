# G-AG-003: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-003 (Reject duplicate input prompts for the same goal)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
