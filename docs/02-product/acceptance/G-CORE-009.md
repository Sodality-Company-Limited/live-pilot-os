# Acceptance Contract: G-CORE-009 Artifact and Model Provenance Harness

**Goal Reference:** [G-CORE-009.md](../../07-backlog/goals/G-CORE-009.md)  
**Kind:** feature  
**Epic:** CORE  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the formal verification and empirical assurance criteria for Goal G-CORE-009: Artifact and Model Provenance Harness. Soda OS establishes cryptographic provenance verification between source code working tree bytes and declared artifact receipts, enforces anti-tampering guards rejecting failed or skipped test outputs, and validates model checkpoint lineage across weights digests, dataset manifests, and tokenizer revisions with zero mocks and zero stubs.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: AC-CORE-CORE-009-01: Rejects Artifacts Whose Source File SHA256 Digests Do Not Match Working Tree
```gherkin
Feature: Working Tree Cryptographic Source Hash Verification
  Scenario: Rejects artifacts whose source file SHA256 digests do not match working tree
    Given an artifact proof receipt declaring source file paths and corresponding SHA256 hashes
    When validateArtifactProvenance is evaluated against active workspace files
    Then every referenced source file is hashed using SHA256 directly from disk
    And any hash mismatch triggers immediate validation failure with descriptive error diagnostics
    And the operation succeeds with exit code 0 and maintains zero mocks or stubs.
```

### Scenario 2: AC-CORE-CORE-009-02: Rejects Receipts Generated from Failed or Skipped Test Runs
```gherkin
Feature: Anti-Tamper Test Integrity Guard
  Scenario: Rejects receipts generated from failed or skipped test runs
    Given an artifact receipt or proof record claiming successful verification
    When the receipt indicates a non-zero exit_code or skipped status
    Then validateArtifactProvenance rejects the receipt fail-closed
    And contradictory receipts (non-zero exit_code with passed = true) are blocked
    And zero mocks, zero stubs, and zero fallback objects are present.
```

### Scenario 3: AC-CORE-CORE-009-03: Validates Model Provenance Manifests with Dataset and Tokenizer Lineage
```gherkin
Feature: Model Weights and Lineage Manifest Verification
  Scenario: Validates model provenance manifests with dataset and tokenizer lineage
    Given a model checkpoint provenance manifest specifying model_id, source_revision, dataset_lineage, and tokenizer
    When validateModelProvenance is evaluated with optional verify_disk enabled
    Then all mandatory schema properties are validated for structure and sha256 digests
    And disk artifact files are hashed and matched against manifest entries
    And the operation succeeds with exit code 0 and maintains zero mocks.
```

---

## 📋 Verification Checklist

- [x] Artifact provenance validator operational verifying source hashes against active working tree (`artifact-provenance-harness.mjs`).
- [x] Contradictory receipt rejection operational (`exit_code !== 0 && passed === true`).
- [x] Skipped test receipt rejection operational (`skipped === true || status === 'skipped'`).
- [x] Model provenance harness operational verifying dataset lineage, tokenizer, and config (`model-provenance-harness.mjs`).
- [x] Optional disk file hash recomputation operational with `verify_disk: true`.
- [x] Governance rule `.agents/rules/artifact-provenance.md` specifies hard provenance and anti-tamper boundaries.
- [x] Architecture document `docs/03-architecture/model-provenance.md` specifies the immutable DAG structure.
- [x] 100% byte equivalence maintained between root and `template/` copies.
- [x] Zero mocks, zero stubs, zero simulated objects invariant preserved.
