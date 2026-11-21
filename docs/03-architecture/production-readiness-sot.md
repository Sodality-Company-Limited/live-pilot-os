# LivePilot OS — Production Readiness SOT

Production means the runtime is deployable and controlled, not that marketplace
mutation is enabled. The current demo remains simulated at the adapter boundary.

## Required gates

- SOT and API/event coverage passes;
- signed/pinned images and configuration revision are recorded;
- auth, tenant/session scope, RLS, idempotency, and secret checks pass;
- PostgreSQL/NATS backup and restore evidence exists;
- OpenTelemetry traces, metrics, logs, alerts, and cost telemetry are available;
- opportunity and threat scenario smoke tests pass;
- provider outage, refusal, timeout, unknown outcome, duplicate delivery, and pause tests pass;
- rollback command and previous image/config/schema references are recorded;
- production apply has explicit human approval.

Until all gates pass, the DigitalOcean deployment is an active production bridge but
not a production-readiness certification.
