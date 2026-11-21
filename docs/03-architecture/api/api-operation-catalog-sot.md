# API Operation Catalog SOT

> **Status:** Required inventory before OpenAPI generation.
> **Output:** OpenAPI paths, schemas, examples, contract tests, and coverage registry entries.

> **Current state:** This file defines the required operation record but contains
> no approved operation inventory yet. `openapi.yaml` remains a transport draft
> until every path is registered below with complete traceability. See
> [SOT reconciliation](sot-reconciliation.md).

Every operation is registered using this record:

| Field | Required value |
|---|---|
| Operation ID | Stable lowerCamelCase identifier |
| Requirement/flow | `REQ-LP-NNN` and flow ID |
| Route | `/v1/...` or `/api/...` |
| Method | HTTP method and safety classification |
| Owner | One service and persistence owner |
| Actor/capability | Explicit authorization requirement |
| Request | Headers, path/query, body schema, limits |
| Response | Statuses, envelope, freshness, pagination |
| Events/jobs | Published facts or asynchronous work |
| Errors | Problem code, retryability, localization key |
| Idempotency | Required/optional, fingerprint, retention |
| Verification | Contract, security, integration, and E2E commands |

## Operation classes

- Safe reads: deterministic, cache policy, authorization, freshness metadata.
- Proposals: validate and enqueue; never imply execution.
- Approvals: actor separation, version check, idempotency, audit.
- Consequential mutations: policy gate, reservation/transaction, action receipt.
- Control-plane commands: pause/resume, emergency behavior, propagation evidence.
- Reconciliation: requested/accepted/observed states and unknown-result resolution.

No path may be added to OpenAPI without a catalog record and owning flow reference.
