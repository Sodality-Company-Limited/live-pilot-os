# Threat Model: G-EXEC-008: Deployment Security

1. **Container Breakout:**
   - *Mitigation:* `--cap-drop ALL`, non-root user, `--read-only` rootfs with tmpfs for temporary writes.
2. **Secret Leakage via Environment Inspection:**
   - *Mitigation:* Production environment injected via protected `/etc/livepilot/execution-service.env`, never baked into images.
3. **Traffic Blackhole:**
   - *Mitigation:* Docker automated HEALTHCHECK monitors `/healthz` and halts traffic routing on probe failure.
