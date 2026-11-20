# Goal Generation Completeness Contract

> Use this contract to check generated Goals against the LivePilot OS Source of Truth before promoting them to `ready`.

## One Goal is complete when

- [ ] It cites one or more `REQ-LP-NNN` IDs and the exact source document/section behind them.
- [ ] It describes one atomic outcome and its user/business reason; implementation approach stays in `How`.
- [ ] It identifies actor, trigger, observable behavior, and relevant domain/event concepts.
- [ ] `In` and `Out` establish scope; dependencies and cross-goal handoffs are named.
- [ ] Acceptance criteria are observable and include relevant success, boundary, and failure/risk cases.
- [ ] Test/verification plan can prove or disprove every acceptance criterion.
- [ ] Touch map contains the real files/paths needed, or marks new paths as additions.
- [ ] Assumptions, unresolved decisions, simulated behavior, and external dependencies are explicit.
- [ ] No source requirement, threshold, platform capability, or user decision has been invented.

## The Goal set is complete when

- [ ] Every in-scope requirement maps to at least one Goal or has an explicit deferred/out-of-scope decision.
- [ ] Every generated Goal maps back to an approved requirement; there are no orphan Goals.
- [ ] Acceptance coverage across Goals covers each in-scope requirement, including stated invariants and failure handling.
- [ ] Shared event/data/API handoffs have an owner and a versioned contract or a documented open decision.
- [ ] Dependencies are explicit and acyclic; no required upstream Goal is missing.
- [ ] Overlapping Goals have a clear boundary and do not duplicate ownership of the same behavior.
- [ ] The baseline revision used for generation is recorded (Git commit or document revision).

## Fail-closed rules

- Missing source or requirement link: Goal remains `draft`/`planned`.
- Conflicting sources: record a conflict and wait for the owner decision; do not select silently.
- Requirement lacking acceptance detail: create a clarification item; do not generate a falsely “ready” Goal.
- Unsupported production/platform claim: mark it simulated or leave it as an open decision.

## Coverage table format

| Requirement ID | Scope decision | Goal IDs | Acceptance references | Coverage |
|---|---|---|---|---|
| `REQ-LP-001` | MVP / deferred / out | `G-...` | `AC-...` | covered / gap |

Before a Goal becomes `ready`, this table must have no in-scope `gap`, and the Goal must pass the standard Soda checks in [goal-spec-guide.md](../../06-workflows/goal-spec-guide.md) and [knowledge-governance.md](../../06-workflows/knowledge-governance.md).
