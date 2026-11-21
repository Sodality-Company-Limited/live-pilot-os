# Invariants Formal Spec: G-EXEC-008: Deployment Invariants

1. **Non-Root Invariant:**
   Container process runs strictly as UID 1000 (`livepilot`), never root.
2. **Health Probe Invariant:**
   `/healthz` must return HTTP 200 within 3 seconds.
3. **Graceful Teardown Invariant:**
   SIGTERM triggers graceful shutdown, allowing pending outbox batches up to 10 seconds to finish.
