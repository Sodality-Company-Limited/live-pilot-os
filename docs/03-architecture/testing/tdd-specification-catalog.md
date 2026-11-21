# TDD Specification Catalog

> **Status:** Required inventory before implementation.
> **Traceability:** `REQ → BDD → flow → API/subject → TDD → test → receipt`

## TDD record template

| Field | Required content |
|---|---|
| TDD ID | Stable `TDD-LP-NNN` |
| Requirement | `REQ-LP-NNN` |
| BDD scenario | Feature/scenario reference |
| Flow | Detailed flow ID |
| Boundary | API operation, NATS subject, job, or UI event |
| Owner | Module/service and test owner |
| Behavior | One observable behavior |
| Preconditions | Auth, tenant, state, fixture, clock, seed |
| Input | Request/message/command |
| Expected | Result, state, event, audit, and error code |
| Invariants | IDs from `tdd-invariants.yaml` |
| Failure cases | Negative and recovery branches |
| Seams | Approved dependency replacement points |
| Test path | Exact test file/name |
| Evidence | Command, exit code, receipt/artifact |

## Required behavior classes

Each consequential operation needs TDD coverage for valid input, invalid input,
unauthorized actor, wrong tenant, stale version, duplicate command, policy rejection,
timeout, unknown result, cancellation, reconciliation, audit, localization, and
recovery where applicable.

No implementation goal is ready for review until its catalog records are complete.

## Required test-specification classes

Each applicable class must be represented by a catalog record:

```text
FE-COMPONENT  frontend state, localization, RTL, and accessibility
BE-SERVICE    backend handler, domain, authorization, and error behavior
UNIT-PROPERTY deterministic unit tests and invariants
SMOKE         minimal deploy/readiness/critical-path gate
INTEGRATION   real database, auth, broker, and adapter-port behavior
MICROSERVICE  producer/consumer, delivery, ordering, retry, DLQ, replay
SECURITY      identity, tenant, privilege, injection, secret, PII, abuse
STRESS        load, saturation, backpressure, failure injection, recovery
```

Each record must add `test_class`, `environment`, `fixture_version`, `entry_command`,
`exit_criteria`, and `evidence_artifact`. Missing classes require an explicit
not-applicable rationale and reviewer.
