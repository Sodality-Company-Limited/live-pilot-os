# Identity, Tenancy, and Authorization SOT

> **Status:** Pilot contract frozen; named OIDC vendor remains a deployment decision.
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

## Frozen pilot contract

Production uses an external OIDC-compatible issuer configured by deployment
(`OIDC_ISSUER`, `OIDC_AUDIENCE`, and approved JWKS source). The issuer vendor is
intentionally not embedded in the API contract. A deployment cannot start in
production unless issuer, audience, JWKS refresh, owner, and rotation evidence are
present. Local and simulated pilot mode may use the seeded Argon2id adapter only.

| Contract | Frozen rule |
|---|---|
| Claims | `sub` is the immutable principal ID; `tenant_id`, `workspace_id`, and role/capability claims are accepted only after issuer/audience/signature validation and server-side membership lookup |
| Session | Browser receives a Secure, HttpOnly, SameSite=Lax opaque session cookie; raw OIDC tokens never reach browser JavaScript or API responses |
| TTL | Access assertion max 5 minutes; server session idle timeout 30 minutes and absolute timeout 8 hours; exact values are deployment policy and audited |
| Rotation | JWKS refresh on cache expiry and unknown key ID; key rollover accepts old/new keys only during bounded overlap |
| Service identity | mTLS/workload identity between internal nodes; user context is signed and re-authorized by each domain owner |
| Roles | `HOST`, `LIVE_OPS`, `AUDITOR`, `PLATFORM_OPERATOR`; capabilities are server-side registry entries, never browser-supplied |
| Failure | missing issuer/audience/signature/membership/capability fails closed; no resource-existence disclosure across tenant boundaries |
| Audit | login, logout, authorization decision, denial, token-key change, and privileged action record actor reference, tenant, policy revision, correlation, and result |

## Remaining deployment decision

Select and record the named OIDC vendor/owner in the production deployment SOT.
The API contract does not change when the vendor changes, provided this contract
and the issuer/audience/JWKS evidence remain valid.
