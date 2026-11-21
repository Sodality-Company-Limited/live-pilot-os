# G-JEVC-003 — Formal Invariants Specification

Goal ID: `G-JEVC-003`  
Scope: Persistence Boundary Invariants, Row Level Security, Concurrency Guarantees, and Monetary Conservation  
Status: `APPROVED`

---

## 1. Mathematical & Integrity Invariants

### Invariant 1: Atomic Transactional Outbox
$$\mathbb{P}(\text{Committed}(\text{Suggestion}) \oplus \text{Committed}(\text{OutboxEntry})) = 0$$
Dual-write anomaly between aggregate state mutations and message queue publication is strictly impossible; both commit atomically or roll back together.

### Invariant 2: Tenant Isolation via RLS
$$\forall q \in \text{Queries}, \quad \text{TenantScope}(q) \subseteq \{ \text{current\_setting}('app.tenant_id') \}$$
Every table (`jev_suggestions`, `jev_provider_receipts`, `jev_outbox`, `jev_idempotency`) mandates `FORCE ROW LEVEL SECURITY`. Unauthorized cross-tenant leakage is physically prevented by the PostgreSQL kernel.

### Invariant 3: Optimistic Concurrency Control
$$\text{UpdateVersion}(s, v) \implies v_{\text{next}} = v + 1 \land \text{Condition}(\text{row.version} = v)$$
If a concurrent process modifies a suggestion version, subsequent writes with the stale version fail closed with `RESOURCE_VERSION_CONFLICT`.

### Invariant 4: Universal Multi-Currency System & Zero-Float Invariant
$$\text{Cost} = (A_{\text{minor}}, \text{'USD'}, S = 6) \quad \text{where } A_{\text{minor}} \in \mathbb{N}_0$$
Token costs in `jev_provider_receipts` are represented strictly as whole integers in micro-USD ($10^{-6}$). Floating-point values are banned.
