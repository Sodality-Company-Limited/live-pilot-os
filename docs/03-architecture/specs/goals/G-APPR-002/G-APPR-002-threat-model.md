# G-APPR-002 Threat Model

- **Threat 1: Cross-Tenant Data Leakage**
  - *Mitigation*: Forced RLS on all tables with restrictive tenant policies.
- **Threat 2: Concurrent Mutation Race Conditions**
  - *Mitigation*: Monotonic version increment trigger on `approval_requests`.
- **Threat 3: Decision Tampering**
  - *Mitigation*: Immutability trigger rejecting UPDATE/DELETE on `approval_decisions`.
