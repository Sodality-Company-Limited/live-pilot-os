# G-JEVC-004 Architecture Specification

## Selected boundary
Define the provider-neutral JEV inference adapter for `jev-copilot-service`. This component acts as the hexagonal outbound port and infrastructure boundary between governed business suggestions and external LLM/AI model providers (Gemini, OpenAI, Anthropic). It enforces strict token budgets, microsecond timeout ceilings, schema validation, calibrated confidence gates (0-10000 bps), zero-float integer token cost accounting, and degraded fail-closed state propagation.

## Architecture & Data Flow
1. **Driving Ports (Inbound):**
   - Context aggregation pipeline triggers suggestion requests for an active live stream session.
2. **Hexagonal Outbound Ports (Driven):**
   - `InferenceProviderInterface`: Provider abstraction implemented by `OpenAiProvider` and `GeminiProvider`.
   - `InferenceAdapter`: Central governance engine orchestrating prompt dispatch, timeouts, validation, and cost calculations.
   - Degraded alert event emitter: Notifies system supervisors when a provider times out or fails.
3. **Receipt & Audit Trail:**
   - Every inference call generates an immutable `jev_provider_receipt` recording prompt template ID, model version, exact token usage, latency in ms, integer cost minor (USD scale 6), and SHA-256 digests of raw inputs and outputs.

## Rejected alternatives
- Direct ad-hoc API calls inside business handlers: Rejected because it leaks provider-specific schemas, prevents unified retry/circuit-breaking, and risks floating-point cost corruption.
- Floating-point cost accounting: Rejected per Article V Zero-Float Invariant. All costs are represented as `(cost_minor: BigInt, cost_currency: 'USD', cost_scale: 6)`.
- Silent fallback to ungrounded LLM hallucinations: Rejected. Missing or invalid evidence refs immediately trigger fail-closed `refused` outcomes and degraded state alerts.

## Verification
- Unit test suite: `node code/services/jev-copilot-service/test/provider.test.mjs`
- SOT traceability and contract verification gates.
