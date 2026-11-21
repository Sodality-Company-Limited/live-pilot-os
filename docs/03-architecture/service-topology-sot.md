# LivePilot OS — Service Topology and Ownership SOT

| Boundary | Owner | Authoritative responsibility |
|---|---|---|
| Host/Live Ops UI | UI | render session-scoped state and collect human decisions |
| Portal BFF | application platform | session DTOs, validation, browser boundary |
| Edge gateway | platform | TLS, auth, rate limits, public routing |
| Core BFF | application platform | orchestration/aggregation, no domain policy |
| Session service | domain | live session lifecycle and presence |
| Catalog service | domain | approved product facts and catalog versions |
| Telemetry service | signals | normalized chat and commerce signals |
| Intent/risk service | signals | classification, clustering, risk proposals |
| JEV/Copilot service | agentic core | bounded context and typed recommendations |
| Margin policy service | policy | deterministic economics and margin verdict |
| Inventory service | policy | reservation/release/commit and stock truth |
| Promotion service | commerce | voucher lifecycle after policy approval |
| Approval/control service | control plane | approval modes, emergency pause, authority |
| Execution/adapter service | integration | idempotent external/simulated commands |
| Audit service | evidence | append-only receipts and lineage |

Services communicate through versioned HTTP at public boundaries and NATS contracts
internally. No service reads another service's tables. PostgreSQL roles, schemas,
migrations, outbox, RLS, and audit ownership follow the service boundary.
