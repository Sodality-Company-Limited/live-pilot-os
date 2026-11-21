# Threat Model: G-EXEC-006: Dispatch Boundaries

1. **Malicious Double-Execution:**
   - *Mitigation:* `adapter_idempotency_records` table blocks concurrent identical dispatches.
2. **External Adapter Impersonation:**
   - *Mitigation:* `PlatformAdapterClient` abstraction enforces strict schema translation and signature verification.
3. **Ghost State Desynchronization:**
   - *Mitigation:* Status transitions require verified observed receipts; failures trigger explicit audit logging.
