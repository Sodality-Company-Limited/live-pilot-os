# Deployment Pipeline and Release Gates SOT

## Pipeline

`change → lint/typecheck → unit/integration/TDD → SOT/contract checks → security scan → build signed image → migration plan → staging deploy → health/smoke/observability → human approval → production deploy → post-deploy verification`.

## Gates

- No unresolved critical security finding, secret, schema incompatibility, or failed required test.
- Image digest, source revision, migration revision, configuration revision, and approver are recorded.
- Deploy uses expand/contract migrations; destructive schema changes require a separately approved change window.
- Staging proves readiness, critical user flow, queue behavior, adapter simulation, error budget signals, and rollback.
- Production uses a canary, blue/green, or two-node rolling strategy with drain and automatic stop conditions.

## Release receipt

Record environment, release ID, image digest, config/policy versions, operator, timestamps, health results, smoke results, alerts, and rollback decision. A green build without this receipt is not a verified release.
