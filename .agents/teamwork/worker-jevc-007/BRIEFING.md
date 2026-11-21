# Worker Briefing: G-JEVC-007

## Task Objective
Harden `jev-copilot-service` for enterprise reliability, security, and cryptographic audit according to Step 11 (เพิ่ม Reliability Behavior):
1. In `code/services/jev-copilot-service/src/security/`:
   - `pii-redactor.mjs`: Scrub sensitive PII (emails, phone numbers, national IDs), secrets (Bearer tokens, API keys), COGS / margins, and credit card patterns from incoming signals, logs, and outgoing suggestion payloads.
   - `prompt-sanitizer.mjs`: Defend against prompt injection, jailbreaking tokens, and system instruction leakage.
   - `pause-guard.mjs`: Emergency Kill-switch / Pause fail-closed circuit breaker. Mutation commands are halted immediately while preserving read-only signals.
2. In `code/services/jev-copilot-service/src/audit/`:
   - `merkle-audit-logger.mjs`: Cryptographic tamper-evident receipt generator. Appends SHA-256 Merkle hashes for every provider invocation, model refusal, suggestion delivery, operator override, and withdrawal.
3. In `code/services/jev-copilot-service/test/security-audit.test.mjs`:
   - Comprehensive test suite verifying PII redaction, prompt injection defense, emergency pause circuit breaker, and Merkle audit hash-chain integrity.
4. Populate `docs/03-architecture/specs/goals/G-JEVC-007/` specs.

## Acceptance Criteria
- [ ] Zero PII/credential leakage verified with regex and data scanning.
- [ ] Tamper-evident Merkle hash chaining verified.
- [ ] Emergency pause fail-closed verified.
- [ ] All 4 SOT checks pass green.
