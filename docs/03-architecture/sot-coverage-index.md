# LivePilot OS — Canonical SOT Coverage Index

> **Status:** Canonical cross-cutting SOT registry.
> **Rule:** A design, implementation, deployment, or provider change must update the owning SOT first. `TBD` means the boundary is documented but not approved for live use.

## Authority hierarchy

```text
Product requirements
  → architecture overview
    → technical and technology stack SOTs
      → domain/service/API/event/data SOTs
        → provider/deployment/security SOTs
          → implementation and proof receipts
```

## Cross-cutting authorities

| Concern | Authority | Status |
|---|---|---|
| Architecture and boundaries | [overview.md](overview.md) | canonical |
| Technology choices | [technology-stack-sot.md](technology-stack-sot.md) | canonical |
| Service ownership/topology | [service-topology-sot.md](service-topology-sot.md) | canonical |
| Requirements | [live-pilot-os-requirements.md](live-pilot-os-requirements.md) | canonical |
| Demo scenarios | [demo-scenarios-sot.md](demo-scenarios-sot.md) | canonical |
| JEV runtime | [jev-agent-runtime-sot.md](jev-agent-runtime-sot.md) | canonical |
| AI provider abstraction | [ai-provider-abstraction-sot.md](ai-provider-abstraction-sot.md) | canonical |
| OpenAI provider | [openai-provider-sot.md](openai-provider-sot.md) | candidate/controlled |
| Prompt/context | [ai-context-prompt-sot.md](ai-context-prompt-sot.md) | canonical |
| AI safety/defer | [ai-safety-defer-sot.md](ai-safety-defer-sot.md) | canonical |
| AI observability/cost | [ai-observability-cost-sot.md](ai-observability-cost-sot.md) | canonical |
| Mock injection boundary | [mock-data-injection-sot.md](mock-data-injection-sot.md) | canonical |
| Data classification | [data-boundary-sot.md](data-boundary-sot.md) | canonical |
| Provider decisions | [provider-decision-sot.md](provider-decision-sot.md) | canonical |
| Third-party configuration | [third-party-provider-config-sot.md](third-party-provider-config-sot.md) | canonical |
| Deployment/runtime | [deployment/README.md](deployment/README.md) | canonical |
| Production readiness | [production-readiness-sot.md](production-readiness-sot.md) | canonical |
| Configuration/policy | [configuration/README.md](configuration/README.md) | canonical |
| API/events/data | [api/README.md](api/README.md) | canonical |
| Quality/testing | [software-quality-sot.md](software-quality-sot.md), [testing-sot.md](testing-sot.md) | canonical |

## Current decisions

- Environments: local development and DigitalOcean production only.
- Production runtime: production-shaped architecture; current demo uses explicit
  frontend signal injection, backend mock products, and a simulated marketplace adapter.
- JEV: internal governed orchestrator and recommendation boundary.
- OpenAI: replaceable server-side inference provider behind JEV.
- Durable truth: PostgreSQL; durable event/job transport: NATS JetStream; Redis is
  reconstructable coordination/cache.
- No ClickHouse, Kafka, OpenSearch, service mesh, or extra provider is approved without
  a measured need and decision record.

## Closure rule

The repository SOT check must pass, every changed contract must have an owner and
verification command, and every `TBD` provider/integration decision must remain
blocked from live mutation until evidence and approval exist.
