# API Data and Persistence Contract SOT

> **Status:** Required field-level authority for API schema generation.

API fields must map to an owned domain model, not directly to shared tables. Every
resource declares ID format, tenant scope, version/concurrency field, timestamps,
retention, PII class, and audit lineage.

Rules:

- Money is integer minor units with ISO 4217 currency and explicit scale.
- Persist UTC instants and IANA timezone IDs separately; local formatting is presentation.
- Use optimistic version checks for updates and atomic transactions for reservations,
  approvals, policy verdicts, and consequential actions.
- PostgreSQL is authoritative; Redis and projections are reconstructable.
- Outbox publication occurs after the owning transaction commits.
- Deletion, retention, export, and correction append evidence and never erase required
  audit lineage without an approved legal-retention policy.
