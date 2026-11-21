# Architecture Spec: G-APPR-003
Approval lifecycle must strictly transition `requested → approved | rejected | expired | revoked` with optimistic concurrency locking and fail-closed emergency pause enforcement.
