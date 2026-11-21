# Architecture Spec: G-APPR-005 — NATS Handlers, Command Endpoints, and Vertical Slice Execution

## 1. Intent & Scope
Provide 100% operational, Zero-Mock NATS JetStream messaging bus integration for `approval-control-service`.
Expose request/reply command endpoints, state query handlers, and transactional outbox event publishers for:
- Approval request creation (`livepilot.v1.control.approval.request`)
- Approval decision recording (`livepilot.v1.control.approval.decide`, `livepilot.v1.control.approval.decision.request`)
- Control mode transitions & queries (`livepilot.v1.control.mode.update`, `livepilot.v1.control.mode.query`)
- Emergency pause triggers & queries (`livepilot.v1.control.emergency_pause.trigger`, `livepilot.v1.control.pause.request`, `livepilot.v1.control.emergency_pause.query`)
- Error mapping to RFC 7807 ProblemDetails and LP05xxx/LP04xxx error codes
- Dead-letter queue (DLQ) publishing for unhandled command failures

## 2. Component Topology
- `code/services/approval-control-service/src/handlers/approvalRequestHandler.ts`: Processes incoming approval requests, verifies pause state and required fields, executes atomically via `IdempotencyStore`, enqueues outbox event, and returns accepted/rejected reply.
- `code/services/approval-control-service/src/handlers/approvalDecisionHandler.ts`: Validates authority, separation of duty, optimistic version concurrency, and emergency pause, atomically records decision and enqueues event.
- `code/services/approval-control-service/src/handlers/controlModeHandler.ts`: Enforces operator capability requirements for autonomous transitions, persists mode updates, and broadcasts `control.mode.updated`.
- `code/services/approval-control-service/src/handlers/emergencyPauseHandler.ts`: Triggers emergency pause, blocks automated systems from resuming without human operator authority, and broadcasts `control.emergency_pause.changed`.
- `code/services/approval-control-service/src/handlers/errorMapper.ts`: Maps domain/infrastructure exceptions to RFC 7807 ProblemDetails and LP05xxx error specs.
- `code/services/approval-control-service/src/index.ts`: Bootstraps database pool, migrations, repositories, NATS subscriptions, background outbox loop, and handles SIGINT/SIGTERM shutdown.
