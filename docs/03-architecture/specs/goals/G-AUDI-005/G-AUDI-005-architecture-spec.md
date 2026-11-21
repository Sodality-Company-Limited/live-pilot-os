# Architecture Spec: G-AUDI-005
The primary vertical slice ingests `livepilot.v1.audit.receipt.append`, checks idempotency, redacts secrets, appends to hash chain, and commits atomically.
