# Backup, Restore, and Disaster Recovery SOT

## Protected data

PostgreSQL authoritative data, audit receipts, migration metadata, NATS stream state required for replay, configuration/policy versions, and deployment manifests are protected. Redis cache is reconstructable and is not a backup substitute.

## Controls

- Encrypted backups with retention, access audit, and immutable or append-only protection where available.
- Scheduled restore tests produce a proof receipt containing backup ID, restore target, duration, row/checksum checks, and operator.
- RPO/RTO are declared per environment; the current target is RPO ≤ 1 minute and an explicitly measured RTO, not an unverified promise.
- Recovery order: network/identity → PostgreSQL → NATS streams → configuration/policy → services/workers → edge → smoke and reconciliation.
- Fail closed on missing policy, stale authorization, or uncertain external state.
