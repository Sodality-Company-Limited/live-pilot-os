# Domain Resource and State SOT

> **Status:** Canonical API-generation inventory; individual fields require schema approval.
> **Authority:** [live-pilot-os-domain-model.md](../live-pilot-os-domain-model.md)

Each resource has one owner, one authoritative writer, explicit state transitions,
optimistic versioning, and an audit lineage. API resources must not expose internal
database tables as an accidental contract.

| Resource | Owner | Minimum state model | Consequential transitions |
|---|---|---|---|
| Organization/workspace | identity/tenancy | active, suspended, archived | membership, scope change |
| Campaign | campaign service | draft, scheduled, live, paused, ended | schedule, pause, end |
| Live session | session service | scheduled, live, paused, ended | start, pause, resume, end |
| Product/SKU | catalog service | active, unavailable, archived | publish, unpublish |
| Inventory reservation | inventory service | requested, reserved, released, committed, expired, conflict | reserve, release, commit |
| Promotion/voucher | promotion-service (sole authoritative writer) | proposed, pending, approved, rejected, issued, unknown, expired, cancelled | propose, approve, issue-on-observation, reconcile, expire, cancel |
| Suggestion/alert | copilot/decision service | created, shown, accepted, edited, dismissed, expired | accept, edit, dismiss |
| Approval | approval-control service | requested, approved, rejected, expired, revoked | approve, reject, revoke |
| Platform action | execution service | requested, accepted, pending, succeeded, failed, unknown, reconciled | dispatch, retry, reconcile |
| Decision/audit receipt | audit service | appended, superseded, exported | append, correct, export |

Every mutation includes `resource_id`, `resource_version`, actor context, policy
revision, idempotency key, and correlation. Invalid transitions return a stable conflict
error and cannot partially mutate state.

Promotion-specific invariant: only `promotion-service` may mutate Promotion/Voucher state;
approval-control owns approval decisions, execution owns action observations, and inventory
owns reservations. Pending, stale, paused, unauthorized, duplicate-conflict, unavailable,
or unobserved inputs cannot transition to `issued`. A timeout or missing observation is
`unknown` and requires reconciliation before retry.

## Required schema fields

`id`, `tenant_id`, `created_at`, `updated_at`, `version`, `status`, `trace lineage`,
and domain-specific data. Money uses integer minor units; timestamps are UTC instants;
machine IDs and localized labels are separate.
