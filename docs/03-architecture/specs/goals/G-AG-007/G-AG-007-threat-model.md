# G-AG-007: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-007 (Execute bounded subprocess commands with line clamping)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
