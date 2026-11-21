# Migration and Rollback Safety SOT

Rollback is a controlled state transition, not merely an image redeploy. Promotion
service releases must preserve authoritative PostgreSQL state, inbox/outbox lineage,
audit evidence, and unknown external outcomes.

## Expand/contract migration contract

Each release names the previous verified image/configuration, migration revision,
compatible schema range, and rollback runbook. Migrations are ordered as:

1. **Expand:** add nullable/versioned structures, indexes, or additive columns; deploy
   a release that can read and write both old and new representations.
2. **Migrate/backfill:** perform bounded, observable, resumable work with locks and
   timeouts appropriate to the production data set; record progress and receipt.
3. **Contract:** remove or make incompatible only after the compatibility window,
   consumer/schema evidence, and a separately approved change window are complete.

Destructive down migrations, implicit data loss, and automatic contract steps are
forbidden. A failed migration pauses release and preserves the prior image. Repair
   is forward-compatible where possible; restore is an approved recovery operation,
   never an automatic response to a failed probe.

## Pre-release migration evidence

The receipt includes migration file/revision hashes, generated plan, lock/timeout
settings, expected compatible schema range, apply result, row/checksum or invariant
checks, backfill progress, and operator/time. It also records the target backup ID
and restore-test proof. Migration success is not inferred from process startup alone.

## Rollback and pause procedure

Pause and fail closed when health, error rate, latency, saturation, queue/outbox age,
smoke, migration compatibility, backup/restore, or observability thresholds fail; when
the control-plane pause revision cannot be proven current; or when approval, policy,
inventory, idempotency, or adapter state is stale/unknown.

1. Stop admission of new consequential promotion work and mark the release paused.
2. Drain for at most 30 seconds; release uncommitted leases and finish only bounded
   audit appends. Do not acknowledge commands that cannot be durably handled.
3. Preserve inbox/outbox, audit, DLQ, migration, and reconciliation evidence.
4. Revert to the last verified image digest and compatible configuration/policy
   revision. Never substitute a mutable tag.
5. Keep the database at the compatible schema. Use an approved forward repair or
   restore only when the incident owner and recovery authorization are recorded.
6. Reconcile every `unknown` external outcome before replaying a mutation. No retry
   may turn missing confirmation into `issued`.
7. Re-run startup/readiness, smoke, queue, audit, and observability gates, then record
   the rollback decision, operator, timestamps, evidence, and follow-up migration.

## Rollback triggers and recovery evidence

Triggers include readiness false for two minutes, three liveness restarts in ten
minutes, dependency errors above 1% for five minutes, oldest outbox/DLQ item above 60
seconds, unknown outcomes above 1% for five minutes, smoke failure, schema mismatch,
pause/control-plane uncertainty, or any critical security/secret finding. CPU above
80% or memory above 85% for ten minutes is a capacity warning and becomes a trigger
when it threatens the release budget.

Recovery evidence links the failed and restored release IDs, image/config/schema
revisions, backup and restore IDs, health/smoke/alert snapshots, reconciliation
results, incident owner, and next action. PostgreSQL and required NATS stream state
are protected by encrypted, access-audited backups; Redis is reconstructable and is
never treated as authoritative backup. Restore proof records backup ID, target,
duration, row/checksum checks, and operator against the stated RPO/RTO.
