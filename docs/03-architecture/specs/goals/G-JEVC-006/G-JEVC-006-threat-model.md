# G-JEVC-006 Threat Model & Security Specification

## Threat Analysis (STRIDE)

| Threat | Category | Mitigation |
|---|---|---|
| **Stale Delivery / Outdated Promotion** | Integrity / Repudiation | Freshness timestamp guard rejects delivery if $t_{\text{observed}} \ge t_{\text{freshness\_expires\_at}}$. |
| **Race Condition on Concurrent Feedback** | Tampering / Consistency | PostgreSQL optimistic concurrency version locking (`aggregate_version = $expectedVersion`) prevents lost updates; second mutation fails closed with `RESOURCE_VERSION_CONFLICT` (`LP04001`). |
| **Out-of-Stock Selling Risk** | Repudiation / Financial Loss | `SuggestionLifecycleHandler` subscribes to `catalog.stock.depleted` / `inventory.stock.updated`; immediately revokes active suggestions for zero-stock SKUs with cause `INVENTORY_STOCK_DEPLETED`. |
| **Cross-Tenant State Tampering** | Elevation of Privilege / Information Disclosure | All aggregate queries, updates, and outbox writes are isolated by PostgreSQL RLS tenant scope (`SET LOCAL app.tenant_id = $tenantId`) and verified composite keys `(tenant_id, suggestion_id)`. |
| **Emergency Halt Bypass** | Elevation of Privilege | Receipt of `control.pause.request` immediately invalidates and transitions all active suggestions to `withdrawn` with cause `CONTROL_EMERGENCY_PAUSE`. |
| **Audit Loss on Feedback** | Non-Repudiation | Operator decisions capture `actor_id`, `decision`, `edits`, and ISO timestamp in `operator_decision` JSONB payload, persisted atomically with outbox event. |
