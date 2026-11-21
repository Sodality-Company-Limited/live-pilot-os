# LivePilot OS Demo Scenarios SOT

The production architecture is used for the demo. Mocking is limited to explicit
input and adapter boundaries:

- frontend injects deterministic live-session signals, chat, and telemetry;
- backend provides deterministic mock products and catalog economics;
- the platform adapter is simulated and cannot mutate a real marketplace.

The gateway, BFFs, domain services, policy checks, approvals, persistence, NATS
events, audit lineage, idempotency, and reconciliation paths remain production-shaped.

## Scenario 1: Opportunity

Frontend injects repeated product questions and increasing buying interest. Services
classify and aggregate the signal; the backend mock catalog returns product facts and
economics; decisioning proposes a discount; margin policy verifies it; Live Ops
approval is required before the simulated adapter issues mock state.

## Scenario 2: Threat

Frontend injects aggressive discount requests and/or off-platform risk. Services
preserve source evidence; backend mock economics drive deterministic policy; unsafe
discounts are blocked; no voucher is issued; a verified bundle may be proposed only
after its margin and stock checks pass.

## Configuration contract

```text
DEMO_MODE=true
DEMO_SCENARIO=opportunity|threat
FRONTEND_MOCK_SIGNALS=true
BACKEND_MOCK_PRODUCTS=true
PLATFORM_ADAPTER_MODE=simulated
```

These flags select demo inputs. They must not disable authorization, policy, audit,
idempotency, persistence, or failure/reconciliation behavior.
