# Project snapshot

> **TL;DR for agents.** Update when architecture, active goals, or constraints change.  
> Reload this at the start of every session before collaboration phase EXECUTE.

## Architecture (one paragraph)

{How the system is structured — monolith/API/mobile, main modules, data store.}

## Active goals

| ID | Status | Summary |
|----|--------|---------|
| [`G-WEB-018`](07-backlog/goals/G-WEB-018.md) | `blocked` | Serve an Authorized Session Overview through Portal BFF |
| [`G-WEB-019`](07-backlog/goals/G-WEB-019.md) | `blocked` | Render Host Product Signals from a Validated Snapshot |
| [`G-WEB-020`](07-backlog/goals/G-WEB-020.md) | `blocked` | Server-derived Portal Session Context |
| [`G-WEB-021`](07-backlog/goals/G-WEB-021.md) | `blocked` | Trusted Portal-to-Gateway Transport |
| [`G-WEB-022`](07-backlog/goals/G-WEB-022.md) | `blocked` | Portal Login Route |
| [`G-WEB-023`](07-backlog/goals/G-WEB-023.md) | `blocked` | Portal Session Read Route |
| [`G-WEB-024`](07-backlog/goals/G-WEB-024.md) | `blocked` | Portal Logout Route |
| [`G-WEB-025`](07-backlog/goals/G-WEB-025.md) | `blocked` | Portal Session Event Stream |
| [`G-WEB-026`](07-backlog/goals/G-WEB-026.md) | `blocked` | Portal Promotion Proposal Route |
| [`G-WEB-027`](07-backlog/goals/G-WEB-027.md) | `blocked` | Portal Promotion Decision Route |
| [`G-WEB-028`](07-backlog/goals/G-WEB-028.md) | `blocked` | Portal Promotion Read Route |
| [`G-WEB-029`](07-backlog/goals/G-WEB-029.md) | `blocked` | Portal Action Log Read Route |
| [`G-WEB-030`](07-backlog/goals/G-WEB-030.md) | `in_progress` | Host and Live Ops Login Screen |
| [`G-WEB-031`](07-backlog/goals/G-WEB-031.md) | `in_progress` | Role-Scoped UI Access Gate |
| [`G-WEB-032`](07-backlog/goals/G-WEB-032.md) | `in_progress` | Session Logout Control |
| [`G-WEB-033`](07-backlog/goals/G-WEB-033.md) | `in_progress` | Bind Role Views to Session Overview |
| [`G-WEB-034`](07-backlog/goals/G-WEB-034.md) | `in_progress` | Reconnect Session Events in the Browser |
| [`G-WEB-035`](07-backlog/goals/G-WEB-035.md) | `blocked` | Audience Topic Log Binding |
| [`G-WEB-036`](07-backlog/goals/G-WEB-036.md) | `in_progress` | Host Cue Binding |
| [`G-WEB-037`](07-backlog/goals/G-WEB-037.md) | `in_progress` | Selected Product Detail Binding |
| [`G-WEB-039`](07-backlog/goals/G-WEB-039.md) | `in_progress` | Live Ops Proposal Submission |
| [`G-WEB-040`](07-backlog/goals/G-WEB-040.md) | `in_progress` | Live Ops Decision Submission |
| [`G-WEB-041`](07-backlog/goals/G-WEB-041.md) | `in_progress` | Promotion Status for Both Roles |
| [`G-WEB-042`](07-backlog/goals/G-WEB-042.md) | `in_progress` | Live Ops Decision Trace |
| [`G-WEB-043`](07-backlog/goals/G-WEB-043.md) | `in_progress` | Simulated Live Stage and Chat |
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
