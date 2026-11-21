# G-AG-019: Threat Model & Zero-Trust Boundary Specification

- Goal: G-AG-019 (Enforce exclusive single-owner lease for LLM Wiki retrieval)

## Security Guarantees
- Zero credentials or PII retained in prompts, telemetry, or logs.
- Path boundary containment strictly verified against repository root.
- Secret redaction for Bearer tokens, passwords, and API keys.
