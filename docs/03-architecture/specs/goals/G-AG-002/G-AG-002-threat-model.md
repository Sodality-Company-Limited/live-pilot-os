# G-AG-002: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-002 (Enforce independent input and output token ceiling gates)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
