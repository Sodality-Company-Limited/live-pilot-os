# G-WEB-018 — Invariants

1. A value shown or returned must come from the authorized, approved contract; missing is not zero.
2. A stale or unknown result cannot be reported as current success.
3. The boundary never trusts browser-supplied tenant or role as authority and never exposes raw sensitive data.
4. Consumes `getLiveSessionOverview`; no schema edits are authorized by this goal. Schema reconciliation is an external prerequisite.

These are executable test obligations, not a claimed formal proof. Test cases: authorized read; unauthenticated access; forged role/tenant; inaccessible session; sensitive-field redaction; malformed DTO; upstream timeout; approved stale/partial representation and correlation propagation.
