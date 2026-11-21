# intent-risk-service contract module

Owner: intent-risk-service.

The service owns session-scoped intent and moderation facts. It accepts only versioned, authenticated internal messages and publishes telemetry.intent.detected.v1, telemetry.intent.deferred.v1, telemetry.risk.detected.v1, and risk.severity.ranked.v1 after durable commit. Each envelope carries event, correlation, causation, schema, producer, idempotency, policy/model revision, evidence references, and SIMULATED mode where applicable.

Low confidence, unresolved product, missing policy/evidence, unsupported language, redaction failure, authorization failure, duplicate fingerprint conflict, timeout, and unknown outcome are explicit non-success states. Raw text and provider payloads are minimized or redacted. No public route or consequential commerce command is owned by this service.

