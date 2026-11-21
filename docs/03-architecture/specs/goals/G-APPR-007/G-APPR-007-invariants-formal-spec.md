# Invariants Spec: G-APPR-007

## Security & Operational Invariants
1. **Zero Public Ports:** Port `8086` must NEVER bind to `0.0.0.0` on host; internal loopback only.
2. **Unprivileged Execution:** Container runs strictly as unprivileged user `nodejs` (`uid=10001`, `gid=10001`).
3. **Deterministic Signal Forwarding:** `dumb-init` is mandatory as ENTRYPOINT (PID 1).
4. **Automated Rollback:** Any deployment probe failure must trigger automatic fallback to `:previous`.
5. **Zero Float & Exact Timestamps:** Health probes output ISO 8601 UTC timestamps and integer second uptimes.
