# G-CORE-051 Threat Model

| Threat | Control | Evidence |
|---|---|---|
| forged tenant/session/role | server-authoritative context and capability matrix | negative authorization tests |
| replay/duplicate command | idempotency and version checks | replay tests |
| poison payload | schema validation, bounded retry, DLQ | NATS failure tests |
| public data-plane exposure | private binding and firewall matrix | deployment scan |
| stale release | immutable digest and revision-bound receipt | provenance check |

Secrets remain external to Git and simulated mode cannot mutate a real marketplace.

