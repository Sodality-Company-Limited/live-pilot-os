# Acceptance Contract: G-CORE-011 Framework-Source Versus Downstream-Project Upgrade Mode

**Goal Reference:** [G-CORE-011.md](../../07-backlog/goals/G-CORE-011.md)  
**Kind:** feature  
**Epic:** CORE  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the formal verification and empirical assurance criteria for Goal G-CORE-011: Framework-Source Versus Downstream-Project Upgrade Mode. Soda OS provides an automated CLI upgrade mode that recognizes `framework_source` versus `downstream_project` repositories, suppressing spurious drift warnings, eliminating downstream scaffold file instantiation into the framework root, reporting asset parity between root and template distributions, and preserving the complete downstream upgrade pipeline with zero mocks and zero stubs.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: AC-CORE-CORE-011-01: Identifies Framework Source Repository from Package.json or Directory Markers
```gherkin
Feature: Framework Source Repository Kind Detection
  Scenario: Correctly identifies framework source repository from package.json or template presence
    Given a Soda OS framework repository directory
    When detectRepositoryKind or soda-os upgrade --report evaluates the directory
    Then the repository kind is resolved as "framework_source"
    And the operation succeeds with exit code 0 and maintains zero mocks or stubs.
```

### Scenario 2: AC-CORE-CORE-011-02: Suppresses False Downstream Drift Warnings on Framework Source
```gherkin
Feature: Downstream Drift Warning Suppression
  Scenario: Suppresses false downstream missing file drift warnings when running on framework source
    Given the Soda OS framework source repository
    When soda-os upgrade --report is executed against the target directory
    Then downstream scaffold files (AGENTS.md, docs/07-backlog/goals.md) are not reported as missing in target
    And FRAMEWORK SOURCE INTEGRITY MODE is reported to stdout
    And zero false drift warnings are emitted.
```

### Scenario 3: AC-CORE-CORE-011-03: Reports Rule and Skill Parity Between Root and Template
```gherkin
Feature: Framework Asset Parity Verification
  Scenario: Reports rule and skill parity between root and template
    Given a Soda OS framework source repository containing root and template directories
    When soda-os upgrade --report inspects .agents/rules and .agents/skills
    Then rule count parity and skill count parity are verified
    And 100% synchronization is confirmed with exit code 0
    And zero mocks, zero stubs, and zero fallback objects are present.
```

---

## 📋 Verification Checklist

- [x] `detectRepositoryKind` operational in `cli.js` inspecting package.json and template directory markers.
- [x] `runReport` in `cli.js` branches on `framework_source` and outputs `FRAMEWORK SOURCE INTEGRITY MODE`.
- [x] False downstream drift warnings suppressed when running on framework source root.
- [x] Root vs template rules count and skills count verified for 100% parity.
- [x] Downstream upgrade mode preserved for standard application targets.
- [x] 100% byte equivalence maintained across root and `template/` copies where applicable.
- [x] Zero mocks, zero stubs, zero simulated objects invariant preserved.
