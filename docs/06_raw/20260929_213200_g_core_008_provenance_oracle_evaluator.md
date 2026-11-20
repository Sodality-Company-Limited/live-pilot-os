# 📊 Provenance Oracle & Empirical Evaluation Report: Goal G-CORE-008

> **Goal ID:** `G-CORE-008`  
> **Topic:** Failure, Rollback, and Fail-Closed Harness  
> **Date:** `2026-09-29T21:32:00+07:00`  
> **Certification:** `PASS` (100% Green)  

---

## 1. Exact-HEAD Provenance Digests

| File Path | SHA256 Digest |
|---|---|
| `scripts/harness/failure-rollback-harness.mjs` | `5d456c08a8174b53680168597d097dcf21ca7888b1ad1541f7af6f332a486def` |
| `template/scripts/harness/failure-rollback-harness.mjs` | `5d456c08a8174b53680168597d097dcf21ca7888b1ad1541f7af6f332a486def` |
| `scripts/harness/routing-truth-table-harness.mjs` | `7068ee69b8eadf2cddfd3e421a0d28d88731a7d416e59b10474f7b8768032f1e` |
| `template/scripts/harness/routing-truth-table-harness.mjs` | `7068ee69b8eadf2cddfd3e421a0d28d88731a7d416e59b10474f7b8768032f1e` |
| `docs/03-architecture/agent-runtime-governance.md` | `27c03f09c7a1ff6c924276ce6a01d0bf4f8343ee511cf101ee36de94e7d1b48e` |
| `template/docs/03-architecture/agent-runtime-governance.md` | `27c03f09c7a1ff6c924276ce6a01d0bf4f8343ee511cf101ee36de94e7d1b48e` |
| `.agents/rules/agent-runtime-fail-closed.md` | `24b325742fee6f7f820cd60c539b0ced685f5eedaaf10112717421a126f98761` |
| `template/.agents/rules/agent-runtime-fail-closed.md` | `24b325742fee6f7f820cd60c539b0ced685f5eedaaf10112717421a126f98761` |
| `docs/07-backlog/goals/G-CORE-008.md` | `1f424e7a26a8f9598980fab7e0a337ee3c485be4af1d8b48b6e3865e22df878d` |
| `docs/02-product/acceptance/G-CORE-008.md` | `e5e7c1e3b6217b7710d58dd644b6cc0fdedd9807cc811afe9fc2ae614cd20aa4` |
| `docs/07-backlog/clarifications/CLARIFICATION-G-CORE-008.md` | `bda4f47fb1d8f0b53078a1d5eda5d547c06ab4d29eb7f57be0022245e9c937cc` |
| `docs/07-backlog/evidence/G-CORE-008-proof-receipt.json` | `5b678368c11d7bd2e41ce919fb51922454bb924db1e3045de2eace6e54d982d4` |

---

## 2. 20 Measured Domain Episode Trials

| Trial ID | Domain | Duration | Status | Oracle Invariant |
|---|---|---|---|---|
| `TR-001` | Failure Policy Validation on G-CORE-008 | 0.40ms | **PASS** | Valid goal card failure_policy and rollback must pass validation |
| `TR-002` | Missing Failure Policy Rejection | 0.11ms | **PASS** | Goal missing failure_policy must fail validation |
| `TR-003` | Missing Mandatory Failure Condition | 0.17ms | **PASS** | failure_policy missing timeout must fail validation |
| `TR-004` | Valid Rollback Contract Parsing | 0.02ms | **PASS** | Rollback contract with command, trigger, scope, verification must pass |
| `TR-005` | Missing Rollback Command Rejection | 0.02ms | **PASS** | Rollback contract without executable command must fail |
| `TR-006` | Forbidden Destructive Command Rejection | 0.02ms | **PASS** | Destructive command rm -rf / must be rejected fail-closed |
| `TR-007` | Rollback Not Applicable with Valid Reason | 0.03ms | **PASS** | Rollback marked not_applicable with reason must pass |
| `TR-008` | Rollback Not Applicable Missing Reason Rejection | 0.03ms | **PASS** | Rollback marked not_applicable without reason must fail |
| `TR-009` | Routing Truth Table Cartesian Exhaustiveness | 0.99ms | **PASS** | Truth table with all 8 Cartesian permutations must pass |
| `TR-010` | High-Risk Unverified Action Rejection | 0.19ms | **PASS** | High-risk unverified decision routing to proceed must fail |
| `TR-011` | Low-Confidence Action Rejection | 0.02ms | **PASS** | Low-confidence decision routing to proceed must fail |
| `TR-012` | High-Risk Verified High-Confidence Gate | 0.11ms | **PASS** | High-risk verified high-confidence action must route to human_review, not proceed |
| `TR-013` | Normal-Risk Verified High-Confidence Autonomous Route | 0.05ms | **PASS** | Normal-risk verified high-confidence decision routes to proceed |
| `TR-014` | Duplicate Truth Table State Permutation Rejection | 0.07ms | **PASS** | Duplicate (risk, evidence, confidence) triplet must fail validation |
| `TR-015` | Invalid Routing Action Rejection | 0.02ms | **PASS** | Routing action outside [proceed, verify, defer, human_review] must fail |
| `TR-016` | Incomplete Truth Table Missing Permutation Rejection | 0.03ms | **PASS** | Truth table declaring only 7 of 8 states must fail completeness check |
| `TR-017` | Markdown Table Parsing Completeness | 0.36ms | **PASS** | Routing table specified as markdown table extracts and parses correctly |
| `TR-018` | Sub-50ms Kernel SLA Latency | 38.34ms | **PASS** | 1,000 truth table evaluations must complete under 50ms |
| `TR-019` | G-CORE-008 Cryptographic Proof Receipt Validation | 0.72ms | **PASS** | G-CORE-008 proof receipt must validate 100% green |
| `TR-020` | Working-Tree SHA256 Exact-HEAD Parity | 0.28ms | **PASS** | Source files in working tree must match receipt SHA256 digests |

- **Episode Pass Rate:** 100.00% (Wilson 95% CI: [83.89%, 100.00%])

---

## 3. 8 Isolated Adversarial Mutation Tests

| Mutant ID | Injected Mutation | Status | Kill Mechanism |
|---|---|---|---|
| `MUT-01` | Missing dependency_unavailable in failure policy | **KILLED** | validateFailureAndRollbackPolicy mandatory conditions check |
| `MUT-02` | Empty rollback command string injected | **KILLED** | validateFailureAndRollbackPolicy command presence check |
| `MUT-03` | Destructive rm -rf / command injected | **KILLED** | validateFailureAndRollbackPolicy destructive command detection |
| `MUT-04` | High-risk unverified routing to proceed injected | **KILLED** | validateRoutingTruthTable Safety Invariant 1 check |
| `MUT-05` | Low-confidence routing to proceed injected | **KILLED** | validateRoutingTruthTable Safety Invariant 2 check |
| `MUT-06` | Incomplete routing table omitting (high, unverified, low) | **KILLED** | validateRoutingTruthTable exhaustiveness check |
| `MUT-07` | Invalid action execute_without_auth injected | **KILLED** | validateRoutingTruthTable permitted actions check |
| `MUT-08` | Tampered source file SHA256 in proof receipt | **KILLED** | validateProofReceipt working-tree SHA256 verification |

- **Mutation Kill Rate:** 100.00% (Wilson 95% CI: [67.56%, 100.00%])

---

## 4. Certification Sign-Off

- **Zero-Mock Verification:** Article I non-negotiable invariant strictly satisfied across all tests.
- **Fail-Closed Gate:** All mutations killed cleanly; truth table exhaustiveness and rollback compensation safety verified.
- **Provenance Integrity:** 100% SHA256 match between active working tree and proof receipt.
