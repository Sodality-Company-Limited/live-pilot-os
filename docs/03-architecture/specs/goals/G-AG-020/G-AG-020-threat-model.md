# G-AG-020: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-020 (Validate end-to-end coordinator-to-subagent dispatch lifecycle)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
