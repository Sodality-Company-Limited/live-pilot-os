# G-SEC-004 Threat Model

| Threat | Mitigation |
|---|---|
| Spoofed identity | signature/session validation and server-side lookup |
| Tampered context | signed context, mTLS/workload identity, re-authorization |
| Credential disclosure | Argon2id hashes, opaque cookies, redacted logs |
| Replay | expiry, revocation, idempotency, correlation, lineage |
| Tenant escape | membership and capability checks at owning boundary |

