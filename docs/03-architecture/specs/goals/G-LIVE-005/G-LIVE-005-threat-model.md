# G-LIVE-005 threat model

Threats: forged browser claims, tenant breakout, replay, duplicate delivery, stale writer, outbox loss, poison message, timeout ambiguity, secret leakage, and unsafe deployment. Controls: server authorization, RLS, idempotency fingerprint, optimistic locking, durable outbox/inbox, bounded retry/DLQ, reconciliation, redaction, health, and rollback gates.

