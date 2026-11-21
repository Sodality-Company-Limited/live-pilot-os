# LivePilot DigitalOcean infrastructure

This follows Aflovia's Droplet pattern: one Ubuntu 24.04 Droplet, Docker Compose, private loopback bindings, persistent named volumes, and root-owned secrets.

## Bootstrap a new Droplet

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

Only localhost ports are published. Application containers should join the `livepilot-infra` Docker network; public HTTP/TLS ingress should be added after the application contract and domain are known.
