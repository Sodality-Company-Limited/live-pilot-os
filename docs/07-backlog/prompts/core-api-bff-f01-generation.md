# Reusable Prompt — Generate Core API BFF Goals from a Feature Contract

Copy this prompt into another agent or repository after replacing the bracketed inputs.

```text
You are the Soda OS goal-generation coordinator for [PROJECT]. Generate canonical, repository-grounded
atomic goals for [FEATURE_ID] using the supplied API/event contracts and source-of-truth flows.

Inputs:
- Product/BRD: [BRD_PATH]
- BDD/acceptance: [BDD_PATHS]
- Architecture overview: [ARCHITECTURE_PATH]
- HTTP contract: [HTTP_CONTRACT_PATHS]
- Async/event contract: [ASYNC_CONTRACT_PATHS]
- Flow coverage registry: [FLOW_COVERAGE_PATH]
- Goal template: [GOAL_TEMPLATE_PATH]
- Epic slug and integration branch: [EPIC_SLUG], `epic/[EPIC_SLUG]`

Required procedure:
1. Read the repository AGENTS instructions, the product brief, architecture/technical/quality SOTs,
   all linked feature flows, API operation catalog, identity/authorization, error, realtime, NATS,
   persistence, and route-prefixing authorities.
2. Run the repository's API traceability and SOT hierarchy checks before drafting. Never invent a route,
   payload, event subject, owner, error code, retry rule, or state transition from a table name or guess.
3. Treat the HTTP contract as authoritative for Core BFF operations and the async contract as authoritative
   for service-to-service messages. Reuse existing operations when semantics match; record a blocking
   `[NEEDS CLARIFICATION]` for missing behavior.
4. Split the feature into goals with exactly one independently verifiable outcome. Enforce: one layer per
   goal, no more than three operational source files in a touch map, no UI plus backend coupling, and a
   verification command that can run in about 60 seconds. Separate contract/schema, domain logic, handler,
   security/middleware, gateway, adapter, and projection work.
5. Include every required adjacent boundary: Core BFF, KrakenD/edge gateway, NATS/JetStream contracts,
   service authorization, idempotency, timeout/unknown/reconciliation, audit, observability, and adapter
   mode labels. Do not let Core BFF own domain rules or another service's database.
6. Build a dependency DAG and mark disjoint touch maps so `soda-os goal waves [EPIC_SLUG]` can partition
   parallel team-agent waves. Contract goals are the synthesis barrier; independent services may fan out
   only after their prerequisites are satisfied.
7. For every goal, create the canonical goal card from the exact template plus its acceptance contract and
   five satellite specs: architecture, invariants/formal, FSM/runtime, threat model, and worktree plan.
8. Put each goal on the epic integration branch `epic/[EPIC_SLUG]`, use goal IDs allocated by the repository
   CLI, and keep implementation on `feature/G-xxx` branches. Do not implement application code in this pass.
9. Run goal-template and architecture-design conformance for every generated goal, then run API traceability,
   SOT, error-code, and contract checks. Update only the epic queue/index after validation.

Output:
- Generated goal files and satellite specifications, not only a chat summary.
- A compact DAG/wave table listing goal ID, single outcome, dependencies, owner/persona, and disjoint touch map.
- Exact validation commands and pass/fail evidence.
- Explicit blockers for unresolved contract intent; never silently downgrade them to assumptions.
```

Repository-specific Feature 01 invocation:

```text
Feature: F01 — Live Chat and Purchase-Signal Analysis
BRD: docs/02-product/brd/feature-01-live-chat-purchase-signal-analysis.md
BDD: docs/02-product/bdd/feature-01-live-chat-telemetry.md
Flows: docs/03-architecture/source-of-truth-flows/features/F01-live-chat-telemetry/
HTTP: docs/03-architecture/api/core-bff/openapi.yaml and docs/03-architecture/api/api-operation-catalog-sot.md
Async: docs/03-architecture/api/asyncapi.yaml and docs/03-architecture/api/nats-subject-catalog-sot.md
Epic branch: epic/CORE
```
