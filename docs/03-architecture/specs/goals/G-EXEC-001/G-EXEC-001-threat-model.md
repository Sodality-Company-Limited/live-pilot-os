# Threat Model: G-EXEC-001
- Spoofed execution commands: Mitigated by mandatory NATS mTLS workload identity and server-resolved tenant/session scopes.
- Duplicate execution: Mitigated by unique deduplication key on action_id and aggregate_id with idempotency fingerprint checks.
- Leaked platform credentials: Mitigated by strict adapter boundary; credentials never pass through NATS payloads or domain entities.
- Premature success assumption: Mitigated by fail-closed timeout state (unknown) requiring active platform reconciliation.
