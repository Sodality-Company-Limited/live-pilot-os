# Error and ProblemDetails SOT

> **Status:** Canonical error contract for HTTP, NATS replies, jobs, and UI localization.
> **Code authority:** [error-codes.md](error-codes.md) and [error-codes.yaml](error-codes.yaml)

All errors have a stable code, safe summary, correlation ID, retry classification,
and a localized message key. Internal details never cross the trust boundary.

| Code family | HTTP | Retryable | Meaning |
|---|---:|---:|---|
| `AUTH_*` | 401/403 | no | Identity or capability failure |
| `VALIDATION_*` | 400 | no | Invalid syntax or field value |
| `SCOPE_*` | 403/404 | no | Tenant/session/resource scope failure |
| `CONFLICT_*` | 409 | conditional | Version, state, or idempotency conflict |
| `POLICY_*` | 422 | no | Domain policy rejected the action |
| `RATE_*` | 429 | yes | Quota or rate limit with retry-after |
| `DEPENDENCY_*` | 502/503/504 | conditional | Downstream unavailable/timeout |
| `UNKNOWN_*` | 202/409 | reconcile | Consequential result is unresolved |
| `INTERNAL_*` | 500 | conditional | Unexpected server failure |

## HTTP shape

```json
{
  "type": "https://errors.livepilot.invalid/CONFLICT_VERSION",
  "title": "State conflict",
  "status": 409,
  "code": "CONFLICT_VERSION",
  "message_key": "errors.conflict.version",
  "detail": "Safe localized summary",
  "correlation_id": "corr_123",
  "retryable": false,
  "retry_after_seconds": null,
  "field_errors": [],
  "evidence_id": "audit_123"
}
```

Codes, status, retryability, localization keys, and redaction rules are versioned;
clients branch on `code`, never on human text.
