# G-AG-009: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-009 (Abort streaming provider sessions on budget limits)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
