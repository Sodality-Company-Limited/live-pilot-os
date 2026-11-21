# LivePilot OS — Configuration and Policy SOT

> **Status:** Production-readiness target. Secrets are never stored in this repository.

This hierarchy separates four concerns: immutable build defaults, environment configuration, confidential secrets, and business policy. A feature flag is configuration with an explicit rollout owner and expiry; a business policy is versioned domain authority and must be evaluated server-side.

| Concern | SOT |
|---|---|
| Precedence, lifecycle, and controls | [configuration-policy-sot.md](configuration-policy-sot.md) |
| Environment variable registry | [environment-variable-registry.yaml](environment-variable-registry.yaml) |
| Feature flag registry | [feature-flag-registry.yaml](feature-flag-registry.yaml) |
| Business policy registry | [business-policy-registry.yaml](business-policy-registry.yaml) |
| Evaluation and precedence | [policy-evaluation-sot.md](policy-evaluation-sot.md) |
| Change audit and approvals | [configuration-change-audit-sot.md](configuration-change-audit-sot.md) |
| Third-party provider configuration | [../third-party-provider-config-sot.md](../third-party-provider-config-sot.md) |
| AI/JEV provider runtime | [../jev-agent-runtime-sot.md](../jev-agent-runtime-sot.md), [../openai-provider-sot.md](../openai-provider-sot.md) |
| Canonical SOT coverage | [../sot-coverage-index.md](../sot-coverage-index.md) |
