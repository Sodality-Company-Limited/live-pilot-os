# LivePilot third-party configuration

This directory contains LivePilot's non-secret provider bindings. It uses the
Aflovia template only as a layout reference; no Aflovia credentials, domains, or
production assumptions are copied.

The canonical decisions remain in:

- `docs/03-architecture/third-party-provider-config-sot.md`
- `docs/03-architecture/provider-decision-sot.md`
- `docs/03-architecture/openai-provider-sot.md`
- `docs/03-architecture/jev-agent-runtime-sot.md`
- `docs/03-architecture/demo-scenarios-sot.md`

`local.env.example` is fixture/simulated-only. `prod.env.example` deliberately
keeps the live-pilot demo in simulated mode: frontend signals and backend products
are mocked, while the production service topology remains active. Change
`AI_PROVIDER` to `openai` only after the OpenAI privacy, schema/evaluation, cost,
and outage gates are approved. Marketplace credentials remain disabled until an
official adapter contract, scopes, owner, sandbox evidence, and rollback plan are
approved.

Provider boundary rules:

- OpenAI is called only through JEV; it never receives raw viewer identifiers,
  credentials, authoritative inventory, or approval/execution authority.
- TikTok, Shopee, and Lazada are future adapter targets. The current demo uses the
  simulated adapter and does not claim production marketplace API support.
- Resend is optional and disabled by default until a notification requirement and
  retention/secret review exist.
- Every enabled provider needs an owner, environment scope, endpoint, secret names,
  rotation, data class, timeout/retry, spend limit, outage behavior, and rollback.

The production file belongs outside Git, for example:

```text
/opt/live-pilot-os/infra/third-party/prod.env
```

Set permissions to `600`, keep ownership with `root`, and rotate credentials on
ownership changes. The current demo keeps `PLATFORM_ADAPTER_MODE=simulated`; real
TikTok credentials are not required for the demo scenarios.
