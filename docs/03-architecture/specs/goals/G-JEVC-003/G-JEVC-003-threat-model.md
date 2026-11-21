# G-JEVC-003 — Threat Model & Security Specification

Goal ID: `G-JEVC-003`  
Scope: PostgreSQL Security, SQL Injection Defense, Multi-Tenant Isolation, and RLS Hardening  
Status: `APPROVED`

---

## 1. Threat Vectors and Architectural Mitigations

| Threat Vector | Attack Scenario | Mitigation Invariant |
|---|---|---|
| **Cross-Tenant Data Tampering / Snooping** | Malicious tenant injects another tenant's suggestion ID. | **PostgreSQL Row Level Security (RLS):** All tables enforce `FORCE ROW LEVEL SECURITY` with `USING (tenant_id = current_setting('app.tenant_id', true))`. |
| **SQL Injection** | Attacker injects raw SQL through parameter fields or JSON payloads. | **Parameterized Queries:** All SQL statements utilize parameter placeholders (`$1, $2, ...`); zero raw string interpolation. |
| **Command Replay / Reentrancy** | Attacker replays duplicate suggestion creation commands. | **Distributed Idempotency Store:** Replay returns cached response; modified parameters trigger `IDEMPOTENCY_PAYLOAD_MISMATCH`. |
| **Dual-Write State Desynchronization** | System crashes between DB commit and NATS publish. | **Transactional Outbox:** Messages are persisted in `jev_outbox` in the same transaction and polled asynchronously. |
