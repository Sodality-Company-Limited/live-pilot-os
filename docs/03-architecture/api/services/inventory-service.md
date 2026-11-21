# inventory-service contract

Goal: G-INVT-001. Service contract only: no direct runtime handlers, UI, or external synchronization.

## Ownership and registration

| Field | Value |
|---|---|
| Owner / single authoritative writer | `inventory-service` |
| Authority | Tenant-scoped item stock levels, atomic reservation state, row-level concurrency locks, and stock deduction/restoration receipts |
| Authoritative persistence | PostgreSQL Inventory tables (`inventory_items`, `inventory_reservations`) + transactional outbox (`data-persistence-contract-sot.md`); Redis/in-memory caches are reconstructable projections only |
| Public exposure | None; Core BFF, Promotion Service, and internal services communicate exclusively via versioned NATS request/reply and JetStream events |
| Contract ID | `inventory.reservation.livepilot.v1` |
| Subjects | Query/reply: `livepilot.v1.inventory.reservation.request` → `livepilot.v1.inventory.reservation.reply`; Events: `livepilot.v1.inventory.stock.updated`, `livepilot.v1.inventory.reservation.committed`, `livepilot.v1.inventory.reservation.released` (DLQ: `livepilot.v1.inventory.dlq`) |
| Requirements / flows | `REQ-LP-004`, `REQ-LP-016`; `F01-INTEGRATION-004`, `F03.1-FLOW-002`, `F03.4-FLOW-001`, `F03.4-FLOW-002`, `F03.4-FLOW-003`, `F03.4-FLOW-004`, `F03.4-FLOW-005`, `F03.4-FLOW-008` |
| Schemas | `docs/03-architecture/api/schemas/nats/inventory-reservation-request.schema.json`, `inventory-reservation-reply.schema.json`, `inventory-stock-updated.schema.json` |

Producer: `inventory-service`. Consumers: `core-bff`, `promotion-service`, `order-service`, `copilot-alert-service`, and `audit-service`. Other services never write Inventory tables, never read Inventory tables directly via SQL, and never infer or invent stock numbers without querying `inventory-service`.

## Explicit non-ownership

`inventory-service` owns item stock and reservation lifecycle only. It does **not** own or mutate:

- **Catalog:** Product titles, brand claims, images, or SKU variant definitions (`catalog-service`).
- **Margin:** COGS, gross margin floors, or financial safety verdicts (`margin-policy-service`).
- **Promotion:** Voucher lifecycle, flash sale discounts, or campaign budgets (`promotion-service`).
- **Order & Payments:** Customer shopping carts, payment rails, or checkout transactions (`order-service`).
- **Platform Execution:** External TikTok Shop or Shopee API calls or marketplace stock synchronization (`execution-adapter-safety-service`).
- **Control & Audit:** Emergency pause trigger (`approval-control-service`) or append-only decision audit ledger (`audit-service`).

## State Machine Specification

Reservations follow a deterministic, fail-closed state machine:

```
        [ requested ]
              │ (validate auth, idempotency, lock row & check available >= qty)
              ▼
        [ reserved ] ────────────────┬───────────────────────────────┐
              │                      │                               │
              │ (order payment       │ (ttl expired worker)          │ (cancel / manual release)
              │  confirmed)          ▼                               ▼
              ▼                 [ expired ]                     [ released ]
        [ committed ]          (stock restored)                (stock restored)
```

- **Precondition for Reservation:** `available_stock >= requested_quantity` under an exclusive row lock (`SELECT ... FOR UPDATE`).
- **Conflict State:** If `available_stock < requested_quantity`, reservation transitions to `conflict` and returns error `LP13001 INSUFFICIENT_STOCK`.
- **Concurrency Conflict:** If version mismatch occurs during lock acquisition, returns error `LP13004 STOCK_VERSION_CONFLICT`.
- **Emergency Pause:** If control plane emits `control.pause.request`, all reservation attempts fail closed with `LP13005 INVENTORY_PAUSED_LOCKED`.
- **Idempotency Invariant:** Repeating a reservation request with identical `idempotency_key` and matching payload hash returns the exact cached reservation receipt with zero duplicate stock deduction.

## Commands and Events

### 1. `livepilot.v1.inventory.reservation.request`
- **Kind:** Request / Reply (Command)
- **Producer:** `promotion-service`, `core-bff`
- **Consumer:** `inventory-service`
- **Payload:** `tenant_id`, `session_id`, `sku`, `quantity`, `idempotency_key`, `reservation_ttl_seconds`
- **Reply:** `reservation_id`, `status: "reserved"`, `expires_at`, `remaining_available_stock`

### 2. `livepilot.v1.inventory.stock.updated`
- **Kind:** JetStream Event
- **Producer:** `inventory-service`
- **Consumers:** `copilot-alert-service`, `portal-bff`, `audit-service`
- **Payload:** `tenant_id`, `sku`, `total_stock`, `reserved_stock`, `available_stock`, `version`, `reason`

### 3. `livepilot.v1.control.pause.request`
- **Kind:** Inbound Control Signal
- **Producer:** `control-plane` / `approval-control-service`
- **Consumer:** `inventory-service`
- **Behavior:** Freezes mutations fail-closed.

## Error Codes and Public Mapping

| Code | Symbol | HTTP Status | Retry Policy | Description |
|---|---|---|---|---|
| `LP13001` | `INSUFFICIENT_STOCK` | 409 | `never` | Requested quantity exceeds available inventory stock. |
| `LP13002` | `RESERVATION_EXPIRED` | 409 | `reconcile` | Stock reservation has expired and was released back to inventory. |
| `LP13003` | `RESERVATION_NOT_FOUND` | 404 | `never` | The requested reservation identifier does not exist. |
| `LP13004` | `STOCK_VERSION_CONFLICT` | 409 | `retry` | Inventory version changed during reservation. Retry the operation. |
| `LP13005` | `INVENTORY_PAUSED_LOCKED` | 422 | `never` | Emergency pause is active; inventory stock mutations are locked fail-closed. |

## Persistence and Transactional Boundary

- PostgreSQL tables:
  - `inventory_items` (`tenant_id`, `sku`, `total_stock`, `reserved_stock`, `version`, `updated_at`)
  - `inventory_reservations` (`reservation_id`, `tenant_id`, `session_id`, `sku`, `quantity`, `status`, `expires_at`, `version`, `created_at`)
  - `inventory_outbox` (`id`, `aggregate_id`, `event_type`, `payload`, `created_at`, `published_at`)
  - `inventory_idempotency` (`idempotency_key`, `request_hash`, `response_payload`, `status`, `expires_at`)
- Row-Level Security: All tables enforce `tenant_id` tenant isolation.
- Outbox Invariant: Stock deduction and outbox insertion execute within the exact same database transaction.
