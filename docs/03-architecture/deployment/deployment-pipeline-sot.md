# Deployment Pipeline and Release Gates SOT

This SOT defines the Promotion service release evidence required before a DigitalOcean
production apply. It authorizes release preparation and verification; it does not
authorize an apply. A human approval boundary remains mandatory.

## Promotion release identity

Every candidate has one immutable `release_id` bound to all of the following:

| Evidence | Required value | Provenance rule |
|---|---|---|
| Source | commit SHA and repository/ref | captured from the checked-out revision; no uncommitted source |
| Image | registry reference and content digest | digest-pinned, signed/attested image; never a mutable tag at runtime |
| Schema | migration set/revision and compatible schema range | generated from reviewed migration files and applied receipt |
| Configuration | config/policy revision and non-secret hash | version-controlled, reviewed, environment-scoped; secrets are referenced, not copied |
| Contracts | API/NATS schema revisions and hashes | additive compatibility checked against consumers |

Rebuilding between environments is prohibited. The exact image digest, source SHA,
migration revision, configuration/policy revision, schema hashes, builder/toolchain
versions, and test receipt are recorded in the release manifest. Secrets must include
manager reference, version, owner, and expiry/rotation evidence only; secret values,
tokens, passwords, and provider payloads never enter the manifest, logs, artifacts, or
health responses.

## Pipeline and gates

`source review → lint/typecheck/unit/integration/TDD → SOT/API/error/security checks → build and sign immutable image → migration expand/contract validation → local production-shaped smoke → backup/restore evidence → health/readiness/observability evidence → release receipt → human approval → DigitalOcean apply → post-apply verification`.

The candidate is paused and the release is fail-closed when any required command,
contract check, security scan, image signature, migration check, backup/restore proof,
health probe, smoke test, or observability signal is missing or fails. A green build
alone is not a release. A release cannot claim success until post-apply evidence is
attached to the same `release_id`.

Promotion-specific pre-apply smoke must cover authorized proposal/approval flow,
idempotent duplicate handling, stale revision rejection, active pause rejection,
unknown/timeout preservation, outbox/JetStream behavior, and redacted audit receipt.
Simulation must be labeled and must not be represented as confirmed marketplace
issuance.

The runtime must use a canary, blue/green, or two-node rolling strategy where the
target topology supports it, with admission stop, bounded drain, and automatic stop
conditions. The current single-Droplet interim topology is explicitly a single point
of failure and requires a documented rollback reference.

## Health, smoke, and observability gates

Before traffic admission, capture `/internal/health/startup`, `/internal/health/live`,
and `/internal/health/ready` results for the release. Startup proves immutable config,
error-code registry, and compatible migrations; liveness only proves process response;
readiness proves PostgreSQL, NATS JetStream, and the current control-plane pause
snapshot are usable. Probe budgets are 60 seconds, 250 ms, and 250 ms respectively.

Smoke and post-apply evidence must include correlation/causation IDs, session and
actor-safe references, idempotency-key hash, release identity, safe error codes, queue
and outbox age, unknown outcomes, dependency errors, restarts, CPU/memory, and audit
append success. Redaction and bounded-cardinality checks are part of the gate.

## Release receipt and approval boundary

The release receipt records environment, release ID, source SHA, image digest and
signature, schema/migration and config/policy revisions, contract hashes, backup ID,
restore proof, operator, timestamps, health/smoke results, alert snapshot, rollback
reference, and approval decision. It must link the exact test and evidence artifacts.

Only an authorized human may approve production apply after reviewing the complete
receipt. The agent may prepare the receipt and command/runbook; it must not execute
DigitalOcean apply, approve on behalf of the operator, or expose credentials.
