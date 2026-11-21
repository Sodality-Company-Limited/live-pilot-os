# G-JEVC-009: DigitalOcean Deployment Architecture & Container Topology Specification

- Goal: `G-JEVC-009` (Prepare JEV/Copilot service for DigitalOcean)
- Service: `jev-copilot-service`
- Archetype: `backend-service / agent-runtime / copilot`
- Target Environment: DigitalOcean Ubuntu 24.04 LTS Droplet (`nyc3` / `sgp1`) via Docker Compose
- Container Image: `livepilot/jev-copilot-service:latest` (Multi-stage `node:22-alpine`)

## Container Topology & Network Boundary

```
                     ┌────────────────────────────────────────────────────────┐
                     │          DigitalOcean Droplet Host (Ubuntu 24)         │
                     │                                                        │
                     │    ┌──────────────────┐       ┌────────────────────┐   │
                     │    │  livepilot-nats  │       │ livepilot-postgres │   │
                     │    │  (port 4222)     │       │ (port 5432)        │   │
                     │    └─────────▲────────┘       └─────────▲──────────┘   │
                     │              │                          │              │
                     │              └────────────┬─────────────┘              │
                     │                           │ (livepilot-infra network)  │
                     │                           ▼                            │
                     │              ┌───────────────────────────┐             │
                     │              │ livepilot-jev-copilot     │             │
                     │              │  • Port: 8085 (127.0.0.1) │             │
                     │              │  • User: node (uid 1000)  │             │
                     │              │  • Init: dumb-init        │             │
                     │              │  • Probes: /healthz /readyz             │
                     │              └───────────────────────────┘             │
                     └────────────────────────────────────────────────────────┘
```

## Security & Isolation Invariants
1. **Non-Root Execution:** Container runs strictly as unprivileged `node` user (`uid=1000`, `gid=1000`) with `no-new-privileges:true`.
2. **Private Network Containment:** Attached exclusively to internal bridge network `livepilot-infra`; external access restricted to loopback `127.0.0.1:8085`.
3. **Process Supervision:** `dumb-init` runs as PID 1, properly reaping zombie processes and forwarding `SIGTERM` / `SIGINT` signals for graceful HTTP and NATS connection drainage.
4. **Zero Secrets in Image:** All credentials and API keys (`DATABASE_URL`, `NATS_TOKEN`, `OPENAI_API_KEY`, `GEMINI_API_KEY`) are dynamically injected via environment variables sourced from `/opt/live-pilot-os/infra/.env` (chmod 600).
