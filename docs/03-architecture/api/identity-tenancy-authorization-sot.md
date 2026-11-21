# Identity, Tenancy, and Authorization SOT

> **Status:** Production-readiness target; unresolved provider decisions block certification.
> **Consumers:** OpenAPI, internal routes, NATS context, audit, UI session boundary.

## Authority model

Identity is established by the approved OIDC provider. The server resolves tenant,
organization, workspace, campaign, live-session, actor, role, and capability scope.
Browser claims, route persona, and custom headers are never authority.

For the selected Hackathon demo, a test-only local authentication adapter may
establish the initial principal from seeded email/password accounts. It must be
enabled only in `simulated` or local mode, use Argon2id password hashes, create a
server-managed revocable session, and never be accepted as a production identity
provider. Production authentication remains OIDC-based.

## Required context

```text
principal_id → tenant_id → organization_id → workspace_id → campaign_id → live_session_id
```

Every consequential request must carry authenticated principal context, resolved
tenant scope, actor capability, session scope where applicable, correlation ID, and
the authorization decision revision. Missing or stale context fails closed.

## Authorization matrix

| Operation class | Required control |
|---|---|
| Read | Tenant membership + resource visibility |
| Recommend | Tenant/session scope + feature capability |
| Approve | Explicit approval capability + separation of duties |
| Mutate commerce state | Resource capability + policy verdict + idempotency |
| Pause/resume | Control-plane capability + reason + audit |
| Replay/reconcile | Operator capability + original lineage + new replay ID |
| Export evidence | Evidence capability + redaction policy |

## API requirements

- Define 401 for missing/invalid identity and 403 for authenticated but unauthorized actors.
- Do not expose whether an inaccessible resource exists; use the approved privacy policy.
- Propagate signed user context internally; re-authorize at the domain owner.
- Record actor, tenant, resource, capability, decision, policy revision, and correlation.

## Open decisions

OIDC provider, claim mapping, tenant authority, service identity, role/capability
registry, session expiry, token rotation, and operational owner remain `[NEEDS CLARIFICATION]`.
