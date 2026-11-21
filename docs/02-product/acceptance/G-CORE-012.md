# Acceptance Contract: G-CORE-012 New Proof, ML, Runtime-Governance, and Observability Skills

**Goal Reference:** [G-CORE-012.md](../../07-backlog/goals/G-CORE-012.md)  
**Kind:** feature  
**Epic:** CORE  
**Status:** ready  

---

## 🏛️ Executive Summary

This acceptance contract defines the formal verification and empirical assurance criteria for Goal G-CORE-012: New Proof, ML, Runtime-Governance, and Observability Skills. Soda OS provides an advanced capability suite of 7 machine-readable framework skills and 6 governance rules synchronized across root and template distributions, registered in the framework manifest, enforcing zero mocks, zero stubs, sub-50ms latency budgets, and 100% asset parity.

---

## 🧪 BDD Given-When-Then Acceptance Scenarios

### Scenario 1: AC-CORE-CORE-012-01: Machine-Readable Skill Contract Declarations
```gherkin
Feature: Machine-Readable Skill Contracts
  Scenario: All 7 new framework skills declare valid skill_contract metadata
    Given a standard Soda OS environment
    When all 7 new skills (.agents/skills/soda-proof-assurance, soda-statistical-evidence, soda-model-training, soda-agent-runtime-governance, soda-model-provenance, soda-agent-observability, soda-resource-budgeting) are inspected
    Then each SKILL.md contains a valid machine-readable YAML skill_contract block
    And the operation succeeds with exit code 0 and maintains zero mocks or stubs.
```

### Scenario 2: AC-CORE-CORE-012-02: Manifest Registration of Governance Rules
```gherkin
Feature: Governance Rule Registration in Framework Manifest
  Scenario: All 6 new governance rules are registered in framework-manifest.yml
    Given the Soda OS distribution manifest template/framework-manifest.yml
    When the overwrite.rules list is inspected
    Then proof-and-evidence.md, model-training-governance.md, agent-runtime-fail-closed.md, scope-and-dependency-integrity.md, artifact-provenance.md, and observability-contract.md are present
    And the operation succeeds with exit code 0 and maintains zero mocks.
```

### Scenario 3: AC-CORE-CORE-012-03: Full Parity Across Root and Template Assets
```gherkin
Feature: Framework Asset Synchronization and Parity
  Scenario: CLI upgrade report certifies 100% parity across rules and skills
    Given the Soda OS framework repository containing root and template directories
    When cli.js upgrade --report inspects .agents/rules and .agents/skills
    Then 35 root / 35 template rules and 49 root / 49 template skills are verified
    And 100% synchronization is confirmed with exit code 0
    And zero mocks, zero stubs, and zero fallback objects are present.
```

---

## 📋 Verification Checklist

- [x] All 7 new skills contain machine-readable `skill_contract` blocks in YAML frontmatter.
- [x] All 6 new governance rules are registered in `template/framework-manifest.yml`.
- [x] All 35 rules and 49 skills exist with 100% parity across root and template directories.
- [x] `node cli.js upgrade --report` outputs 100% synchronization with exit code 0.
- [x] Sub-50ms execution SLA verified across all harness inspections.
- [x] 100% byte equivalence maintained between root and `template/` copies.
- [x] Zero mocks, zero stubs, zero simulated objects invariant preserved.
