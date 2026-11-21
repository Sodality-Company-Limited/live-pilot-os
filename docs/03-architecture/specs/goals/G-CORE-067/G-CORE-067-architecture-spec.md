# G-CORE-067 Architecture Specification

The persistence outcome remains inside the intent-risk-service bounded context. It consumes only versioned SOT contracts named by the goal, preserves service-owned state, and never bypasses authorization, idempotency, audit lineage, or fail-closed behavior.

Verification binds claims to exact source revision, contract/schema revision, environment, and reproducible command output.

