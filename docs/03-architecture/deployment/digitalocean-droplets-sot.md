# DigitalOcean Droplets Deployment Target SOT

This target is a constrained production runtime. It defines evidence and operational
controls for Promotion service release preparation; production apply remains a human-
approved, unexecuted boundary.

## Target topology

| Tier | Placement | Rule |
|---|---|---|
| edge | public Droplet or approved managed load balancer | TLS, WAF/rate limit, only public ingress |
| application | private Droplets, Docker Compose or equivalent supervisor | UI, BFFs, gateway, services, workers |
| data | private network; managed PostgreSQL/Redis preferred | never public; backups and encryption required |
| messaging | private NATS JetStream nodes or approved managed equivalent | no public client access; durable streams and DLQ |
| operations | private admin/bastion path | SSH keys only, MFA, audited access, no password login |

Minimum production target is two application Droplets across failure domains where available. The current single-Droplet deployment is an explicitly accepted production interim topology and must be labeled as a single point of failure until scaled out.

## Firewall and access

Allow only HTTPS from the internet, private east-west traffic on an explicit port matrix, and restricted administration from an approved operator network. PostgreSQL, NATS, Redis, Docker API, and SSH are never open to `0.0.0.0/0`.

## Droplet operational controls

- Provision with Terraform/OpenTofu or an equivalent reviewed declarative plan.
- Pin OS, container runtime, base images, and service images; patch on a defined cadence.
- Use systemd/Docker Compose with restart policies, resource limits, log rotation, and graceful drain.
- Store secrets outside Git with least privilege and rotation; root-readable files require strict permissions and an owner/expiry record.
- Ship logs and metrics off-host; local disk is not the only evidence store.
- Verify backups and restores before calling the target production-ready.

## Promotion service release evidence

`promotion-service` runs privately behind the edge/internal mesh as a dedicated
non-root process. It has no public listener or browser route. A DigitalOcean release
must bind one immutable release manifest to the image digest, source SHA, migration
revision/schema range, config/policy revision, NATS/API schema hashes, and secret
manager references. Runtime configuration is injected from the approved external
secret path with least privilege, rotation/expiry ownership, and version evidence;
values never appear in Git, images, Compose manifests, logs, metrics, traces, audit,
NATS envelopes, or probes.

Before human approval, the operator records:

- signed image and digest verification plus exact source/build provenance;
- expand/contract migration plan, compatibility result, backup ID, and restore proof;
- startup, liveness, and readiness results, including PostgreSQL, NATS JetStream,
  and control-plane pause status;
- promotion smoke evidence for authorization, idempotency, stale revision, pause,
  unknown outcome, outbox, and redacted audit paths;
- structured logs, metrics, traces, alert snapshot, queue age, restart count,
  dependency error rate, and release correlation identifiers;
- previous image/config/schema rollback references and the named operator/runbook.

The current single-Droplet interim topology must be labeled a single point of
failure. If two application Droplets are available, use a drain-aware rolling or
canary strategy across failure domains where possible. In either topology, failed
readiness removes the process from traffic and stops consequential work while
liveness may remain true during dependency recovery.

## Fail-closed and apply boundary

Do not admit or continue consequential promotion work when PostgreSQL or NATS is
unavailable, Redis coordination cannot be proven safe, the pause snapshot is stale or
missing, approval/policy/inventory is stale, or adapter confirmation is unknown.
Preserve durable inbox/outbox/audit/reconciliation evidence and use safe `pending` or
`unknown` outcomes. Do not infer issuance, approval, or recovery from a degraded read.

The release is paused and returned for repair on failed migration, health, smoke,
backup/restore, observability, contract, security, or rollback evidence. A human must
review the complete revision-bound receipt and explicitly approve DigitalOcean apply.
No agent or automated gate may execute that apply, use console-only drift, or claim
production success before post-apply verification.

## Explicit limitations

Droplets do not automatically provide Kubernetes scheduling, managed HA, multi-zone failover, or managed secret distribution. Capacity, failover, database HA, certificates, upgrades, and recovery are operator-owned until an approved managed service or Kubernetes decision supersedes this target.
