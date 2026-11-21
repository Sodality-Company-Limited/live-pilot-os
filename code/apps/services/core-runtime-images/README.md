# Core Runtime Container Images Manifest

This directory defines canonical container topologies and specifications for all Core BFF and dependent microservices.

## Invariants
1. **Non-Root Execution:** All services run under isolated user `livepilot` (`UID:GID 10001:10001`).
2. **Alpine Base Images:** Minimized attack surface using lightweight Alpine Linux with `dumb-init` signal forwarding.
3. **Reproducibility:** Hermetic multi-stage builds eliminating compiler tools and devDependencies from final layers.

## Service Manifest
- `core-bff`: Port 4000
- `copilot-service`: Port 4002
- `promotion-orchestrator`: Port 4003
- `emergency-control-service`: Port 4004
- `audit-service`: Port 4005
- `identity-session-service`: Port 4006
- `adapter-safety-service`: Port 4007
- `f01-projection-service`: Port 4008
