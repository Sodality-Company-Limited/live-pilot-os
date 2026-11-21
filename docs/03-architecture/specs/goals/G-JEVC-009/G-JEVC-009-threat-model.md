# G-JEVC-009: DigitalOcean Infrastructure Threat Model & Mitigation Matrix

- Goal: `G-JEVC-009` (Prepare JEV/Copilot service for DigitalOcean)
- Service: `jev-copilot-service`

## Threat Matrix & Defense-in-Depth Defenses

| Threat Vector | Severity | Mitigation Mechanism | Verification Proof |
|---|---|---|---|
| **Container Escape / Privilege Escalation** | Critical | Run as unprivileged `node` user (`uid=1000`), `no-new-privileges:true`, and minimal Alpine base image. | `id -un` returns `node` in container. |
| **Unauthorized Ingress / Port Sniffing** | High | Port 8085 bound to loopback `127.0.0.1:8085` only; zero public `0.0.0.0` port bindings. | `docker port` verifies 127.0.0.1 binding only. |
| **Secret Exfiltration from Image Layers** | Critical | Multi-stage build copies only application code; zero `.env` or credential files copied into Docker layers. | Image scan verifies absence of tokens. |
| **Zombie Process Accumulation & Signal Drop** | Medium | `dumb-init` runs as PID 1 to properly reap child processes and propagate OS signals. | Process tree verification shows `dumb-init` as PID 1. |
| **Silent Container Hang / Unresponsive Inference** | High | Healthcheck probes `/healthz` every 10s with 3 retries; Docker daemon automatically marks container unhealthy. | Docker status shows `(healthy)` or restarts container. |
