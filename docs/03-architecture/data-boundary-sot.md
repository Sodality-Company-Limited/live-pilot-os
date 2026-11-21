# LivePilot OS — Data Boundary and Provider Privacy SOT

## Classification

| Data | Allowed destination |
|---|---|
| Public/product facts | JEV provider after catalog approval |
| Aggregated live signals | JEV provider after minimization |
| Raw viewer identifiers | internal services only unless explicitly required and redacted |
| COGS and margin inputs | internal policy services; never sent to marketplace or browser unnecessarily |
| Credentials/tokens | adapter secret boundary only |
| Audit receipts | PostgreSQL/object archive; provider receives hashes/IDs, not secrets |

Provider requests are minimized, redacted, bounded, and attributable to a tenant,
session, purpose, and retention policy. Raw prompts and provider responses are not
logged by default. Data-processing, retention, regional processing, and deletion
decisions are recorded before customer data leaves the production boundary.
