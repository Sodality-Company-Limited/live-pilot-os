# G-WEB-019 — Architecture Specification

## Outcome and sources
The Host product-signals panel renders authorized snapshot values and explicit unavailable states. Trace: `REQ-LP-003, REQ-LP-016` in `docs/03-architecture/live-pilot-os-requirements.md`; project brief; `docs/03-architecture/api/portal-bff/README.md`; `docs/03-architecture/ux/live-os-ux-flow.md`.

## Boundary
Reuse `LiveShell`, the shared token source and typed `enUS` messages. Accept an agreed snapshot input, default to unavailable for existing page and story callers, preserve numeric zero, and format money and numbers according to the approved DTO. Do not infer field names or units before the contract is approved.

## Prerequisites
Do not execute until G-WEB-016 foundation is available and G-WEB-018 has an approved versioned field mapping, freshness semantics, numeric units and privacy boundary. The full runtime binding is not included.

## Evidence
node --test apps/web/tests/product-signals.test.mjs after implementation; app lint and build. These validate only the declared boundary and do not certify unavailable upstream services.
