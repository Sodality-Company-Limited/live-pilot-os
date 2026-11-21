# Execution Service DigitalOcean Droplet Release Runbook

Service: `execution-service` (Platform Adapter Safety)  
Target: DigitalOcean Droplets (Ubuntu 24.04 LTS, Docker Fleet)

## 1. Preflight Checklist
- [x] Schema migration applied (`execution` schema, RLS policies, optimistic locking trigger)
- [x] Environment configured via `/etc/livepilot/execution-service.env`
- [x] PostgreSQL 16 connection with SSL mode require
- [x] NATS JetStream cluster authenticated with mTLS workload credentials
- [x] Emergency pause subscription verified on `livepilot.v1.control.pause.request`

## 2. Deployment Procedure
```bash
# 1. Pull latest production image
docker pull registry.digitalocean.com/livepilot/execution-service:latest

# 2. Start container with hardened capabilities
docker run -d \
  --name execution-service \
  --restart unless-stopped \
  --network livepilot-net \
  --env-file /etc/livepilot/execution-service.env \
  --read-only \
  --tmpfs /tmp \
  --cap-drop ALL \
  -p 3004:3004 \
  registry.digitalocean.com/livepilot/execution-service:latest

# 3. Verify health probe
curl -f http://localhost:3004/healthz || exit 1
curl -f http://localhost:3004/readyz || exit 1
```

## 3. Rollback Runbook
In case of deployment healthcheck failure or unexpected crash loops:
```bash
docker stop execution-service
docker rm execution-service
docker run -d \
  --name execution-service \
  --restart unless-stopped \
  --network livepilot-net \
  --env-file /etc/livepilot/execution-service.env \
  -p 3004:3004 \
  registry.digitalocean.com/livepilot/execution-service:previous
```
