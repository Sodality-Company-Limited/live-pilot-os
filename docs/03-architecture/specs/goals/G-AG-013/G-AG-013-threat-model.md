# G-AG-013: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-013 (Normalize provider token counters with fallback estimation)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
