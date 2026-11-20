# G-AG-008: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-008 (Prepare provider-neutral bounded session contracts)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
