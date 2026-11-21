# LivePilot DigitalOcean infrastructure

This follows Aflovia's Droplet pattern, constrained by the LivePilot deployment SOT: local development runs on the workstation and the production runtime runs on one Ubuntu 24.04 DigitalOcean Droplet, using Docker Compose, private loopback bindings, persistent named volumes, and root-owned secrets. Marketplace actions remain explicitly `SIMULATED` until separately approved.

The SOT-authoritative durable state is PostgreSQL plus NATS JetStream. Redis is reconstructable cache/coordination only. ClickHouse is intentionally excluded until an approved architecture decision exists.

## Local development

```bash
cp infra/.env.local.example infra/.env.local
chmod 600 infra/.env.local
./infra/local-up.sh
```

## Bootstrap the DigitalOcean production Droplet

```bash
scp infra/provision-ubuntu24.sh root@$LIVEPILOT_SSH_HOST:/root/
ssh root@$LIVEPILOT_SSH_HOST 'bash /root/provision-ubuntu24.sh'
```

## Deploy the shared foundation

```bash
cp infra/.env.example infra/.env
# replace every REPLACE_WITH value with random secrets (32+ characters)
chmod 600 infra/.env
LIVEPILOT_SSH_HOST=<droplet-ip> ./infra/deploy.sh deploy
LIVEPILOT_SSH_HOST=<droplet-ip> ./infra/deploy.sh status
```

Only localhost ports are published. Application containers should join the `livepilot-infra` Docker network; public HTTP/TLS ingress should be added only through an approved edge service. PostgreSQL and NATS backups/restore verification are still required for the production environment.
