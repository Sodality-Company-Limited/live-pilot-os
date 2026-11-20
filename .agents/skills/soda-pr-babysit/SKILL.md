---
name: soda-pr-babysit
description: Autonomous PR review comment triage, transient CI failure retry, and merge readiness verification. Use during SHIP phase or when babysitting active PRs to green landing.
---

# Soda PR Babysit & CI Autonomous Driver

Use this skill when monitoring open pull requests, triaging review feedback, handling transient CI flakiness, and driving branches to green merge readiness.

## Non-negotiables
1. **Zero Infinite Retries:** CI retries are strictly capped at `MAX_CI_RETRIES = 3`. Transient timeouts may be retried with exponential integer backoff; deterministic compiler or test assertion failures must never be retried without code remediation.
2. **Deterministic Triage Invariant:** Every review comment must map to exactly one disjoint category: `fix_required`, `dismiss_noise`, or `escalate_human`.
3. **No Direct Main Pushes:** Automated remediation must push solely to the dedicated `feature/G-xxx` branch. Direct mutations to `main` or `develop` fail closed.
4. **Exact Integer Arithmetic:** All backoff intervals, timestamps, and poll periods use exact integer arithmetic (`BigInt` / milliseconds) without floating-point representations.

## Babysit Lifecycle & FSM
```text
[PollingPR] ---> (review comment received) ---> [TriagingComments]
[TriagingComments] ---> (legitimate defect) ---> [FixingOnBranch]
[TriagingComments] ---> (bot nitpick/noise) ---> [DismissingWithReason]
[FixingOnBranch] ---> (commit & push) ---> [AwaitingCI]
[AwaitingCI] ---> (transient failure & attempts < 3) ---> [RetryingCI]
[AwaitingCI] ---> (green & approved) ---> [MergeReady]
```

## Driver Verification
Validate PR comments and CI status using the core driver:
```bash
node -e "import { triageReviewComments, evaluateCiStatus } from './scripts/lib/pr-babysit-driver.mjs'; console.log('PR Babysit Driver operational');"
```
