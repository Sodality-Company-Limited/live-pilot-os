# LivePilot OS — AI Observability and Cost SOT

Every JEV/provider call emits privacy-safe telemetry with correlation ID, session ID,
scenario, operation, provider/model revision, prompt/schema revision, latency,
input/output token counts, estimated cost, retry count, result status, confidence,
and defer/error class.

Raw prompts, raw user messages, credentials, and provider secrets are not written to
logs. Evidence is linked by hashes and durable audit IDs.

## Controls

- per-request token and latency budgets;
- per-session and per-tenant concurrency limits;
- daily/monthly spend budgets with fail-closed admission;
- alerts for cost spikes, refusal spikes, latency, schema failures, and fallback rate;
- replayable evaluation receipts for both demo scenarios;
- redacted centralized logs and OpenTelemetry traces.

Cost or provider saturation must degrade to deterministic fixtures/read-only guidance,
not silently remove policy or audit controls.
