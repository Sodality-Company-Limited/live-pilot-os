# LivePilot OS — Service Provider Decision SOT

| Provider/service | Decision | Use | Gate |
|---|---|---|---|
| DigitalOcean | selected | production runtime bridge | backups, observability, restore, hardening |
| PostgreSQL | selected | durable domain/audit state | RLS, migrations, backup/restore |
| NATS JetStream | selected | events, jobs, replay, DLQ | durable consumer and replay evidence |
| Redis | selected | cache, dedup, rate-limit, coordination | never authoritative |
| OpenAI | selected candidate | JEV inference | provider adapter, privacy, schema/eval/cost gates |
| JEV | selected internal component | agent orchestration | runtime and safety SOT |
| Marketplace adapters | future adapters | marketplace mutation | official API, scopes, certification, sandbox evidence |
| Resend | optional candidate | transactional email | notification requirement and secret/retention review |
| S3-compatible object storage | required direction | audit/archive/backups | encryption, retention, restore proof |

No provider credential is production-ready merely because it exists. Each provider
requires owner, environment scope, data classification, secret rotation, timeout,
retry, spend, outage, and rollback decisions.
