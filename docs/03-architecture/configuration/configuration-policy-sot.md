# Configuration and Policy Lifecycle SOT

## Configuration classes

| Class | Examples | Source | Runtime mutation |
|---|---|---|---|
| build default | timeout, port, schema version | code/review | no |
| environment config | URLs, limits, mode, region | registry + deployment environment | controlled restart/reload |
| secret | tokens, keys, passwords | secret manager or protected env file | rotation protocol |
| feature flag | staged capability, kill switch | flag registry/service | audited, bounded |
| business policy | margin, approval, inventory rules | policy registry/service | versioned approval |

Precedence is `safe build default < checked-in non-secret registry < environment binding < approved runtime flag/policy`. A lower-precedence source cannot override a higher-precedence safety constraint. Empty, unknown, or invalid values fail closed.

## Local → DigitalOcean binding

Local uses `.env.local` from an ignored template and simulated adapters. DigitalOcean staging and production bind the same keys through separate environment scopes, secret sources, and policy revisions. No environment copies a production secret into local or staging.

Every value has an owner, type, validation rule, sensitivity, reload behavior, and rotation/expiry expectation. Configuration changes are reviewed and auditable.
