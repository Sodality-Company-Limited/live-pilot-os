# Architecture Spec: G-AUDI-004
Audit receipts transition through received -> validated -> redacted -> hashed -> committed. Redaction must strip tokens, credentials, and raw PII before persistence.
