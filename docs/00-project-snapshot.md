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
| [`G-CORE-070`](07-backlog/goals/G-CORE-070.md) | `draft` | Reconcile the F02 Core BFF HUD contract |
| [`G-CORE-071`](07-backlog/goals/G-CORE-071.md) | `draft` | Produce grounded F02 host copilot suggestions |
| [`G-CORE-072`](07-backlog/goals/G-CORE-072.md) | `draft` | Enforce F02 guidance freshness, redaction, and withdrawal |
| [`G-CORE-073`](07-backlog/goals/G-CORE-073.md) | `draft` | Reconcile F03 Core BFF promotion contract integration |
| [`G-CORE-074`](07-backlog/goals/G-CORE-074.md) | `draft` | Enforce F03 gateway and adapter safety boundary |
| [`G-CORE-075`](07-backlog/goals/G-CORE-075.md) | `draft` | Orchestrate F03 verified-signal promotion workflow |
| [`G-CORE-076`](07-backlog/goals/G-CORE-076.md) | `draft` | Reconcile F04 action-log and evidence API contract |
| [`G-CORE-077`](07-backlog/goals/G-CORE-077.md) | `draft` | Enforce F04 approval mode and Emergency Pause control |
| [`G-CORE-078`](07-backlog/goals/G-CORE-078.md) | `draft` | Append F04 audit receipts and secure adapter commands |
| [`G-CORE-079`](07-backlog/goals/G-CORE-079.md) | `draft` | Reconcile F05 test-authentication HTTP contract |
| [`G-CORE-080`](07-backlog/goals/G-CORE-080.md) | `draft` | Implement server-managed F05 test sessions |
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
