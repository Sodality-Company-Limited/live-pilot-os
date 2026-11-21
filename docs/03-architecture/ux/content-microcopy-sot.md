# LivePilot OS — Content and Microcopy SOT

> **Status:** Canonical user-facing language contract.

All labels, actions, warnings, confirmations, empty states, errors, pending/unknown
states, simulation badges, accessibility names, and support references use owned
message keys. Copy must state what happened, what is safe, and the next action without
claiming unconfirmed success.

Safety-critical, financial, approval, moderation, and irreversible-action copy requires
product and domain-owner review. Raw provider/database/stack-trace text never reaches
the user. Message keys must align with [error-codes.yaml](../api/error-codes.yaml)
and [localization-sot.md](../localization-sot.md).
