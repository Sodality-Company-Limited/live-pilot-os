# Project snapshot

> **TL;DR for agents.** Update when architecture, active goals, or constraints change.  
> Reload this at the start of every session before collaboration phase EXECUTE.

## Architecture (one paragraph)

{How the system is structured — monolith/API/mobile, main modules, data store.}

## Active goals

| ID | Status | Summary |
|----|--------|---------|
| [`G-PROMO-001`](07-backlog/goals/G-PROMO-001.md) | `planned` | Promotion service contract and SOT |
| [`G-PROMO-002`](07-backlog/goals/G-PROMO-002.md) | `planned` | Promotion event schemas and NATS compatibility |
| [`G-PROMO-003`](07-backlog/goals/G-PROMO-003.md) | `planned` | Promotion persistence and transactional outbox |
| [`G-PROMO-004`](07-backlog/goals/G-PROMO-004.md) | `planned` | Promotion proposal lifecycle and idempotency |
| [`G-PROMO-005`](07-backlog/goals/G-PROMO-005.md) | `planned` | Promotion status read model and reconciliation projection |
| [`G-PROMO-006`](07-backlog/goals/G-PROMO-006.md) | `planned` | Promotion policy approval inventory and execution integrations |
| [`G-PROMO-007`](07-backlog/goals/G-PROMO-007.md) | `planned` | Promotion reliability pause retry DLQ and audit |
| [`G-PROMO-008`](07-backlog/goals/G-PROMO-008.md) | `planned` | Promotion service runtime health security and observability |
| [`G-PROMO-009`](07-backlog/goals/G-PROMO-009.md) | `planned` | Promotion service DigitalOcean release and rollback evidence |
| [`G-PROMO-010`](07-backlog/goals/G-PROMO-010.md) | `planned` | Promotion service runtime bootstrap |
| [`G-PROMO-011`](07-backlog/goals/G-PROMO-011.md) | `planned` | Promotion persistence migrations |
| [`G-PROMO-012`](07-backlog/goals/G-PROMO-012.md) | `planned` | Promotion domain state machine |
| [`G-PROMO-013`](07-backlog/goals/G-PROMO-013.md) | `planned` | Promotion authorization and idempotency boundary |
| [`G-PROMO-014`](07-backlog/goals/G-PROMO-014.md) | `planned` | Promotion contract compatibility tests |
| [`G-PROMO-015`](07-backlog/goals/G-PROMO-015.md) | `planned` | Promotion repository transaction boundary |
| [`G-PROMO-016`](07-backlog/goals/G-PROMO-016.md) | `planned` | Promotion NATS adapter boundary |
| [`G-PROMO-017`](07-backlog/goals/G-PROMO-017.md) | `planned` | Promotion proposal vertical slice |
| [`G-PROMO-018`](07-backlog/goals/G-PROMO-018.md) | `planned` | Promotion status read vertical slice |
| [`G-PROMO-019`](07-backlog/goals/G-PROMO-019.md) | `planned` | Promotion margin policy integration |
| [`G-PROMO-020`](07-backlog/goals/G-PROMO-020.md) | `planned` | Promotion approval control integration |
| [`G-PROMO-021`](07-backlog/goals/G-PROMO-021.md) | `planned` | Promotion inventory integration |
| [`G-PROMO-022`](07-backlog/goals/G-PROMO-022.md) | `planned` | Promotion execution safety integration |
| [`G-PROMO-023`](07-backlog/goals/G-PROMO-023.md) | `planned` | Promotion pause expiry cancellation workflow |
| [`G-PROMO-024`](07-backlog/goals/G-PROMO-024.md) | `planned` | Promotion retry DLQ and replay worker |
| [`G-PROMO-025`](07-backlog/goals/G-PROMO-025.md) | `planned` | Promotion audit receipt integration |
| [`G-PROMO-026`](07-backlog/goals/G-PROMO-026.md) | `planned` | Promotion service-level verification matrix |
| [`G-PROMO-027`](07-backlog/goals/G-PROMO-027.md) | `planned` | Promotion API architecture and release gates |
| [`G-PROMO-028`](07-backlog/goals/G-PROMO-028.md) | `planned` | Promotion service DigitalOcean release |

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
