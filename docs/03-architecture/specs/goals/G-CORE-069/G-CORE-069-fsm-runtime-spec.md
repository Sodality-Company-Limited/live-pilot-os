# G-CORE-069 FSM Runtime Specification

Canonical lifecycle: RECEIVED → VALIDATED → PROCESSING → COMMITTED → PUBLISHED; REJECTED, DEFERRED, RECONCILIATION_REQUIRED, DRAINING, and ROLLED_BACK are explicit terminal or recovery outcomes where applicable. Invalid transitions, stale revisions, missing policy/evidence, dependency uncertainty, and failed health checks are rejected or held; they never become success.

