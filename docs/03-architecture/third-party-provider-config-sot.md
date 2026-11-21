# LivePilot OS — Third-Party Provider Configuration SOT

Secrets are stored in a secret manager or root-owned protected environment file and
never in Git, fixtures, prompts, browser payloads, or logs.

## Providers

| Provider | Use | Current mode |
|---|---|---|
| OpenAI | JEV inference | candidate production provider; server-side only |
| Marketplace adapters | marketplace actions | simulated for demo; production contracts TBD |
| Resend or equivalent | transactional notifications | optional until notification flow is enabled |
| DigitalOcean | production runtime substrate | active |

Each provider has an owner, environment scope, endpoint, secret names, rotation
interval, data classification, timeout/retry policy, spend limit, and rollback plan.
The sanitized templates in `infra/third-party/` are configuration examples only.

For the current two-environment pilot, local binds `AI_PROVIDER=fixture` and
`PLATFORM_ADAPTER_MODE=simulated`; DigitalOcean production binds
`AI_PROVIDER=openai` only through the JEV provider port while keeping the two demo
scenarios' frontend signal and backend product injection enabled. Production
marketplace and notification credentials remain disabled until their provider
gates are satisfied.

Provider credentials must be isolated per environment. Local development uses disabled
or fixture credentials; production uses separate approved credentials. No production
secret is copied into local development.
