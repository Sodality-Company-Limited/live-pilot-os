# G-IDEN-008 threat model

| Threat | Control | Evidence |
|---|---|---|
| credential enumeration | constant-shape invalid result | negative login tests |
| token leakage | opaque hashed session, HttpOnly cookie, redaction | log/event/audit scan |
| role or tenant forgery | server-side membership and capability resolution | authorization matrix |
| replay or duplicate mutation | idempotency or natural idempotency plus revision checks | replay tests |
| unsafe production test adapter | explicit mode gate | production-mode test |

