# G-AG-015: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-015 (Enforce provider input ceiling pre-spawn gate)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
