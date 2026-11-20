# G-CORE-040 Software & Architecture Design Specification

**Goal:** [G-CORE-040](../../../../07-backlog/goals/G-CORE-040.md)  
**Title:** Implement soda-visual-parity-guard skill and perceptual diff engine  
**Status:** ready  
**Framework:** Soda OS  

---

## 🏛️ Domain Context & System Archetype
- **System Archetype:** `backend-service` | `event-stream` | `api-gateway` | `agent-runtime`
- **Bounded Context & Domain:** Core Domain | Supporting Domain | Generic Subdomain
- **Zero-Mock Conformance Gate:** 100% concrete types, zero stubs, zero mocks (Article I).

---

## 🔌 Hexagonal Inbound & Outbound Ports Specification

| Port Direction | Interface Name | Protocol / Transport | Adapter Location | Invariant & Boundary Contract |
|---|---|---|---|---|
| **Driving (Inbound)** | `IngressPort` | Local / CLI / Internal RPC | Declared touch map | Validates schema fail-closed, rejects invalid parameters. |
| **Driven (Outbound)** | `PersistencePort` | File / State / Subprocess | Declared touch map | Atomic persistence, transactional atomicity, saga rollbacks. |
