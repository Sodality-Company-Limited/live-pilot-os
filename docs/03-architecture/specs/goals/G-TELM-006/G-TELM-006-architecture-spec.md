# Architecture Spec: G-TELM-006
Signals encountering transient persistence errors must be retried with exponential backoff (max 5 attempts) before routing to `livepilot.v1.telemetry.signal.dlq`.
