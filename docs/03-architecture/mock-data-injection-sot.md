# LivePilot OS — Mock Data Injection SOT

## Allowed mock boundaries

1. Frontend injects deterministic demo chat, telemetry, viewer activity, and scenario events.
2. Backend mock catalog supplies product facts, price, cost, fee, stock, and bundle economics.
3. Platform adapter returns simulated requested/observed results.

## Forbidden shortcuts

- frontend cannot inject margin verdicts, approval results, inventory truth, or execution success;
- backend mock products cannot bypass catalog versioning or policy checks;
- a simulated adapter result cannot be labeled confirmed marketplace state;
- mocks cannot disable authentication, authorization, idempotency, audit, or reconciliation.

## Evidence

Every mock event carries `demo_mode`, `scenario_id`, `fixture_revision`, `source_kind`,
and correlation/causation IDs. Demo fixtures are versioned, deterministic, disposable,
and isolated from production customer data.
