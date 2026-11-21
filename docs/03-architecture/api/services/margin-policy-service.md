# margin-policy-service contract

Goal: G-MARG-001. Service contract only: no direct runtime handlers, UI, or external synchronization.

## Ownership and registration

| Field | Value |
|---|---|
| Owner / single authoritative writer | `margin-policy-service` |
| Authority | Tenant-scoped margin floor policies, contribution margin arithmetic, economic evaluations, safer alternative discount generation, and immutable margin verdict receipts |
| Authoritative persistence | PostgreSQL Margin tables (`margin_policies`, `margin_verdicts`, `margin_re-evaluations`) + transactional outbox (`data-persistence-contract-sot.md`); Redis/in-memory caches are reconstructable projections only |
| Public exposure | None; Core BFF, Promotion Service, and internal services communicate exclusively via versioned NATS request/reply and JetStream events |
| Contract ID | `margin.policy.livepilot.v1` |
| Subjects | Query/reply: `livepilot.v1.margin.evaluation.request` → `livepilot.v1.margin.evaluation.reply`; Events: `livepilot.v1.margin.verdict.recorded` (DLQ: `livepilot.v1.margin.verdict.recorded.dlq`); Listeners: `livepilot.v1.catalog.product.updated` (DLQ: `livepilot.v1.catalog.product.updated.dlq`) |
| Requirements / flows | `BR-F03-009`, `BR-F03-010`, `BR-F03-011`, `BR-F03-012`, `BR-F03-013`; `REQ-LP-004`, `REQ-LP-016`; `F03.3-FLOW-001`, `F03.3-FLOW-002`, `F03.3-FLOW-003`, `F03.3-FLOW-004`, `F03.3-FLOW-005`, `F03.3-FLOW-006`, `F03.3-FLOW-007`, `F03.3-FLOW-008` |
| Schemas | `docs/03-architecture/api/schemas/nats/margin-evaluation-request.schema.json`, `margin-evaluation-reply.schema.json`, `margin-verdict-recorded.schema.json` |

Producer: `margin-policy-service`. Consumers: `core-bff`, `promotion-service`, `approval-control-service`, `decision-engine-service`, `scenario-service`, and `audit-service`. Other services never write Margin tables, never read Margin tables directly via SQL, and never infer, invent, or calculate contribution margin without querying `margin-policy-service`.

## Explicit non-ownership

`margin-policy-service` owns margin floor policies, mathematical margin evaluation, and verdict receipts only. It does **not** own or mutate:

- **Catalog:** Product titles, brand claims, images, SKU variants, or authoritative price facts (`catalog-service`).
- **Inventory:** Stock levels, reservation allocations, commit, release, or warehouse projections (`inventory-service`).
- **Promotion & Voucher Lifecycle:** Voucher codes, promotion proposals, campaign eligibility, issuance limits, or customer assignment (`promotion-service`).
- **Approval Decision & Mode:** Human approval state capture, supervisor authorization, Emergency Pause mode toggles, or separation-of-duties rules (`approval-control-service`).
- **Order & Payments:** Customer shopping carts, payment rails, order checkout transactions, or settlement (`order-service`).
- **Platform Execution:** External TikTok Shop or Shopee API calls or marketplace discount creation (`execution-adapter-safety-service`).
- **Audit Ledger:** Append-only enterprise audit log persistence and tamper-evident proofs (`audit-service`).

## Aggregate and Persistence Boundaries

All authoritative state is stored in tenant-partitioned PostgreSQL tables with an atomic transactional outbox:

1. **`margin_policies` Aggregate:**
   - Keys: `tenant_id`, `policy_id`, `policy_version` (strictly monotonic integer).
   - Attributes: `name`, `status` (`DRAFT`, `ACTIVE`, `DEPRECATED`), `currency` (ISO 4217), `currency_scale` (integer 0–4), `floor_bps` (basis points integer, e.g., 1500 = 15.00%), `review_band_bps` (basis points integer, e.g., 2000 = 20.00%), `auto_approval_enabled` (boolean), `effective_from`, `effective_to`.
2. **`margin_verdicts` Aggregate:**
   - Keys: `verdict_id` (UUIDv7), `tenant_id`, `session_id`.
   - Attributes: `proposal_id`, `sku`, `policy_id`, `policy_version`, `price_minor`, `discount_minor`, `cogs_minor`, `giveaway_cost_minor`, `platform_fee_minor`, `calculated_margin_minor`, `calculated_margin_bps`, `floor_bps`, `verdict` (`APPROVED`, `NEEDS_APPROVAL`, `REJECTED`), `safer_alternative` (JSON: `recommended_discount_minor`, `projected_margin_bps`), `input_hash` (SHA-256), `correlation_id`, `causation_id`, `created_at`.
3. **Transactional Outbox (`margin_outbox`):**
   - Atomically records events (`livepilot.v1.margin.verdict.recorded`) in the same database transaction as aggregate mutation.
   - Guaranteed at-least-once dispatch via transactional outbox worker to NATS JetStream.

## State Machine Specification

Margin evaluations and verdicts follow a deterministic, fail-closed state machine:

```
        [ DRAFT / REQUESTED ]
                  │
                  │ (validate auth, tenancy, ISO currency scale, non-negative integer math)
                  ▼
             [ VALIDATED ]
                  │
                  │ (load active margin_policy for tenant & SKU; compute net revenue & contribution margin)
                  ▼
          [ POLICY_CHECKED ] ──────────────────────────────────────────┐
                  │                                                    │
                  ├───────────────────────────────┬────────────────────┤
                  │ (margin_bps >= floor_bps      │ (review_band_bps   │ (margin_bps < floor_bps)
                  │  AND margin_bps > review_band)│  > margin_bps      ▼
                  ▼                               │  >= floor_bps) [ REJECTED ] (LP05001)
             [ APPROVED ]                         ▼                    │ (compute safer discount)
                  │                       [ NEEDS_APPROVAL ]           ▼
                  │                               │             [ SAFER_RECOMMENDED ]
                  ▼                               ▼                    │
             [ PERSISTED & EMITTED VIA OUTBOX (margin.verdict.recorded) ]◄┘
```

### Transition Matrix & Invariants

| From State | Trigger / Condition | To State | Output / Action |
|---|---|---|---|
| `DRAFT` | Inbound `margin.evaluation.request` | `VALIDATED` | Input schema, currency scale, integer types validated |
| `DRAFT` | Malformed JSON / floating-point number detected | `REJECTED` (Fail-Closed) | Error `LP03001 REQUEST_INVALID` |
| `DRAFT` | Tenant / session boundary mismatch | `REJECTED` (Fail-Closed) | Error `LP02001 TENANT_SCOPE_DENIED` |
| `VALIDATED` | Active policy loaded, contribution margin computed | `POLICY_CHECKED` | Exact integer arithmetic completed |
| `VALIDATED` | Policy not found or inactive | `REJECTED` (Fail-Closed) | Error `LP10001 RESOURCE_NOT_FOUND` |
| `POLICY_CHECKED` | `calculated_margin_bps >= floor_bps` AND `> review_band_bps` | `APPROVED` | Emit `margin.verdict.recorded` (`verdict: APPROVED`) |
| `POLICY_CHECKED` | `floor_bps <= calculated_margin_bps <= review_band_bps` | `NEEDS_APPROVAL` | Emit `margin.verdict.recorded` (`verdict: NEEDS_APPROVAL`) |
| `POLICY_CHECKED` | `calculated_margin_bps < floor_bps` | `REJECTED` | Compute safer alternative; emit `margin.verdict.recorded` (`verdict: REJECTED`) |

### Timeout, Unknown, and Re-evaluation Transitions

```
    [ EVALUATION_ACTIVE ] ─────────(network partition / timeout)─────────► [ TIMEOUT ]
                                                                                │
                                                                                ▼
    [ ACTION_BLOCKED ] ◄──────────(fail-closed safe stop)─────────────── [ UNKNOWN ] (LP08002)
                                                                                │
                                                                                ▼
    [ DEAD_LETTER ] ◄─────────────(max retries exhausted)────────────── [ RECONCILING ]
```

1. **Timeout & Unknown States:**
   - If downstream catalog validation or policy store times out ($> 2000 \text{ ms}$), the evaluation transitions to `TIMEOUT` and returns `LP07002 DEPENDENCY_TIMEOUT` with status `UNKNOWN` (`LP08002 ACTION_UNKNOWN`).
   - In accordance with Article I & Article II, `UNKNOWN` is never treated as success, never bypassed, and cannot authorize voucher issuance or platform execution.
2. **Reconciliation & DLQ Lifecycle:**
   - Unreconciled verdicts enter `RECONCILING` via asynchronous outbox retry worker.
   - If message publishing or transaction receipt fails after 5 exponential backoff retries, the payload transitions to `DEAD_LETTER` (`livepilot.v1.margin.verdict.recorded.dlq`).
3. **Economic Change Invalidation (FLOW-008):**
   - Listening to `livepilot.v1.catalog.product.updated`: when product price, COGS, or platform fee structure changes, any active promotion proposal bound to that SKU transitions to `STALE_VERDICT`.
   - Stale verdicts are immediately blocked from approval or execution; a fresh `margin.evaluation.request` must be issued and resolved.

## Commands and Events

### 1. `livepilot.v1.margin.evaluation.request`
- **Kind:** Request / Reply (Command)
- **Producer:** `promotion-service`, `core-bff`
- **Consumer:** `margin-policy-service`
- **Ordering Key:** `tenant_id:session_id:proposal_id`
- **Request Payload:**
  ```json
  {
    "tenant_id": "tenant-001",
    "session_id": "session-123",
    "proposal_id": "prop-456",
    "sku": "SKU-BEAUTY-01",
    "currency": "THB",
    "currency_scale": 2,
    "price_minor": 100000,
    "discount_minor": 20000,
    "cogs_minor": 50000,
    "giveaway_cost_minor": 5000,
    "platform_fee_minor": 5000,
    "idempotency_key": "idem-789",
    "causation_id": "msg-001"
  }
  ```
- **Reply Payload:**
  ```json
  {
    "verdict_id": "018e3c12-3456-789a-bcde-f0123456789a",
    "tenant_id": "tenant-001",
    "session_id": "session-123",
    "proposal_id": "prop-456",
    "sku": "SKU-BEAUTY-01",
    "policy_id": "pol-default-th",
    "policy_version": 3,
    "currency": "THB",
    "currency_scale": 2,
    "price_minor": 100000,
    "net_selling_price_minor": 80000,
    "total_costs_minor": 60000,
    "calculated_margin_minor": 20000,
    "calculated_margin_bps": 2500,
    "floor_bps": 1500,
    "review_band_bps": 2000,
    "verdict": "APPROVED",
    "safer_alternative": null,
    "input_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "evaluated_at": "2026-11-21T08:25:00Z"
  }
  ```

### 2. `livepilot.v1.margin.verdict.recorded`
- **Kind:** JetStream At-Least-Once Domain Event
- **Producer:** `margin-policy-service`
- **Consumers:** `promotion-service`, `approval-control-service`, `audit-service`
- **Ordering Key:** `tenant_id:session_id`
- **Subject:** `livepilot.v1.margin.verdict.recorded`
- **DLQ Subject:** `livepilot.v1.margin.verdict.recorded.dlq`
- **Retention & Reliability:** 7 days retention, 5 retries with exponential backoff (initial $100 \text{ ms}$, max $5000 \text{ ms}$, multiplier $2.0$).
- **Payload:** Mirror of evaluation receipt with cryptographic `input_hash` and strict lineage headers (`X-Traceparent`, `X-Correlation-Id`, `X-Causation-Id`).

### 3. Inbound Listener: `livepilot.v1.catalog.product.updated`
- **Kind:** JetStream Consumer
- **Action:** Compares `fact_revision` and updated `price_minor` / attributes against cached evaluation baselines; invalidates current proposal margin status if economics changed before approval/execution.

## Zero-Float Integer Math Invariant Specification

In accordance with Article V of the Global Engineering Constitution, floating-point representations (`float`, `double`, `number` with decimal fractions) are **strictly forbidden** from all financial, pricing, and margin calculations.

### Formal Algebraic Arithmetic & Minor Units

All calculations use exact signed 64-bit integer arithmetic (`i64` / `BigInt`):

1. **Currency Minor Units & Exponents:**
   - Amount Minor: $A \in \mathbb{Z}$
   - Currency Exponent: $e \in \{0, 1, 2, 3, 4\}$
   - Base Currency Scale: $\text{scale} = 10^e$ (e.g. JPY $e=0 \implies 1$, THB/USD $e=2 \implies 100$, BHD $e=3 \implies 1000$).
2. **Net Selling Price Equation:**
   $$\text{net\_selling\_price\_minor} = \text{price\_minor} - \text{discount\_minor}$$
   *Invariant:* $\text{discount\_minor} \le \text{price\_minor}$; negative discounts are rejected with `LP03001`.
3. **Total Direct Costs Equation:**
   $$\text{total\_costs\_minor} = \text{cogs\_minor} + \text{giveaway\_cost\_minor} + \text{platform\_fee\_minor}$$
4. **Contribution Margin (Minor Units):**
   $$\text{contribution\_margin\_minor} = \text{net\_selling\_price\_minor} - \text{total\_costs\_minor}$$
5. **Basis Points ($\text{bps}$) Ratio Calculation:**
   Basis points scale: $10000 \text{ bps} \equiv 100.00\%$. $1 \text{ bps} \equiv 0.01\%$.
   $$\text{margin\_bps} = \text{div\_half\_even}\left(\text{contribution\_margin\_minor} \times 10000, \text{net\_selling\_price\_minor}\right)$$
   *Banker's Rounding Half-Even:* When remainder is exactly half the divisor, round toward the nearest even integer to guarantee zero statistical bias.
6. **Safer Alternative Discount Calculation:**
   When $\text{margin\_bps} < \text{floor\_bps}$, the maximum allowed discount that preserves the target margin floor is derived deterministically:
   $$\text{target\_costs\_multiplier} = 10000 - \text{floor\_bps}$$
   $$\text{max\_net\_price\_minor} = \left\lceil \frac{\text{total\_costs\_minor} \times 10000}{\text{target\_costs\_multiplier}} \right\rceil$$
   $$\text{recommended\_discount\_minor} = \max\left(0, \text{price\_minor} - \text{max\_net\_price\_minor}\right)$$

## Canonical ProblemDetails Error Boundary

Failures and rejection gates map deterministically to `ProblemDetails` per `error-codes.yaml`:

| Condition | Code (`symbol`) | HTTP | Type / `message_key` | Retry Policy & Handling |
|---|---|---|---|---|
| Missing / invalid authentication | `LP01001` (`AUTHENTICATION_REQUIRED`) | 401 | `urn:livepilot:problem:authentication-required` / `errors.authentication.required` | `request_new_credential`; reject immediately |
| Tenant scope mismatch | `LP02001` (`TENANT_SCOPE_DENIED`) | 403 | `urn:livepilot:problem:tenant-scope-denied` / `errors.scope.tenantDenied` | `never`; fail-closed, no data disclosed |
| Session scope mismatch | `LP02002` (`SESSION_SCOPE_DENIED`) | 403 | `urn:livepilot:problem:session-scope-denied` / `errors.scope.sessionDenied` | `never`; fail-closed |
| Floating-point number or invalid minor unit | `LP03001` (`REQUEST_INVALID`) | 400 | `urn:livepilot:problem:request-invalid` / `errors.validation.requestInvalid` | `never`; caller must supply integer minor units |
| Optimistic concurrency version conflict | `LP04001` (`RESOURCE_VERSION_CONFLICT`) | 409 | `urn:livepilot:problem:resource-version-conflict` / `errors.conflict.version` | `never`; reload current policy version |
| Idempotency key reused with different payload | `LP04003` (`IDEMPOTENCY_PAYLOAD_MISMATCH`) | 409 | `urn:livepilot:problem:idempotency-payload-mismatch` / `errors.conflict.idempotencyPayloadMismatch` | `never`; conflicting payload rejected |
| Margin below floor (Loss-making discount) | `LP05001` (`POLICY_REJECTED`) | 422 | `urn:livepilot:problem:policy-rejected` / `errors.policy.rejected` | `never`; discount rejected, safer alt returned |
| Margin in review band | `LP05002` (`APPROVAL_REQUIRED`) | 202 | `urn:livepilot:problem:approval-required` / `errors.policy.approvalRequired` | `never`; paused pending operator approval |
| Policy service dependency unavailable | `LP07001` (`DEPENDENCY_UNAVAILABLE`) | 503 | `urn:livepilot:problem:dependency-unavailable` / `errors.dependency.unavailable` | `retry`; bounded exponential backoff |
| Margin evaluation timeout ($> 2000 \text{ ms}$) | `LP07002` (`DEPENDENCY_TIMEOUT`) | 504 | `urn:livepilot:problem:dependency-timeout` / `errors.dependency.timeout` | `reconcile`; non-success, must reconcile |
| Unresolved / indeterminate evaluation | `LP08002` (`ACTION_UNKNOWN`) | 202 | `urn:livepilot:problem:action-unknown` / `errors.action.unknown` | `reconcile`; fail-closed, action blocked |
| Policy or SKU record not found | `LP10001` (`RESOURCE_NOT_FOUND`) | 404 | `urn:livepilot:problem:resource-not-found` / `errors.resource.notFound` | `never`; explicit refusal, no invention |

## Canonical SOT References and Verification

- Governing SOTs:
  - [overview.md](../../overview.md)
  - [data-persistence-contract-sot.md](../data-persistence-contract-sot.md)
  - [error-problem-details-sot.md](../error-problem-details-sot.md)
  - [error-codes.yaml](../error-codes.yaml)
  - [idempotency-mutation-sot.md](../idempotency-mutation-sot.md)
  - [nats-subject-catalog-sot.md](../nats-subject-catalog-sot.md)
  - [api-operation-catalog-sot.md](../api-operation-catalog-sot.md)
  - [testing-sot.md](../../testing-sot.md)
  - BDD: [feature-03-streampilot-agent.md](../../../../02-product/bdd/feature-03-streampilot-agent.md)
  - Flows: `F03.3-FLOW-001` through `F03.3-FLOW-008` in `docs/03-architecture/source-of-truth-flows/features/F03-streampilot-agent/flows/`

- Verification Commands:
  - `node scripts/contract-check/error-code-registry.mjs`
  - `node scripts/harness/goal-template-conformance-harness.mjs --file docs/07-backlog/goals/G-MARG-001.md`
