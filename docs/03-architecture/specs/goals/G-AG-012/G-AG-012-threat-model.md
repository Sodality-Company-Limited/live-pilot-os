# G-AG-012: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-012 (Track mid-session token accumulation and limit halting)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
