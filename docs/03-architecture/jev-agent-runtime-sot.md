# LivePilot OS — JEV Agent Runtime SOT

> **Status:** Canonical production architecture for agentic decisioning.
> **Role:** JEV is the governed orchestration layer; it is not the source of truth for money, stock, approval, or execution.

## Responsibility

JEV receives normalized live-session signals and verified catalog facts, assembles
bounded context, invokes an approved model provider, validates the typed result, and
returns a recommendation or deferral. JEV may propose; deterministic services decide.

## Required flow

```text
signal → normalize → context policy → JEV → typed proposal
      → confidence/grounding gate → margin/risk/stock policy
      → operator approval → execution adapter → audit/reconciliation
```

JEV must never directly mutate PostgreSQL authoritative aggregates, inventory,
voucher state, marketplace state, or approval state. Consequential actions are
commands owned by domain services and require authorization and idempotency.

## Inputs and outputs

Inputs include `session_id`, tenant/actor scope, correlation/causation IDs, normalized
signals, approved catalog facts, current policy revision, and an explicit scenario.
Outputs are versioned `IntentProposal`, `RiskAssessment`, `HostCue`, or
`PromotionProposal` objects with evidence references, confidence, defer reason, model
provider/version, prompt revision, and expiry. Unknown, refused, stale, or malformed
results become `deferred` and cannot be treated as approval.

## Tool boundary

JEV may call read-only catalog, telemetry, policy-preview, and evidence tools. It may
not call voucher issuance, stock reservation, payment, marketplace mutation, or
approval tools. Those are invoked only by deterministic services after policy and
human-control gates.

## Reliability

JEV requests have bounded input size, timeout, token budget, concurrency, retry count,
and queue age. Retries require a stable idempotency key. Provider failure enters a
visible degraded mode; it never silently fabricates a recommendation.

## Audit

Every invocation records provider, model, prompt/schema revision, input hash,
output/refusal hash, latency, token usage, cost estimate, confidence, policy result,
and final action lineage. Secrets, raw credentials, and unnecessary PII are excluded.
