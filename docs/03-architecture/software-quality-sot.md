# LivePilot OS — Software Quality SOT

> **Status:** Enterprise quality contract for simulated and production-bound software.
> **Technical baseline:** [technical-specifications-sot.md](technical-specifications-sot.md)
> **Verification authority:** [verification-architecture-guide.md](verification-architecture-guide.md)
> **Testing authority:** [testing-sot.md](testing-sot.md)

Simulation applies only to external side effects. It does not lower the quality bar:
the simulated system must use real validation, authorization, state transitions,
idempotency, timeout handling, reconciliation, audit, and visible mode labeling.

## Quality hierarchy

```text
Product acceptance
  → architecture and technical contracts
    → service/component behavior
      → adversarial and failure behavior
        → deployed journey and operational evidence
          → release decision and observation
```

## Non-negotiable quality laws

1. No false success: pending, rejected, failed, unknown, and simulated states remain explicit.
2. Contract-first: API, event, data, UI, and adapter contracts are versioned and owned.
3. Fail closed: missing authorization, evidence, policy, schema, or reconciliation blocks consequential state.
4. Deterministic replay: the same fixture, schema revision, and seed produce the same result.
5. Evidence over assertion: a green simulated test never certifies unavailable external services.
6. Accessibility and observability are correctness requirements.

## Quality dimensions

| Dimension | Required evidence |
|---|---|
| Functional | Happy, empty, rejected, failed, unknown, and recovery states |
| Contract | OpenAPI/event/data compatibility and ProblemDetails validation |
| Security | Auth, session scope, RLS, redaction, secret isolation, replay protection |
| Reliability | Timeout, retry, idempotency, DLQ, replay, reconciliation, graceful shutdown |
| Data | Integer money, atomic reservation, outbox, append-only audit, rebuild |
| UI | Five-state coverage, keyboard/screen-reader semantics, responsive behavior, simulation badges |
| Performance | Load evidence against declared SLO budgets |
| Operations | Traces, metrics, alerts, runbooks, deployment/rollback, DR |

## Simulated adapter contract

The simulator must implement the production-shaped adapter interface:

- explicit capability negotiation and unsupported results;
- same-key/same-fingerprint idempotency; mismatches return conflict;
- deterministic timeout and unknown-result injection;
- separation of requested, accepted, and observed state;
- reconciliation before retrying an unknown consequential action;
- no real credentials and a visible `SIMULATED PLATFORM` mode;
- audit records for command, result, mode, correlation, causation, and outcome.

## Required test layers

1. Unit/property tests for money, lifecycle guards, serializers, redaction, and invariants.
2. Contract tests for OpenAPI, events, headers, versions, errors, and compatibility.
3. Integration tests against real persistence/messaging/auth boundaries where available.
4. E2E tests for the selected flow, including approval and rejection with no hidden mutation.
5. Adversarial tests for stale sessions, unauthorized actors, duplicate commands, replay,
   out-of-order events, pause during dispatch, timeouts, unknown results, and outages.
6. Operational tests for load, shutdown, rollback, backup/restore, DLQ replay, and degraded mode.

## Release gates

| Gate | Pass condition | Failure result |
|---|---|---|
| Scope | Goal, requirements, owners, touch map, and out-of-scope behavior are explicit | Block review |
| Contract | Schemas, versions, errors, headers, and compatibility pass | Block release |
| Core behavior | Tests cover every consequential branch | Block review |
| Adversarial | Security, replay, pause, unknown, and failure cases pass | Block release |
| UX | Accessibility, responsive, state, and simulation-label checks pass | Block release |
| Operations | SLO, telemetry, alerts, runbooks, rollback, and DR evidence pass | Block production |
| Evidence | Receipt binds exact commit, file hashes, commands, and results | Mark unverified |

Verdicts are `PASS`, `PASS-SIMULATED`, `BLOCKED`, or `FAIL`. `PASS-SIMULATED`
certifies core software behavior only; it never certifies an unavailable platform.

## Required quality receipt

Every completed consequential goal or release records requirement/flow IDs, source
revision, contract hashes, commands and exit codes, test counts, security/accessibility/
performance results, waivers, unresolved `[NEEDS CLARIFICATION]` items, and final verdict.

## Required gate

```bash
node scripts/architecture/check-sot.mjs
```

This gate must pass before a goal reaches `review`.
