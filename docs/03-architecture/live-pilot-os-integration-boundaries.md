# LivePilot OS Integration Boundaries

> **Status:** Boundary contract draft. No production marketplace API, permission, or certification details are asserted here.

## Hackathon boundary

| Boundary | Hackathon behavior | Production status |
|---|---|---|
| Live video | Local/demo media supplied by the presenter or a controlled mock. | Platform ingestion method and rights/permissions are undecided. |
| Chat and telemetry | Seeded or simulated events can drive the demo flow. | Exact event source, latency, completeness, and platform availability are unverified. |
| Product catalog | Demo catalog provides approved facts and product/SKU mapping. | Authoritative catalog source and synchronization contract are undecided. |
| Product pinning | Simulated adapter may show a proposed/result state. | Platform endpoint, scopes, approval, and failure semantics must be verified before implementation. |
| Voucher actions | Demo may simulate policy outcome and voucher state. | Issuance API, eligibility, rate limits, and certification must be verified. |
| Stock and orders | Demo may simulate reservations and outcomes. | Cross-platform inventory authority and reconciliation semantics are undecided. |

## Adapter contract requirements

Every adapter operation must eventually define:

- operation name and supported platform;
- request and response schemas with version;
- authentication/authorization scope owner (never store secrets in this document);
- timeout, retryability, idempotency key, and unknown-outcome handling;
- correlation ID linking the request and result to the action log;
- whether the operation is `simulated`, `sandbox`, or `production`.

The exact schemas remain **TBD** until official platform documentation and an authorized integration path are selected. A simulated result must never be represented as a confirmed marketplace result.
