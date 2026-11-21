# Threat Model: G-APPR-001 (Approval & Control Plane)

## 1. Threat Identification (STRIDE)
- **Spoofing:** Unauthorized actors attempting to approve promotion discounts or release emergency pauses.
  - *Mitigation:* NATS workload mTLS + server-derived tenant & session tokens + explicit RBAC role verification (`actor_role`).
- **Tampering:** Malicious alteration of decision parameters or bypass of margin floors.
  - *Mitigation:* Payload hash fingerprints, transactional outbox integrity, immutable state transitions.
- **Repudiation:** Denying that an operator approved a loss-making discount.
  - *Mitigation:* Mandatory actor identity (`actor_ref`, `actor_role`), timestamp in exact ms, and audit event dispatch.
- **Information Disclosure:** Leaking sensitive margin data or credentials in approval events.
  - *Mitigation:* Strict schema filtering (`additionalProperties: false`); approval payloads contain target references only.
- **Denial of Service:** Concurrent decision races or flood of mode changes.
  - *Mitigation:* Optimistic concurrency locking (`expected_resource_version`, `control_revision`), idempotency keys.
- **Elevation of Privilege:** Attempting to force `AUTONOMOUS` mode from untrusted client.
  - *Mitigation:* Server-side capability check; unauthorized mode transitions reject fail-closed (`LP05008`).
