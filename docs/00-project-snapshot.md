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
| [`G-CORE-081`](07-backlog/goals/G-CORE-081.md) | `draft` | Enforce F05 test-mode and credential isolation |
| [`G-CORE-082`](07-backlog/goals/G-CORE-082.md) | `draft` | Bootstrap Core BFF service runtime |
| [`G-CORE-083`](07-backlog/goals/G-CORE-083.md) | `draft` | Wire Core BFF HTTP transport and route registry |
| [`G-CORE-084`](07-backlog/goals/G-CORE-084.md) | `draft` | Implement Core BFF NATS request-reply adapter |
| [`G-CORE-085`](07-backlog/goals/G-CORE-085.md) | `draft` | Implement Core BFF projection and Redis adapter |
| [`G-CORE-086`](07-backlog/goals/G-CORE-086.md) | `draft` | Implement Core BFF timeout and reconciliation policy |
| [`G-CORE-087`](07-backlog/goals/G-CORE-087.md) | `draft` | Validate Core BFF configuration and secrets |
| [`G-CORE-088`](07-backlog/goals/G-CORE-088.md) | `draft` | Add Core BFF health and graceful shutdown |
| [`G-CORE-089`](07-backlog/goals/G-CORE-089.md) | `draft` | Add Core BFF observability and redaction |
| [`G-CORE-090`](07-backlog/goals/G-CORE-090.md) | `draft` | Bootstrap F02 Copilot service runtime |
| [`G-CORE-091`](07-backlog/goals/G-CORE-091.md) | `draft` | Bootstrap F03 promotion integration runtime |
| [`G-CORE-092`](07-backlog/goals/G-CORE-092.md) | `draft` | Bootstrap F04 control and audit runtimes |
| [`G-CORE-093`](07-backlog/goals/G-CORE-093.md) | `draft` | Bootstrap F05 identity session runtime |
| [`G-CORE-094`](07-backlog/goals/G-CORE-094.md) | `draft` | Bootstrap adapter safety runtime |
| [`G-CORE-095`](07-backlog/goals/G-CORE-095.md) | `draft` | Bootstrap F01 projection runtime |
| [`G-CORE-096`](07-backlog/goals/G-CORE-096.md) | `draft` | Containerize Core BFF and dependent services |
| [`G-CORE-097`](07-backlog/goals/G-CORE-097.md) | `draft` | Wire local production-shaped Compose runtime |
| [`G-CORE-098`](07-backlog/goals/G-CORE-098.md) | `draft` | Add Core BFF contract and integration CI gates |
| [`G-CORE-099`](07-backlog/goals/G-CORE-099.md) | `draft` | Add end-to-end Core BFF smoke evidence |
| [`G-CORE-100`](07-backlog/goals/G-CORE-100.md) | `draft` | Prepare DigitalOcean deployment configuration |
| [`G-CORE-101`](07-backlog/goals/G-CORE-101.md) | `draft` | Verify deployment rollback and recovery |
| [`G-CORE-102`](07-backlog/goals/G-CORE-102.md) | `draft` | Complete Core BFF production-readiness evidence |
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
