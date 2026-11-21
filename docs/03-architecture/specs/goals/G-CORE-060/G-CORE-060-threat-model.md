# G-CORE-060 provider specification

Goal-specific authority for G-CORE-060.

## Binding invariant

Server-side OpenAI adapter behind a provider port; output is untrusted.

## Evidence
- Architecture: docs/03-architecture/overview.md
- Technical constraints: docs/03-architecture/technical-specifications-sot.md
- Quality: docs/03-architecture/software-quality-sot.md
- Testing: docs/03-architecture/testing-sot.md
- JEV boundary: docs/03-architecture/jev-agent-runtime-sot.md

## Verification
The goal's listed command is the minimum reproducible gate; failures block promotion.

## Threats and controls
- forged tenant/session scope -> authenticate and authorize before read/write;
- replay/duplicate delivery -> fingerprinted idempotency;
- prompt/provider leakage -> minimum context, secret isolation, redacted telemetry;
- unsafe recommendation -> typed validation, evidence/confidence/expiry, deterministic downstream policy;
- public internal ports -> private binding and deployment scan.

