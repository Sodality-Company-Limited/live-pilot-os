# G-CORE-097: Threat Model

| Threat | Boundary | Mitigation |
|---|---|---|
| secret exposure | config/log/image | secret binding, redaction, scans |
| public dependency exposure | network/gateway | private network and allow-list |
| unhealthy admission | runtime | startup/liveness/readiness probes |
| supply-chain drift | image/CI | pinned build, digest, scan |
| unsafe rollback | release | tested rollback and recovery evidence |
