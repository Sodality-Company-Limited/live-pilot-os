# Project snapshot

> **TL;DR for agents.** Update when architecture, active goals, or constraints change.  
> Reload this at the start of every session before collaboration phase EXECUTE.

## Architecture (one paragraph)

{How the system is structured — monolith/API/mobile, main modules, data store.}

## Active goals

| ID | Status | Summary |
|----|--------|---------|
| [`G-OPS-002`](07-backlog/goals/G-OPS-002.md) | `planned` | Deploy identity/session service to DigitalOcean |
| [`G-SEC-002`](07-backlog/goals/G-SEC-002.md) | `ready` | Identity/session persistence contract |
| [`G-SEC-003`](07-backlog/goals/G-SEC-003.md) | `planned` | Local credential verification |
| [`G-SEC-004`](07-backlog/goals/G-SEC-004.md) | `planned` | Server-managed session lifecycle |
| [`G-SEC-005`](07-backlog/goals/G-SEC-005.md) | `planned` | Authorization context resolution |
| [`G-SEC-006`](07-backlog/goals/G-SEC-006.md) | `planned` | Identity/session service contracts |
| [`G-SEC-007`](07-backlog/goals/G-SEC-007.md) | `planned` | Identity/session security evidence |

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
