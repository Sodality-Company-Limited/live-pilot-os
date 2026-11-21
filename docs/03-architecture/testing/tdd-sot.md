# LivePilot OS — Test-Driven Development SOT

> **Status:** Enterprise implementation contract; TDD evidence is revision-bound.
> **Parent:** [testing-sot.md](../testing-sot.md)
> **Inputs:** BRD, BDD, API SOTs, domain/state SOTs, and flow SOTs.

TDD converts approved behavior into executable implementation evidence. BDD defines
user-visible behavior; API SOTs define boundaries; TDD defines the smallest verified
unit of implementation and its invariants.

## TDD cycle

```text
trace requirement/BDD/API behavior
  → write a focused failing test
    → verify the failure is meaningful
      → implement the smallest behavior
        → pass focused test
          → run broader contract/integration tests
            → refactor without behavior change
              → record evidence receipt
```

A test that passes before the implementation change is not Red evidence. A skipped,
flaky, or mock-only test cannot certify a production boundary.

## Required TDD record

Every behavior requires a TDD catalog entry containing `tdd_id`, requirement/BDD/flow
IDs, API operation or subject, module/service, behavior, preconditions, input/output,
state transition, invariants, failure cases, allowed seams, fixture, test path,
implementation scope, and verification command.

## Mandatory test-specification coverage

Every API or domain behavior must declare applicable coverage across this matrix. If
a layer is not applicable, the TDD record must state why and name the accepting reviewer.

| Test layer | Required coverage | Minimum evidence | Owner |
|---|---|---|---|
| Frontend/component | UI states, localization, RTL, keyboard, screen reader | Component, accessibility, visual/interaction results | Frontend |
| Backend/service | handlers, validation, authorization, state, errors, idempotency, audit | Service and boundary tests | Backend |
| Unit/property | domain rules, money, policies, serializers, invariants | Deterministic/property results | Service owner |
| Smoke | health, readiness, auth, critical read/mutation/event path | Post-build/deploy gate | QA/SRE |
| Integration | BFF/gateway, DB/RLS, outbox, NATS, auth, adapter ports | Real boundary evidence | Platform/service |
| Microservices | producer/consumer, ack, ordering, duplicates, DLQ, replay | Compatibility/failure tests | Service/platform |
| Security | tenant isolation, privilege, replay, injection, secrets, PII, rate limits | Threat-case results | Security |
| Stress/load | concurrency, saturation, queue lag, backpressure, failure/recovery | Profile, p95/p99, resource results | SRE |

No layer substitutes for another: smoke proves deployability, unit proves local
behavior, integration proves boundaries, and stress/security proves operational safety.

## Rules

- Test behavior and invariants, not private implementation details.
- Keep one authoritative test owner per behavior; do not duplicate assertions across layers without a purpose.
- Use real domain validation, authorization, lifecycle, idempotency, persistence, and audit logic.
- Simulate only unavailable external side effects with deterministic contract-shaped adapters.
- Make time, IDs, randomness, and failure injection deterministic and explicit.
- Refactoring may not weaken coverage, invariants, evidence, or boundary contracts.
- A failing test, unresolved coverage gap, or unexplained flaky test blocks review.
