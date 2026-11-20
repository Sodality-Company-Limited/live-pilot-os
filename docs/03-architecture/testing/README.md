# LivePilot OS — Testing and TDD SOT Index

> **Status:** Canonical index for enterprise testing and test-first specification.
> **Parent:** [Architecture overview](../overview.md)
> **Quality:** [software-quality-sot.md](../software-quality-sot.md)

Read this index before generating test plans, TDD records, contract tests, or release
evidence. Testing SOT defines verification scope; TDD SOT defines test-first behavior
and implementation evidence.

| Authority | Purpose |
|---|---|
| [Testing SOT](../testing-sot.md) | Test levels, simulation policy, security, performance, evidence |
| [TDD SOT](tdd-sot.md) | Red/green/refactor lifecycle and implementation rules |
| [TDD specification catalog](tdd-specification-catalog.md) | Test record schema and required test classes |
| [TDD invariants](tdd-invariants.yaml) | Machine-readable safety and domain invariants |
| [Test seams and fixtures](test-seams-and-fixtures-sot.md) | Deterministic dependencies and fixture boundaries |
| [Coverage and mutation policy](coverage-and-mutation-policy.yaml) | Required quality thresholds and waiver rules |
| [TDD evidence schema](tdd-evidence.schema.json) | Revision-bound evidence receipt shape |
| [UI test specification](../ux/ui-test-specification-sot.md) | Frontend, visual, accessibility, locale, and realtime UI tests |
| [API operation catalog](../api/api-operation-catalog-sot.md) | API behavior source for contract tests |

Generation order:

```text
REQ/BDD/flow → API/UI/domain contract → TDD record → failing test
  → implementation → integration/contract/E2E/security/stress tests → receipt
```
