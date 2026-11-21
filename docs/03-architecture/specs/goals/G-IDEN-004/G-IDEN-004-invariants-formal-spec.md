# G-IDEN-004 invariants formal

1. Tenant and principal scope are server-derived and cannot be widened by browser fields.
2. Raw passwords, hashes, cookies, and tokens never persist or cross a logging, event, or audit boundary.
3. Invalid, stale, revoked, unauthorized, duplicate-conflict, timeout, and wrong-mode states never report success.
4. Durable state and outbox evidence commit atomically where the contract emits a fact.

