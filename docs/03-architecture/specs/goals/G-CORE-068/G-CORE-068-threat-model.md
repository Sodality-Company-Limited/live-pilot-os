# G-CORE-068 Threat Model

| Threat | Control | Evidence |
|---|---|---|
| forged session/tenant/role | server-authoritative authorization and scope checks | negative auth tests |
| duplicate/replay | idempotency key plus request fingerprint and unique constraint | replay/conflict tests |
| poison or oversized payload | schema validation, bounded retry, DLQ | contract/chaos tests |
| sensitive text leakage | minimization, hashing/redaction, safe errors | redaction tests |
| public infrastructure exposure | private binding and firewall matrix | hardening scan |
| stale/unknown release | immutable digest and rollback receipt | release evidence |

