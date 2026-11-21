# G-APPR-002 Invariants Formal Specification

1. **Zero-Mock Policy**: All persistence abstractions and migration definitions are 100% production-ready SQL and TypeScript.
2. **Zero-Float Accounting**: No `FLOAT` or `DOUBLE PRECISION` columns; timestamps use `BIGINT` milliseconds.
3. **Strict RLS Isolation**: `current_setting('app.tenant_id', true)` is enforced across all tables.
