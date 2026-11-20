# G-AG-006: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-006 (Record compact session telemetry and failure fingerprints)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
