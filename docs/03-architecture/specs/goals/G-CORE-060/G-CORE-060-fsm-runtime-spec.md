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

## State model
received -> validating -> proposed|deferred -> persisted -> published|dlq.

Terminal states are immutable; retry never converts unknown into success. For contract or migration goals, this state model describes the consumer/runtime that later goals must honor.

