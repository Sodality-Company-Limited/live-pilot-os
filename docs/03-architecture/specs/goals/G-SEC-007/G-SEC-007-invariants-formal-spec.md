# G-SEC-007 Invariants

- Missing identity, tenant, capability, correlation, or required revision fails closed.
- Consequential operations are idempotent and preserve audit lineage.
- Credentials and tokens never appear in logs, cookies readable by JavaScript, API responses, or audit payloads.
- Invalid state transitions and unknown outcomes are explicit and non-success.

