# Threat Model: G-APPR-007

## Threat Surface Analysis
| Threat | Risk Level | Mitigation Strategy | Verification |
|---|---|---|---|
| Container breakout via root escalation | High | Unprivileged non-root user `nodejs:10001`, no-new-privileges | Dockerfile USER nodejs directive |
| Zombie process accumulation / PID leak | Medium | `dumb-init` PID 1 process supervision | Dockerfile ENTRYPOINT ["dumb-init", "--"] |
| Unauthorized public probe access | High | Bind to host loopback `127.0.0.1:8086` only; zero `0.0.0.0` binding | Deploy script `-p 127.0.0.1:8086:8086` |
| Bad deployment causing outage | High | Automated probe polling with fail-closed rollback to `:previous` | `digitalocean-approval-deploy.sh` rollback loop |
