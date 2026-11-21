# Deep Architectural Specification: G-WEB-011 Human-in-the-Loop Review Engine

**Goal ID:** `G-WEB-011`  
**Timestamp:** `2026-10-03T20:55:00+07:00`  
**Epic:** `WEB` (DAVE Exact Web Application Pipeline)  
**Kind:** `feat`  
**Topic:** Audit Trail Aggregation, Review Packet Standardization, Empirical Metrics & Non-Repudiation Review Ledger  
**Author:** `Antigravity (AI System Architect & Lead Engineer)`  
**Invariants Enforced:** Article I (Zero Mocks/Stubs), Article II (Empirical Testing Pass), Article III (WHERE, WHY, FOR WHOM, HOW).

---

## 1. Architectural Overview & System Topology

The Soda OS Human-in-the-Loop Review Engine bridges autonomous multi-expert agent decisions and human engineering oversight. It guarantees that human operators review high-signal, cryptographically bound evidence packets rather than wading through unparsed chain-of-thought monologues.

```
+----------------------------------------------------------------------------------------------------+
|                                    AUDIT & EVIDENCE REPOSITORIES                                   |
|  - .agents/audit/decisions.jsonl           - docs/07-backlog/evidence/*-proof-receipt.json         |
|  - data/references/manifest.json           - artifacts/proofs/*.json                               |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                        DAVE DECISION AGGREGATOR (scripts/lib/dave-engine.mjs)                      |
|  aggregateGoalAuditTrail(goalId, options):                                                         |
|    1. Reads matching decision lines from decisions.jsonl                                           |
|    2. Fail-closed: throws if 0 decisions match                                                     |
|    3. Gathers reference assets (REF-0001, hashes, dimensions)                                      |
|    4. Parses proof receipts and aggregates invariants                                              |
|    5. Extracts empirical metrics: visual_diff_ratio, CLS, font lock status                         |
|    6. Computes aggregated calibrated confidence and maximum risk tier                              |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                       REVIEW PACKET FORMATTER (scripts/lib/dave-engine.mjs)                        |
|  formatReviewPacket(decisionOrAggregated, references, options):                                    |
|    - Section 1: Header, Status, Risk Tier, Calibrated Confidence, Expert Consensus                 |
|    - Section 2: Executive Summary & Rationale (Strict Zero CoT Tokens)                             |
|    - Section 3: Touched Components & Mutated Artifacts                                             |
|    - Section 4: Proof Receipts & Empirical Metrics (Visual Diff Ratio, CLS, Invariants)            |
|    - Section 5: Actionable Review Decisions (Approve/Reject CLI Commands)                          |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                           CLI OPERATIONS & REVIEW LEDGER (dave-cli.mjs)                            |
|  - soda dave show-review-packet <goalId> -> writes artifacts/review/DAVE-REVIEW-PACKET.md           |
|  - soda dave review <goalId> <status> --note <note> -> records to .agents/audit/decisions.jsonl     |
|    with SHA-256 digest of review packet                                                            |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Core Functional Modules

### 1. Decision Aggregator (`aggregateGoalAuditTrail`)
Located in [`scripts/lib/dave-engine.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/dave-engine.mjs#L484-L572):
- Scans `.agents/audit/decisions.jsonl` line by line.
- Groups decisions matching the requested `goalId`.
- If zero decisions exist, throws an error enforcing the fail-closed invariant.
- Parses matching proof receipts from `docs/07-backlog/evidence/${goalId}-proof-receipt.json` and `artifacts/proofs/`.
- Resolves referenced assets from `data/references/manifest.json`.
- Extracts empirical metrics (`visual_diff_ratio`, `cls`, `font_locked`) from decision metadata and validation payloads.

### 2. Review Packet Formatter (`formatReviewPacket`)
Located in [`scripts/lib/dave-engine.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/dave-engine.mjs#L574-L715):
- Strips any reasoning or chain-of-thought traces, strictly displaying:
  1. **Goal ID & Review Lifecycle State:** Includes consensus status across expert domains.
  2. **Executive Summary:** Plain-text business justification and change explanation.
  3. **Touch Map:** Full listing of modified code files, schemas, and design token files.
  4. **Empirical Metrics & Proof Receipts:** Visual diff ratio (compared against the threshold $\le 0.0050$), Cumulative Layout Shift ($0$), font lock verification, and proof receipt status.
  5. **Review Triggers:** Exact command lines for human sign-off or rejection.
- If `outputPath` is supplied, synchronously persists the packet to disk.

### 3. CLI Subcommands (`show-review-packet` & `review`)
Located in [`scripts/lib/dave-cli.mjs`](file:///Users/batrarethsudprasert/projects/soda-os/scripts/lib/dave-cli.mjs#L268-L345):
- `show-review-packet <goalId>`:
  - Invokes `aggregateGoalAuditTrail(goalId)`.
  - Formats packet and writes to `artifacts/review/DAVE-REVIEW-PACKET.md`.
  - Outputs formatted Markdown to standard output.
- `review <goalId> <status> --note <note>`:
  - Validates status (`approved`, `rejected`, `needs_revision`).
  - Reads `artifacts/review/DAVE-REVIEW-PACKET.md` and computes its cryptographic SHA-256 digest.
  - Appends an audit decision record of type `OPERATOR_REVIEW` to `.agents/audit/decisions.jsonl` with author metadata, timestamp, packet digest, and operator review notes.

---

## 3. Strict Invariants Enforced

1. **Zero Mocks / Zero Fallbacks:** All functions execute real file I/O over active disk files. Missing goals fail closed.
2. **Deterministic Packet Generation:** Formatting the same aggregated audit trail produces bitwise identical Markdown output.
3. **Cryptographic Non-Repudiation:** Review records store the SHA-256 hash of the exact packet reviewed by the operator.
