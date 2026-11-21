# G-AG-001: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-001 (Enforce single-persona and touch-map contracts)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
