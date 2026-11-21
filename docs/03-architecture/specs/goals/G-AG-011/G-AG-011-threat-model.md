# G-AG-011: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-011 (Prune expired and oversized telemetry files)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
