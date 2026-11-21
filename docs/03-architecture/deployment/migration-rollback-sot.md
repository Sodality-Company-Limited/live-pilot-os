# Migration and Rollback Safety SOT

Rollback is a controlled state transition, not merely an image redeploy.

1. Stop promotion when health, error, latency, saturation, queue age, or smoke thresholds fail.
2. Drain new consequential work; preserve audit and reconciliation.
3. Revert to the last verified image/configuration revision.
4. Never automatically run a destructive database down migration. Use forward-compatible repair or an approved restore.
5. Reconcile unknown external outcomes before replaying mutations.
6. Record incident, evidence, owner, and follow-up migration.

Every release must name its previous image, compatible schema range, config/policy rollback version, and operator command/runbook.
