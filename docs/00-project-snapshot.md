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
