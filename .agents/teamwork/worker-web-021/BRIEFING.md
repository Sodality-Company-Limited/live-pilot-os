# Worker Briefing: G-WEB-021

## Objective
Implement Trusted Portal-to-Gateway Transport (`apps/web/src/lib/gateway-transport.ts`):
- Provides server-only trusted gateway request boundary forwarding requests from Portal BFF to KrakenD / Backend Microservices
- Preserves correlation and traceparent headers (`x-correlation-id`, `x-traceparent`, `x-tenant-id`, `x-session-id`, `x-role`)
- Strips untrusted/spoofed client headers and redacts credentials from outbound telemetry/logs
- Enforces strict timeout (default 3,000ms) with fail-closed timeout error handling
- Author test suite in `apps/web/tests/gateway.test.mjs` verifying: successful gateway forwarding; timeout handling; secret redaction; header stripping; and trace propagation.
