# G-PROMO-001: Threat Model

| Threat | Boundary | Mitigation |
|---|---|---|
| forged actor or session scope | Core BFF/NATS | server-derived auth context and capability validation |
| duplicate/replayed command | inbox/idempotency | message ID, fingerprint, resource version |
| stale approval or policy | aggregate transition | revision check and fail-closed conflict |
| unknown adapter outcome | execution boundary | pending/unknown state and reconciliation |
| credential or secret leakage | logs/events/audit | redaction and adapter isolation |
| pause bypass | control subject/worker | pause revision checked before consequential commit |
| schema incompatibility | NATS consumers | additive compatibility and hash-locked schemas |

