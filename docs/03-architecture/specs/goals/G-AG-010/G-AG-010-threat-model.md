# G-AG-010: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-010 (Load runtime budget parameters from YAML configuration)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
