# Configuration Change Audit SOT

Every configuration, flag, secret metadata, or policy change records: change ID, actor, role, reason, environment, before/after values with secret redaction, source revision, approval, effective time, expiry, rollout scope, validation result, rollback reference, and correlation ID.

Secret values are never included in diffs or logs. Emergency changes require a break-glass identity, time bound, post-hoc review, and automatic expiry. A change is not complete until the runtime reports the applied revision and health evidence.
