# DigitalOcean Droplets Deployment Target SOT

## Target topology

| Tier | Placement | Rule |
|---|---|---|
| edge | public Droplet or approved managed load balancer | TLS, WAF/rate limit, only public ingress |
| application | private Droplets, Docker Compose or equivalent supervisor | UI, BFFs, gateway, services, workers |
| data | private network; managed PostgreSQL/Redis preferred | never public; backups and encryption required |
| messaging | private NATS JetStream nodes or approved managed equivalent | no public client access; durable streams and DLQ |
| operations | private admin/bastion path | SSH keys only, MFA, audited access, no password login |

Minimum production target is two application Droplets across failure domains where available. A single Droplet is staging/demo only and must be labeled as a single point of failure.

## Firewall and access

Allow only HTTPS from the internet, private east-west traffic on an explicit port matrix, and restricted administration from an approved operator network. PostgreSQL, NATS, Redis, Docker API, and SSH are never open to `0.0.0.0/0`.

## Droplet operational controls

- Provision with Terraform/OpenTofu or an equivalent reviewed declarative plan.
- Pin OS, container runtime, base images, and service images; patch on a defined cadence.
- Use systemd/Docker Compose with restart policies, resource limits, log rotation, and graceful drain.
- Store secrets outside Git with least privilege and rotation; root-readable files require strict permissions and an owner/expiry record.
- Ship logs and metrics off-host; local disk is not the only evidence store.
- Verify backups and restores before calling the target production-ready.

## Explicit limitations

Droplets do not automatically provide Kubernetes scheduling, managed HA, multi-zone failover, or managed secret distribution. Capacity, failover, database HA, certificates, upgrades, and recovery are operator-owned until an approved managed service or Kubernetes decision supersedes this target.
