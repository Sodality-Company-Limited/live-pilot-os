# Project snapshot

> **TL;DR for agents.** Update when architecture, active goals, or constraints change.  
> Reload this at the start of every session before collaboration phase EXECUTE.

## Architecture (one paragraph)

{How the system is structured — monolith/API/mobile, main modules, data store.}

## Active goals

| ID | Status | Summary |
|----|--------|---------|
| [`G-PROMO-001`](07-backlog/goals/G-PROMO-001.md) | `review` | Promotion service contract and SOT |
| [`G-PROMO-002`](07-backlog/goals/G-PROMO-002.md) | `review` | Promotion event schemas and NATS compatibility |
| [`G-PROMO-003`](07-backlog/goals/G-PROMO-003.md) | `review` | Promotion persistence and transactional outbox |
| [`G-PROMO-004`](07-backlog/goals/G-PROMO-004.md) | `review` | Promotion proposal lifecycle and idempotency |
| [`G-PROMO-005`](07-backlog/goals/G-PROMO-005.md) | `review` | Promotion status read model and reconciliation projection |
| [`G-PROMO-006`](07-backlog/goals/G-PROMO-006.md) | `review` | Promotion policy approval inventory and execution integrations |
| [`G-PROMO-007`](07-backlog/goals/G-PROMO-007.md) | `review` | Promotion reliability pause retry DLQ and audit |
| [`G-PROMO-008`](07-backlog/goals/G-PROMO-008.md) | `review` | Promotion service runtime health security and observability |
| [`G-PROMO-009`](07-backlog/goals/G-PROMO-009.md) | `review` | Promotion service DigitalOcean release and rollback evidence |
| [`G-PROMO-010`](07-backlog/goals/G-PROMO-010.md) | `review` | Promotion service runtime bootstrap |
| [`G-PROMO-011`](07-backlog/goals/G-PROMO-011.md) | `review` | Promotion persistence migrations |
| [`G-PROMO-012`](07-backlog/goals/G-PROMO-012.md) | `review` | Promotion domain state machine |
| [`G-PROMO-013`](07-backlog/goals/G-PROMO-013.md) | `review` | Promotion authorization and idempotency boundary |
| [`G-PROMO-014`](07-backlog/goals/G-PROMO-014.md) | `review` | Promotion contract compatibility tests |
| [`G-PROMO-015`](07-backlog/goals/G-PROMO-015.md) | `review` | Promotion repository transaction boundary |
| [`G-PROMO-016`](07-backlog/goals/G-PROMO-016.md) | `review` | Promotion NATS adapter boundary |
| [`G-PROMO-017`](07-backlog/goals/G-PROMO-017.md) | `review` | Promotion proposal vertical slice |
| [`G-PROMO-018`](07-backlog/goals/G-PROMO-018.md) | `review` | Promotion status read vertical slice |
| [`G-PROMO-019`](07-backlog/goals/G-PROMO-019.md) | `review` | Promotion margin policy integration |
| [`G-PROMO-020`](07-backlog/goals/G-PROMO-020.md) | `review` | Promotion approval control integration |
| [`G-PROMO-021`](07-backlog/goals/G-PROMO-021.md) | `review` | Promotion inventory integration |
| [`G-PROMO-022`](07-backlog/goals/G-PROMO-022.md) | `review` | Promotion execution safety integration |
| [`G-PROMO-023`](07-backlog/goals/G-PROMO-023.md) | `review` | Promotion pause expiry cancellation workflow |
| [`G-PROMO-024`](07-backlog/goals/G-PROMO-024.md) | `review` | Promotion retry DLQ and replay worker |
| [`G-PROMO-025`](07-backlog/goals/G-PROMO-025.md) | `review` | Promotion audit receipt integration |
| [`G-PROMO-026`](07-backlog/goals/G-PROMO-026.md) | `review` | Promotion service-level verification matrix |
| [`G-PROMO-027`](07-backlog/goals/G-PROMO-027.md) | `blocked` | Promotion API architecture and release gates |
| [`G-PROMO-028`](07-backlog/goals/G-PROMO-028.md) | `blocked` | Promotion service DigitalOcean release |
| [`G-CORE-050`](07-backlog/goals/G-CORE-050.md) | `draft` | Reconcile Feature 01 Core BFF HTTP contract |
| [`G-CORE-051`](07-backlog/goals/G-CORE-051.md) | `draft` | Register Feature 01 NATS subjects and payload bindings |
| [`G-CORE-052`](07-backlog/goals/G-CORE-052.md) | `draft` | Enforce Core BFF signed F01 request context |
| [`G-CORE-053`](07-backlog/goals/G-CORE-053.md) | `draft` | Orchestrate the F01 live-session overview query |
| [`G-CORE-054`](07-backlog/goals/G-CORE-054.md) | `draft` | Stream authorized F01 session events through Core BFF |
| [`G-CORE-055`](07-backlog/goals/G-CORE-055.md) | `draft` | Enforce the KrakenD boundary for Feature 01 Core BFF routes |
| [`G-CORE-056`](07-backlog/goals/G-CORE-056.md) | `draft` | Accept canonical Feature 01 telemetry ingress |
| [`G-CORE-057`](07-backlog/goals/G-CORE-057.md) | `draft` | Normalize, deduplicate, and reconcile Feature 01 events |
| [`G-CORE-058`](07-backlog/goals/G-CORE-058.md) | `draft` | Produce confidence-aware F01 intent and product-entity signals |
| [`G-CORE-059`](07-backlog/goals/G-CORE-059.md) | `draft` | Produce F01 moderation risk signals |
| [`G-CORE-060`](07-backlog/goals/G-CORE-060.md) | `draft` | Compute idempotent Feature 01 purchase signals |
| [`G-CORE-061`](07-backlog/goals/G-CORE-061.md) | `draft` | Integrate the JEV/OpenAI adapter for F01 analysis |
| [`G-CORE-062`](07-backlog/goals/G-CORE-062.md) | `draft` | Project and recover Feature 01 dashboard read models |

## Constraints

- Stack: {STACK} — stack rules in `.agents/rules/{stack}.md`
- Auth: {e.g. session / JWT — link ADR}

## Current APIs (high level)

| Area | Doc |
|------|-----|
| *(none yet)* | [03-architecture/api/README.md](03-architecture/api/README.md) |

## Known issues / tech debt

| Issue | Goal / note |
|-------|-------------|
| *(none)* | — |

## Last updated

{DATE} — {who or what changed}
