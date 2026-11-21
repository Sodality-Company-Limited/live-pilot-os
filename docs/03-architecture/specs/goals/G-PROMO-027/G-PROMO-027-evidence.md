# G-PROMO-027 Evidence

- revision: b8bb7010ccb4aef3bedb852b13b148250edc0eca
- status: BLOCKED
- policy: PostgreSQL and deployment evidence are mandatory; skipped checks fail closed.

| Check | Status | Detail |
|---|---|---|
| error-code-registry | PASS | Error-code registry check: PASS (26 registered codes) |
| api-sot-traceability | PASS | API SOT traceability: PASS (12 authorities present; operation catalog fields complete) |
| architecture-sot | PASS | SOT hierarchy check: PASS (0 error(s), 0 warning(s)) |
| tdd-traceability | PASS | TDD traceability check: PASS (6 authorities present; catalog complete) |
| goal-conformance | PASS | ================================================================================ |
| architecture-conformance | PASS | ================================================================================ |
| promotion-typecheck | PASS | exit 0 |
| promotion-build | PASS | exit 0 |
| promotion-tests | PASS | ℹ duration_ms 441.927791 |
| security-redaction | PASS | ℹ duration_ms 172.97125 |
| git-diff-check | PASS | exit 0 |
| postgresql-live-check | BLOCKED | PostgreSQL check was skipped: PROMOTION_POSTGRES_CHECK_COMMAND is not set |
| postgres-evidence | BLOCKED | PROMOTION_POSTGRES_EVIDENCE is not set |
| deployment-evidence | BLOCKED | PROMOTION_DEPLOYMENT_EVIDENCE is not set |

## Blockers

- postgresql-live-check: PostgreSQL check was skipped: PROMOTION_POSTGRES_CHECK_COMMAND is not set
- postgres-evidence: PROMOTION_POSTGRES_EVIDENCE is not set
- deployment-evidence: PROMOTION_DEPLOYMENT_EVIDENCE is not set

