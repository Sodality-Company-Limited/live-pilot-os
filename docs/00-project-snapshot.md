# Project snapshot

> **TL;DR for agents.** Update when architecture, active goals, or constraints change.  
> Reload this at the start of every session before collaboration phase EXECUTE.

## Architecture (one paragraph)

{How the system is structured — monolith/API/mobile, main modules, data store.}

## Active goals

| ID | Status | Summary |
|----|--------|---------|
| [`G-CORE-075`](07-backlog/goals/G-CORE-075.md) | `planned` | Catalog approved-product read capability |
| [`G-CORE-076`](07-backlog/goals/G-CORE-076.md) | `planned` | Catalog authorization and idempotency |
| [`G-CORE-077`](07-backlog/goals/G-CORE-077.md) | `planned` | Deploy Catalog service to DigitalOcean |
| [`G-CORE-051`](07-backlog/goals/G-CORE-051.md) | `planned` | Add service-owned live-session persistence |
| [`G-CORE-052`](07-backlog/goals/G-CORE-052.md) | `planned` | Implement the live-session lifecycle engine |
| [`G-CORE-053`](07-backlog/goals/G-CORE-053.md) | `planned` | Wire the live-session lifecycle transport |
| [`G-CORE-054`](07-backlog/goals/G-CORE-054.md) | `planned` | Enforce session-service safety guards |
| [`G-CORE-055`](07-backlog/goals/G-CORE-055.md) | `planned` | Prepare the session-service runtime package |
| [`G-CORE-056`](07-backlog/goals/G-CORE-056.md) | `planned` | Deploy session-service to DigitalOcean |
| [`G-CORE-057`](07-backlog/goals/G-CORE-057.md) | `planned` | Define the JEV/Copilot proposal contract |
| [`G-CORE-058`](07-backlog/goals/G-CORE-058.md) | `planned` | Telemetry service contract |
| [`G-CORE-059`](07-backlog/goals/G-CORE-059.md) | `planned` | Telemetry persistence |
| [`G-CORE-060`](07-backlog/goals/G-CORE-060.md) | `planned` | Telemetry ingestion |
| [`G-CORE-061`](07-backlog/goals/G-CORE-061.md) | `planned` | Telemetry projections and replay |
| [`G-CORE-062`](07-backlog/goals/G-CORE-062.md) | `planned` | Telemetry safety and audit |
| [`G-CORE-063`](07-backlog/goals/G-CORE-063.md) | `planned` | Telemetry runtime package |
| [`G-CORE-064`](07-backlog/goals/G-CORE-064.md) | `planned` | Telemetry DigitalOcean release |
| [`G-CORE-065`](07-backlog/goals/G-CORE-065.md) | `in_progress` | Freeze the Intent/Risk service contract |
| [`G-CORE-066`](07-backlog/goals/G-CORE-066.md) | `planned` | Implement deterministic intent and risk domain decisions |
| [`G-CORE-067`](07-backlog/goals/G-CORE-067.md) | `planned` | Establish Intent/Risk durable facts and outbox |
| [`G-CORE-068`](07-backlog/goals/G-CORE-068.md) | `planned` | Wire the Intent/Risk service handler |
| [`G-CORE-069`](07-backlog/goals/G-CORE-069.md) | `planned` | Package the Intent/Risk service for DigitalOcean |
| [`G-CORE-070`](07-backlog/goals/G-CORE-070.md) | `planned` | Verify the Intent/Risk service release on DigitalOcean |
| [`G-OPS-002`](07-backlog/goals/G-OPS-002.md) | `planned` | Deploy identity/session service to DigitalOcean |
| [`G-SEC-002`](07-backlog/goals/G-SEC-002.md) | `ready` | Identity/session persistence contract |
| [`G-SEC-003`](07-backlog/goals/G-SEC-003.md) | `planned` | Local credential verification |
| [`G-SEC-004`](07-backlog/goals/G-SEC-004.md) | `planned` | Server-managed session lifecycle |
| [`G-SEC-005`](07-backlog/goals/G-SEC-005.md) | `planned` | Authorization context resolution |
| [`G-SEC-006`](07-backlog/goals/G-SEC-006.md) | `planned` | Identity/session service contracts |
| [`G-SEC-007`](07-backlog/goals/G-SEC-007.md) | `planned` | Identity/session security evidence |
| [`G-IDEN-002`](07-backlog/goals/G-IDEN-002.md) | `planned` | Implement credential verification and session token domain |
| [`G-IDEN-003`](07-backlog/goals/G-IDEN-003.md) | `planned` | Implement seeded test-user login command |
| [`G-IDEN-004`](07-backlog/goals/G-IDEN-004.md) | `planned` | Implement authenticated session resolution |
| [`G-IDEN-005`](07-backlog/goals/G-IDEN-005.md) | `planned` | Implement logout and session revocation |
| [`G-IDEN-006`](07-backlog/goals/G-IDEN-006.md) | `planned` | Implement server-side authorization context guard |
| [`G-IDEN-007`](07-backlog/goals/G-IDEN-007.md) | `planned` | Harden identity/session service runtime for DigitalOcean |
| [`G-IDEN-008`](07-backlog/goals/G-IDEN-008.md) | `planned` | Prepare identity/session DigitalOcean production release |
| [`G-JEVC-001`](07-backlog/goals/G-JEVC-001.md) | `planned` | Freeze JEV/Copilot service scope and contract |
| [`G-JEVC-002`](07-backlog/goals/G-JEVC-002.md) | `planned` | Register JEV/Copilot NATS and provider schemas |
| [`G-JEVC-003`](07-backlog/goals/G-JEVC-003.md) | `planned` | Create JEV/Copilot PostgreSQL persistence boundary |
| [`G-JEVC-004`](07-backlog/goals/G-JEVC-004.md) | `planned` | Implement provider-neutral JEV inference adapter |
| [`G-JEVC-005`](07-backlog/goals/G-JEVC-005.md) | `planned` | Implement first suggestion vertical slice |
| [`G-JEVC-006`](07-backlog/goals/G-JEVC-006.md) | `planned` | Implement suggestion delivery and withdrawal lifecycle |
| [`G-JEVC-007`](07-backlog/goals/G-JEVC-007.md) | `planned` | Harden JEV/Copilot reliability security and audit |
| [`G-JEVC-008`](07-backlog/goals/G-JEVC-008.md) | `planned` | Certify JEV/Copilot service-level contracts |
| [`G-JEVC-009`](07-backlog/goals/G-JEVC-009.md) | `planned` | Prepare JEV/Copilot service for DigitalOcean |

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
