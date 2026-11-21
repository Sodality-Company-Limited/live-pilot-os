# Acceptance Contract: G-WEB-011 Human Review Packet

**Goal Reference:** [`G-WEB-011.md`](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-WEB-011.md)  
**Epic:** `WEB` (DAVE Exact Web Application Pipeline)  
**Kind:** `qa`  
**Status:** `accepted`  
**Timestamp:** `2026-10-03T20:54:00+07:00`  
**Owner:** `system-architect`  
**Approver:** `tech-lead`  
**Invariants Enforced:** Article I (Zero Mocks/Stubs), Article II (Mandatory Verification Pass), Article III (WHERE, WHY, FOR WHOM, HOW).

---

## 1. Executive Summary

Goal `G-WEB-011` establishes a deterministic, compact, and auditable Human-in-the-Loop review packet mechanism under DAVE governance for Soda OS. Human operators cannot effectively review thousands of lines of verbose agent chain-of-thought transcripts. G-WEB-011 synthesizes verified decisions, evidence citations, proof receipts, calibrated confidence scores, and visual diff metrics directly from the cryptographic audit ledger (`.agents/audit/decisions.jsonl`) and proof receipts (`docs/07-backlog/evidence/`, `artifacts/proofs/`) into an ASCII/Markdown review packet (`artifacts/review/DAVE-REVIEW-PACKET.md`), presenting concise auditable facts, interactive approval checkboxes, and recording human operator decisions back to the ledger with full SHA-256 audit provenance.

---

## 2. Formal BDD Given-When-Then Scenarios

### Feature: Comprehensive Review Packet Aggregation and Evidence Grounding

```gherkin
Feature: Human Review Packet Decision and Proof Aggregation
  As a System Architect and Human Operator
  I want all verified decisions, evidence citations, and proof receipts to be aggregated deterministically
  So that high-leverage oversight is possible without information loss or manual log excavation.

  Scenario: AC-WEB-011-01 - Summarizing decisions, evidence citations, and verification receipts
    Given an operational Soda OS environment with recorded decisions in ".agents/audit/decisions.jsonl"
    When the DAVE CLI executes "node scripts/lib/dave-cli.mjs show-review-packet G-WEB-001"
    Then the decision aggregator MUST extract all decisions for the target goal sequence without omissions
    And the aggregator MUST extract calibrated confidence scores and risk classifications
    And the aggregator MUST extract empirical visual diff metrics and proof receipts
    And the aggregator MUST resolve first-class references with physical SHA-256 digests
    And the command MUST exit with code 0 and zero mocks.
```

### Feature: Zero Chain-of-Thought Opacity Invariant

```gherkin
Feature: High-Signal Review Format Without Hidden Chain-of-Thought
  As a Quality Reviewer and Tech Lead
  I want review packets to present auditable facts rather than opaque chain-of-thought traces
  So that cognitive fatigue is eliminated and review speed is maximized.

  Scenario: AC-WEB-011-02 - Omitting hidden chain-of-thought reasoning in favor of auditable facts
    Given an aggregated DAVE audit trail for goal "G-WEB-001"
    When the review packet is rendered to "artifacts/review/DAVE-REVIEW-PACKET.md"
    Then the output MUST contain zero hidden chain-of-thought tokens or prompt traces
    And the output MUST strictly display structured sections:
      | Section Number | Section Title                       |
      | 1              | DECISION SUMMARY                    |
      | 2              | DOMAIN & ACTION                     |
      | 3              | FIRST-CLASS REFERENCES              |
      | 4              | PROOF RECEIPTS & EMPIRICAL METRICS  |
      | 5              | EXPLICIT ASSUMPTIONS                |
      | 6              | ALTERNATIVES REJECTED               |
      | 7              | VERIFICATION PLAN                   |
      | 8              | HUMAN ACTION REQUIRED               |
    And the review packet MUST be readable via "node -e 'require(\"fs\").readFileSync(\"artifacts/review/DAVE-REVIEW-PACKET.md\")'" with exit code 0.
```

### Feature: Interactive CLI Review and Audit Ledger Recording

```gherkin
Feature: Interactive Human Review and Cryptographic Ledger Logging
  As a Security and Compliance Officer
  I want human review actions to be appended to the append-only audit ledger
  So that human sign-off is non-repudiable and traceable to operator identity.

  Scenario: AC-WEB-011-03 - Logging human approval to decisions.jsonl with exit code 0
    Given an operational Soda OS environment and a pending DAVE review packet
    When the operator executes "node scripts/lib/dave-cli.mjs review G-WEB-001 --approve"
    Then the CLI MUST append an audit record to ".agents/audit/decisions.jsonl"
    And the record MUST declare "human_action: approve" and "status: approved"
    And the record MUST record the operator identity and timestamp
    And the record MUST include a cryptographic SHA-256 digest of the record content
    And the command MUST exit with code 0.
```

---

## 3. Verification Commands & Evidence

1. Aggregate & Format Review Packet: `node scripts/lib/dave-cli.mjs show-review-packet G-WEB-001`
2. Verify Review Packet Artifact: `node -e "require('fs').readFileSync('artifacts/review/DAVE-REVIEW-PACKET.md')"`
3. Execute Human Review Approval: `node scripts/lib/dave-cli.mjs review G-WEB-001 --approve`
4. Comprehensive Unit Test Suite: `node --test tests/unit/test-dave-hitl-review.mjs`
5. DAVE Decision Schema & Harness: `node scripts/harness/goal-template-conformance-harness.mjs G-WEB-011`
6. Zero-Mock Production Gate: `node scripts/harness/no-mock-production-gate-harness.mjs`
