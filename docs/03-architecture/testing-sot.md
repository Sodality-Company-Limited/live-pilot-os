# LivePilot OS — Enterprise Testing SOT

> **Status:** Production-readiness target; test evidence is revision-bound.
> **Quality authority:** [software-quality-sot.md](software-quality-sot.md)
> **Technical authority:** [technical-specifications-sot.md](technical-specifications-sot.md)
> **API authority:** [api/README.md](api/README.md)
> **Testing skill:** [.agents/skills/soda-testing/SKILL.md](../../.agents/skills/soda-testing/SKILL.md)
> **TDD authority:** [testing/tdd-sot.md](testing/tdd-sot.md)

Testing proves behavior, contracts, safety invariants, and operational recovery. A
green unit suite is not a production claim. Every receipt identifies the exact
revision, SOT hashes, environment, commands, exit codes, fixtures, and limitations.

## 1. Test levels and ownership

| Level | Scope | Required evidence | Owner |
|---|---|---|---|
| Static/schema | OpenAPI, AsyncAPI/NATS, JSON Schema, migrations, types | Reproducible lint and compatibility output | API/platform |
| Unit/property | Domain rules, money, lifecycle, serializers, redaction | Deterministic cases and invariant/property results | Service owner |
| Component | UI states, accessibility, localization, error rendering | Keyboard, screen reader, visual, RTL/LTR evidence | UI owner |
| Contract | Producer/consumer HTTP, NATS, realtime envelopes | Version compatibility and negative cases | Boundary owners |
| Integration | Real DB, outbox, broker, auth, RLS, repositories | Transaction and failure evidence | Service/platform |
| E2E | Selected BRD/BDD journeys across six nodes | User outcome plus no-hidden-mutation proof | QA/release |
| Adversarial | Auth, replay, duplicate, stale, race, poison, outage | Failing-path and fail-closed evidence | Security/QA |
| Performance | Load, stress, soak, queue lag, realtime latency | SLO measurements and profiles | SRE |
| Operations/DR | Deploy, rollback, restart, backup/restore, DLQ replay | Runbook execution and RPO/RTO evidence | SRE |

## 2. Required coverage model

Every consequential requirement must map to:

```text
REQ → BDD → flow → operation/subject → test case → receipt
```

Every mutation must cover success, validation rejection, authorization rejection,
policy rejection, conflict, duplicate, timeout, unknown result, cancellation,
reconciliation, audit, localization, and recovery where applicable.

## 3. Simulation policy

Simulation may replace only unavailable external side effects. The core system uses
real validation, authorization, state transitions, idempotency, timeout classification,
lease fencing, reconciliation, audit, and visible `SIMULATED` mode. Test doubles must
be deterministic, contract-shaped, failure-injectable, and never certify provider
availability. `PASS-SIMULATED` is a valid core-software verdict but not production
platform evidence.

## 4. Mandatory API and messaging tests

- OpenAPI schema and operation examples validate against the error-code registry.
- 400/401/403/404/409/422/429/5xx ProblemDetails preserve code, message key,
  request/correlation IDs, retry policy, and safe redaction.
- Same idempotency key and fingerprint replay the original result; mismatched
  fingerprints conflict; unknown outcomes reconcile before retry.
- NATS duplicate delivery, out-of-order events, incompatible versions, ack timing,
  DLQ, replay authorization, and consumer restart are tested.
- Realtime reconnect, `Last-Event-ID`, bounded replay, sequence gaps, duplicate
  events, heartbeat, authorization expiry, and backpressure are tested.

## 5. Security and isolation tests

Test forged tenant/session headers, cross-tenant IDs, stale claims, privilege
escalation, replayed approvals, malformed signatures, secret leakage, PII leakage,
SQL/RLS bypass, rate-limit bypass, and error enumeration. All consequential commands
must fail closed when identity, scope, policy, evidence, or reconciliation is missing.

## 6. Performance and resilience gates

Load profiles must declare concurrency, message rate, payload size, tenant mix,
failure injection, warm-up, measurement window, and SLO thresholds. Measure API
latency, realtime delivery, queue age/lag, worker throughput, DB contention, retry
rate, DLQ depth, and resource saturation. Run worker loss, broker outage, DB failover,
dependency timeout, deploy rollback, and restore/replay scenarios.

## 7. Evidence receipt

Each review/release receipt contains commit SHA, SOT/schema hashes, environment, test
commands, exit codes, test counts, coverage by requirement/flow, defects and waivers,
security/accessibility/performance results, artifacts, and verdict:
`PASS`, `PASS-SIMULATED`, `BLOCKED`, or `FAIL`.

Missing evidence, flaky unexplained tests, unresolved waivers, or tests run against
an unrepresentative fake boundary block production certification.
