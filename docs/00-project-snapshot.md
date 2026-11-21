# Project snapshot

> **TL;DR for agents.** Update when architecture, active goals, or constraints change.  
> Reload this at the start of every session before collaboration phase EXECUTE.

## Architecture (one paragraph)

{How the system is structured — monolith/API/mobile, main modules, data store.}

## Active goals

| ID | Status | Summary |
|----|--------|---------|
| [`G-OPS-002`](07-backlog/goals/G-OPS-002.md) | `planned` | Deploy identity/session service to DigitalOcean |
| [`G-SEC-003`](07-backlog/goals/G-SEC-003.md) | `planned` | Local credential verification |
| [`G-SEC-004`](07-backlog/goals/G-SEC-004.md) | `planned` | Server-managed session lifecycle |
| [`G-SEC-005`](07-backlog/goals/G-SEC-005.md) | `planned` | Authorization context resolution |
| [`G-SEC-006`](07-backlog/goals/G-SEC-006.md) | `planned` | Identity/session service contracts |
| [`G-SEC-007`](07-backlog/goals/G-SEC-007.md) | `planned` | Identity/session security evidence |
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
| [`G-WEB-018`](07-backlog/goals/G-WEB-018.md) | `blocked` | Serve an Authorized Session Overview through Portal BFF |
| [`G-WEB-019`](07-backlog/goals/G-WEB-019.md) | `blocked` | Render Host Product Signals from a Validated Snapshot |
| [`G-WEB-023`](07-backlog/goals/G-WEB-023.md) | `blocked` | Portal Session Read Route |
| [`G-WEB-024`](07-backlog/goals/G-WEB-024.md) | `blocked` | Portal Logout Route |
| [`G-WEB-025`](07-backlog/goals/G-WEB-025.md) | `blocked` | Portal Session Event Stream |
| [`G-WEB-026`](07-backlog/goals/G-WEB-026.md) | `blocked` | Portal Promotion Proposal Route |
| [`G-WEB-027`](07-backlog/goals/G-WEB-027.md) | `blocked` | Portal Promotion Decision Route |
| [`G-WEB-028`](07-backlog/goals/G-WEB-028.md) | `blocked` | Portal Promotion Read Route |
| [`G-WEB-029`](07-backlog/goals/G-WEB-029.md) | `blocked` | Portal Action Log Read Route |
| [`G-WEB-035`](07-backlog/goals/G-WEB-035.md) | `blocked` | Audience Topic Log Binding |
| [`G-WEB-044`](07-backlog/goals/G-WEB-044.md) | `blocked` | Simulated Session Controls |
| [`G-WEB-046`](07-backlog/goals/G-WEB-046.md) | `blocked` | Validate Host and Live Ops Integration Journey |

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
