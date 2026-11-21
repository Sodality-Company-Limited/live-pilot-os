# G-CORE-080: Threat Model

| Threat | Boundary | Mitigation |
|---|---|---|
| forged actor/session | gateway/service | signed context and capability checks |
| duplicate/replay | NATS/inbox | event identity and fingerprint deduplication |
| stale/unknown dependency | service/adapter | explicit pending/unknown and reconciliation |
| PII/secret leakage | logs/events/provider | redaction and allow-listed schemas |
| unsafe external mutation | adapter/control | pause, approval, idempotency, observed-state gates |
