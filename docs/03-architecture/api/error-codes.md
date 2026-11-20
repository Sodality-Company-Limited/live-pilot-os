# LivePilot OS public error-code contract

> **Status:** Canonical SOT for public HTTP errors, NATS replies, jobs, and localized UI handling.
> **Version:** 1.0
> **Owner:** LivePilot API governance
> **Registry:** [error-codes.yaml](error-codes.yaml)
> **Related:** [error-problem-details-sot.md](error-problem-details-sot.md), [localization-sot.md](../localization-sot.md)

## 1. Purpose and scope

Every public error has one immutable code and one machine-readable registry entry.
The registry is the allocation authority; this document defines semantics and the
RFC 7807 response contract. Codes are opaque to clients and are never derived from
routes, providers, database errors, or human text.

## 2. Code namespace

Version 1 uses `LPDDSSS`:

```text
LP DD SSS
   │  └── immutable reason sequence, 001–999
   └───── bounded-context domain, 01–99
```

The `LP` prefix identifies LivePilot. Domain ranges are stable and never reused:

| Domain | Range | Owner |
|---:|---|---|
| 01 | Identity and authentication | identity/tenancy |
| 02 | Tenant, session, and authorization scope | identity/tenancy |
| 03 | Validation and malformed requests | API governance |
| 04 | Resource, version, and idempotency conflict | domain owners |
| 05 | Policy and approval rejection | policy/control |
| 06 | Rate limits and quota | platform/SRE |
| 07 | Dependency, timeout, and provider failure | integration/SRE |
| 08 | Unknown, pending, and reconciliation state | execution/audit |
| 09 | Internal/unexpected failure | platform/SRE |
| 10 | Resource lifecycle and availability | domain owners |

Retired values are never reused. If the scheme changes, a new declared scheme version
is introduced without rewriting Version 1 codes.

## 3. Registry lifecycle

Each entry must define `code`, scheme version, domain, symbol, owner, HTTP status,
problem type, stable title, localization key, retry policy, exposure, lifecycle,
safe detail, and resolution guidance. Only `active` or `deprecated` entries with
`exposure: public` may appear in a public response.

`support_only` and `internal` entries may be logged and audited but must never leak
through HTTP, NATS, UI, or provider error text. Deprecated codes remain resolvable
indefinitely and may name a successor; they are never reassigned.

## 4. Public Problem Details

Every public HTTP error uses `application/problem+json`:

```json
{
  "type": "urn:livepilot:problem:resource-conflict",
  "title": "Resource state conflict",
  "status": 409,
  "detail": "The resource changed before this action completed.",
  "instance": "urn:livepilot:request:req_123",
  "code": "LP04001",
  "symbol": "RESOURCE_VERSION_CONFLICT",
  "message_key": "errors.resource.versionConflict",
  "request_id": "req_123",
  "correlation_id": "corr_123",
  "retry_policy": "never",
  "retry_after_seconds": null,
  "invalid_params": []
}
```

`detail` is safe neutral guidance only. Clients select user copy by `message_key`
and branch by `code`. `request_id` matches `X-Request-ID`; `correlation_id` matches
the end-to-end trace context. Raw provider, database, stack-trace, credential,
PII, and account-enumeration details are forbidden.

## 5. Retry semantics

| Policy | Meaning |
|---|---|
| `never` | Correct input/state or authorization; do not retry automatically |
| `retry` | Safe bounded retry may be attempted with the same idempotency key |
| `retry_after` | Retry only after the supplied delay and within the operation deadline |
| `reconcile` | Resolve requested/accepted/observed state before retrying |
| `request_new_credential` | Obtain a fresh approved credential/session |

Timeout is not success. Consequential operations with unknown outcomes use
`reconcile`, never blind retry.

## 6. Adoption requirements

An API operation is incomplete until its public errors are registered, linked to a
localization key, mapped in OpenAPI, tested for exposure and retry behavior, and
covered by an implementation/resolution reference. Registry validation is a release
gate and a missing mapping fails closed to a safe generic error.
