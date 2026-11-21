# Identity and Session Service — DigitalOcean Release & Operations Runbook

## Service Identity
- **Service Name:** `identity-session-service`
- **Container Name:** `livepilot-identity-session`
- **Target Host:** DigitalOcean Single Droplet (Ubuntu 24.04 LTS / Docker Compose)
- **Port:** `3000` (Internal Docker network: `livepilot-infra`, private host binding `127.0.0.1:3000`)
- **Persistence Authority:** PostgreSQL schema `identity_session`

---

## Deployment Steps

1. **Build Container Image:**
   ```bash
   docker build -t livepilot/identity-session-service:latest code/services/identity-session-service/
   ```

2. **Verify Environment Variables:**
   Copy `infra/production/identity-session.env.example` to `infra/production/identity-session.env` and supply production credentials.

3. **Deploy Container via Docker Compose:**
   ```bash
   docker compose -f infra/docker-compose.yml up -d identity-session
   ```

4. **Verify Health Probes:**
   ```bash
   curl -f http://127.0.0.1:3000/health
   # Expected: {"status":"healthy","service":"identity-session-service",...}
   ```

5. **Rollback Procedure:**
   If health checks fail:
   ```bash
   docker compose -f infra/docker-compose.yml stop identity-session
   docker compose -f infra/docker-compose.yml up -d --no-build identity-session
   ```
