# Acceptance Contract: G-WEB-010 Asset and Reference Provenance

**Goal Reference:** [`G-WEB-010.md`](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-WEB-010.md)  
**Epic:** `WEB` (DAVE Exact Web Application Pipeline)  
**Kind:** `qa`  
**Status:** `accepted`  
**Timestamp:** `2026-10-03T20:10:00+07:00`  
**Owner:** `system-architect`  
**Approver:** `tech-lead`  
**Invariants Enforced:** Article I (Zero Mocks/Stubs), Article II (Mandatory Verification Pass), Article III (WHERE, WHY, FOR WHOM, HOW).

---

## 1. Executive Summary

Goal `G-WEB-010` establishes an immutable, cryptographic asset and reference provenance ledger for Soda OS. It guarantees that all visual assets (SVGs, WebPs) adhere to size budgets (< 250KB) and aspect ratio rules, all audio earcons adhere to duration limits (<= 500ms) and acoustic loudness contracts (-16 to -18 LUFS) with accessible mute controls, and all public assets are cryptographically bound via SHA-256 digests in `docs/02-product/design/asset-provenance-manifest.json`.

---

## 2. Formal BDD Given-When-Then Scenarios

### Feature: Visual Asset Format, Budget and Aspect Ratio Verification

```gherkin
Feature: Visual Asset Format and Performance Budget Invariants
  As a Design Systems and Performance Engineer
  I want all visual assets to be strictly audited for format, file size, and metadata
  So that bundle bloat, layout distortion, and accessibility violations are eliminated.

  Scenario: AC-WEB-010-01 - Validating visual asset modern formats and size budgets
    Given an operational Soda OS environment with visual assets in "public/assets"
    When the visual asset verification harness "scripts/harness/asset-harness.mjs" scans the directory
    Then all assets MUST utilize approved modern formats (.svg, .webp, .avif)
    And no asset MUST exceed the 250KB size budget
    And all SVG assets MUST declare a viewBox for responsive aspect ratio scaling
    And all SVG assets MUST declare accessibility metadata (<title> or aria-label)
    And the harness MUST exit with code 0 and zero errors.
```

### Feature: Audio Earcon Duration and Acoustic Invariants

```gherkin
Feature: Audio Earcon Acoustic Contracts and Mute Suppression
  As a User Experience and Accessibility Engineer
  I want audio feedback earcons to adhere to duration limits and loudness targets
  So that auditory feedback is pleasant, non-intrusive, and accessible.

  Scenario: AC-WEB-010-02 - Validating audio earcon duration, loudness, and mute controls
    Given an operational Soda OS environment with audio files in "public/audio"
    When the audio verification harness "scripts/harness/audio-harness.mjs" executes
    Then all audio earcons MUST have a duration strictly <= 500ms
    And audio waveforms MUST exhibit zero digital clipping (peak amplitude < 0.99)
    And audio loudness MUST be normalized to nominal target (-16 to -18 LUFS / dBFS)
    And accessible mute suppression controls MUST be configured
    And the harness MUST exit with code 0 and zero errors.
```

### Feature: Cryptographic Provenance Manifest Invariant

```gherkin
Feature: Asset Provenance Ledger and SHA-256 Binding
  As a Security and Compliance Officer
  I want every asset to be bound to a verified licensing authority and cryptographic hash
  So that intellectual property infringement and ungrounded assets are prevented.

  Scenario: AC-WEB-010-03 - Validating cryptographic provenance manifest
    Given the asset provenance manifest at "docs/02-product/design/asset-provenance-manifest.json"
    When every declared asset is hashed with SHA-256 and verified against working tree bytes
    Then 100% of asset hashes MUST match the manifest content_hash exactly
    And all assets MUST declare a verified licensing authority
    And zero ungrounded or unlicensed assets MUST exist
    And the proof receipt validator MUST certify compliance with status "PASS".
```

---

## 3. Verification Commands & Evidence

1. Visual Asset Harness: `node scripts/harness/asset-harness.mjs`
2. Audio Earcon Harness: `node scripts/harness/audio-harness.mjs`
3. Manifest Validation: `node -e "JSON.parse(require('fs').readFileSync('docs/02-product/design/asset-provenance-manifest.json'))"`
4. Proof Receipt Validator: `node scripts/harness/proof-receipt-validator.mjs artifacts/proofs/asset_provenance_receipt.json`
5. Unit Test Suite: `node --test tests/unit/test-asset-provenance.mjs`
