# Hexagonal Inbound & Outbound Ports Architecture Specification

**Location:** `docs/03-architecture/specs/hexagonal-ports.md`  
**Framework:** Soda OS  
**Status:** Canonical Framework Specification  

---

## 🏛️ Context & Framework Invariant

All Soda OS services adhere strictly to Domain-Driven Design (DDD) and Hexagonal Ports & Adapters architecture. The domain core remains completely pure and isolated from external infrastructure, frameworks, transport protocols, and storage drivers.

---

### Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Concrete Adapter Location | Invariant & Boundary Contract |
|---|---|---|---|---|
| **Driving (Inbound)** | `HttpServerPort` / `EventConsumerPort` | NestJS HTTP adapter / NATS JetStream | `code/apps/services/.../src/adapters/inbound/` | Validates ingress schemas fail-closed, authenticates identity, maps DTOs to pure domain entities. |
| **Driven (Outbound)** | `DatabasePort` / `PaymentGatewayPort` | PostgreSQL adapter / external platform RPC | `code/apps/services/.../src/adapters/outbound/` | Enforces zero float math, transactional atomicity, idempotent writebacks, and saga compensation rollbacks. |

---

### Bounded Context & Anti-Corruption Layers Specification

- **Bounded Context:** Core domain boundary separating pure domain logic from supporting subsystems.
- **Upstream Context:** Upstream event streams and orchestrators feeding domain actions.
- **Downstream Context:** Downstream persistence, matching engines, and audit ledgers.
- **Anti-Corruption Layer:** Strict schema translation, parameter validation, and fail-closed defense against untrusted upstream schemas.
