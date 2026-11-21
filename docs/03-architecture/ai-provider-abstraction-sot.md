# LivePilot OS — AI Provider Abstraction SOT

The domain layer depends on a provider-neutral `InferenceProvider` port. OpenAI is
the first implementation; a local deterministic fixture provider is required for
local development and contract tests.

## Port operations

`classify_intent`, `cluster_questions`, `assess_risk`, `draft_host_cue`, and
`propose_promotion` return the same versioned envelope regardless of provider.
Each envelope includes status, typed payload, evidence references, confidence,
provider/model revision, usage, and failure/defer information.

## Provider rules

- Providers cannot access domain databases directly.
- Providers cannot bypass JEV validation or deterministic policy services.
- Provider selection is configuration, not business logic.
- Provider outages fail closed for consequential proposals and degrade read-only
  guidance where safe.
- Local uses deterministic fixtures; production demo uses the same port with mock
  catalog/signals and a simulated marketplace adapter.

## Compatibility

Provider changes require schema compatibility, safety evaluation, cost/latency
evidence, prompt revision, rollback reference, and an audit receipt. No provider
change may alter margin, inventory, approval, idempotency, or reconciliation rules.
