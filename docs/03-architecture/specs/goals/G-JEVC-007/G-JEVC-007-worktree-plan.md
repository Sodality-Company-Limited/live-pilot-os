# G-JEVC-007 — Worktree Plan: Security, Hardening & Audit Components

Goal ID: `G-JEVC-007`  
Scope: Goal touch map, worktree isolation, verification command, and test coverage boundary  
Status: `APPROVED`

---

## 1. Goal Touch Map & Boundaries

```text
code/services/jev-copilot-service/
├── src/
│   ├── security/
│   │   ├── pii-redactor.mjs          # Deep recursive PII, credentials & COGS scrubber
│   │   ├── prompt-sanitizer.mjs      # Adversarial prompt injection defense & XML sandbox
│   │   └── pause-guard.mjs           # Emergency pause fail-closed circuit breaker
│   └── audit/
│       └── merkle-audit-logger.mjs   # Cryptographic Merkle audit ledger & inclusion proofs
├── test/
│   └── security-audit.test.mjs       # Comprehensive zero-mock security & audit test suite
docs/03-architecture/specs/goals/G-JEVC-007/
├── G-JEVC-007-architecture-spec.md
├── G-JEVC-007-fsm-runtime-spec.md
├── G-JEVC-007-invariants-formal-spec.md
├── G-JEVC-007-threat-model.md
└── G-JEVC-007-worktree-plan.md
```

---

## 2. Verification Command

```bash
node code/services/jev-copilot-service/test/security-audit.test.mjs && node scripts/contract-check/error-code-registry.mjs && node scripts/api/check-api-sot-traceability.mjs && node scripts/architecture/check-sot.mjs && node scripts/testing/check-tdd-traceability.mjs
```

---

## 3. Disjoint Isolation Invariants

- All source files reside in `code/services/jev-copilot-service/src/security/` and `code/services/jev-copilot-service/src/audit/`.
- Zero concurrent edits outside declared touch map.
- Zero mock dependencies; tests exercise real operational regex scanners, cryptographic SHA-256 engines, and state machines.
