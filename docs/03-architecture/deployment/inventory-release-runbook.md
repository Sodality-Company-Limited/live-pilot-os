# DigitalOcean Droplet Release Runbook: Inventory Service

## 1. Droplet & Runtime Topology
- **Host:** LivePilot Production Droplet (`nyc3` / `sgp1`)
- **Container Name:** `livepilot-inventory-service`
- **Network:** `livepilot-backend-mesh`
- **Exposed Health Port:** `3005` (Internal Mesh only; not exposed to public internet)

## 2. Environment Variables Configuration
```bash
NODE_ENV=production
PORT=3005
DATABASE_URL=postgresql://inventory_app:secret@db.internal:5432/livepilot_inventory?sslmode=require
NATS_SERVERS=nats://nats.internal:4222
```

## 3. Database Migration Execution
```bash
docker exec -it livepilot-inventory-service psql $DATABASE_URL -f migrations/001_create_inventory_tables.up.sql
```

## 4. Verification and Smoke Test Command
```bash
curl -f http://localhost:3005/healthz
# Expected output: {"status":"healthy","service":"inventory-service",...}
```

## 5. Rollback Procedure
If smoke test fails:
1. Revert container image to previous tag:
   ```bash
   docker compose up -d --no-deps inventory-service
   ```
2. Run down migration if schema was altered:
   ```bash
   docker exec -it livepilot-inventory-service psql $DATABASE_URL -f migrations/001_create_inventory_tables.down.sql
   ```
