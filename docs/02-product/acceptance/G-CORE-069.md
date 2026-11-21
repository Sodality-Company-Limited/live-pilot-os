# G-CORE-069 — Acceptance contract

- Goal: G-CORE-069
- Status: planned

## Scenario 1: bounded outcome
**Expected behavior:** The goal produces exactly its declared atomic outcome with durable, revision-bound evidence.

| Field | Value |
|---|---|
| Input | Valid contract-shaped, session-scoped input for the goal |
| Output | Typed committed result or explicit rejected/deferred/recovery state |
| Preconditions | Predecessor goals green; required authorization and dependencies available |

### Failure cases

| Case | Expected |
|---|---|
| Invalid, unauthorized, stale, duplicate, timeout, or unknown input | No false success; safe error/recovery evidence |

## Verification

- [ ] Automated: goal-specific tests plus SOT/contract/security checks
- [ ] Evidence: revision-bound receipt linked from the goal card

