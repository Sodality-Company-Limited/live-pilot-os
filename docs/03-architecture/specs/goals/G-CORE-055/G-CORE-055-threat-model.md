# G-CORE-055: Threat Model

| Threat | Boundary | Mitigation |
|---|---|---|
| forged actor/session | gateway/Core BFF | signed context and server-side capability validation |
| duplicate/replay | NATS/inbox | event identity and fingerprint deduplication |
| stale or unknown dependency | service/adapter | explicit pending/unknown and reconciliation |
| PII/secret leakage | logs/events/provider | redaction and schema allow-list |
| public Core BFF exposure | KrakenD | private route-prefix and boundary test |
