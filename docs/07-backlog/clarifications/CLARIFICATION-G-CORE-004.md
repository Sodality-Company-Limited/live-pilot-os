# 🔄 Socratic Clarification State Machine: Goal G-CORE-004 Machine-Readable Goal Contract & Profile Registry

> **Goal ID:** `G-CORE-004`  
> **Owning Agent/Session:** `Antigravity Master Architect`  
> **State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
> **Iteration:** `Round 1 Confirmed & Locked`  
> **Goal Reference:** [G-CORE-004](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-CORE-004.md)  
> **Created At:** `2026-09-29T12:56:00+07:00`  
> **Updated At:** `2026-09-29T12:57:00+07:00`  

---

## 📜 Append-Only Q&A History
- **Round 1: Dimension 1 (Target Persona & Scope: Domain Profile Registry & Personas)** -> Confirmed Option 1.1: Modular Domain Profile Registry supporting `core`, `ml_research`, and `security` personas codified into machine-readable filesystem schemas in `docs/03-architecture/profiles/`.
- **Round 1: Dimension 2 (Core KPI Metrics & Invariant Checks)** -> Confirmed Option 2.1: 100% Validation on all required `goal_contract` frontmatter fields (`id`, `version`, `kind`, `status`, `profiles`, `atomicity`, `risk`, `lifecycle`), strict single-outcome atomicity (`outcome_count === 1`), and zero mocks.
- **Round 1: Dimension 3 (Data Contracts & Freshness)** -> Confirmed Option 3.1: Canonical `extractAndValidateGoalContract` parser function extracting and validating YAML frontmatter with strict type and enum constraints.
- **Round 1: Dimension 4 (Interactive Actions & Sagas)** -> Confirmed Option 4.1: Deterministic profile schema loading from `docs/03-architecture/profiles/`, atomicity grammar analysis rejecting compound conjunctions, and root-to-template distribution parity.
- **Round 1: Dimension 5 (Edge Boundaries & Failure States)** -> Confirmed Option 5.1: Fail-Closed Rejection on missing required fields, version drift (!= 2), missing core profile, unregistered profiles, or compound outcomes.
- **Round 1: Dimension 6 (Codebase Grounding, Latency Budgets & Reusability)** -> Confirmed Option 6.1: Sub-50ms Evaluation SLA per harness execution, exact-HEAD provenance, and 100% compilable operational logic without stubs or mocks.

---

## 🏛️ Context & Problem Statement

Soda OS goals require machine-readable frontmatter metadata to decouple workflow validation from unstructured markdown prose:
1. **Absence of Strict Contract Parsing:** Previous systems relied on heuristic markdown regex parsing prone to false positives or missed required metadata blocks.
2. **Missing Domain Profile Schema Registry:** Profiles were hardcoded in scripts rather than declared as decoupled, extensible YAML schemas in `docs/03-architecture/profiles/`.
3. **Compound Deliverables Risk:** Goals could smuggle secondary deliverables into descriptions without automated grammar and outcome-count enforcement.
4. **Distribution Parity Drift:** Need for 100% byte equivalence between framework root and `template/` distribution packages.

---

## 🎯 Confirmed Architectural Decisions

### Dimension 1: Target Persona & Scope (Modular Domain Profiles & Personas)
- [x] **Option 1.1: Modular Profile Registry Architecture**
  - Implement and validate dedicated profile definitions: `core.yaml`, `ml_research.yaml`, `security.yaml`, `agent_execution.yaml`, `backend.yaml`, `database.yaml`, `deployment.yaml`, `migration.yaml`, `sre.yaml`, `ui.yaml` in `docs/03-architecture/profiles/`.
  - Every goal MUST declare `profiles` containing at least `core`.
  - Validate role definitions (`system-architect`, `ml-engineer`, `security-auditor`) matching declared profile capabilities.

### Dimension 2: Core KPI Metrics & Verification Criteria
- [x] **Option 2.1: Mandatory Contract Fields Validation**
  - Validate that `goal_contract` contains:
    - `id`: Valid goal identifier matching `/^G-[A-Za-z0-9_-]+$/i` or template.
    - `version`: Exactly 2.
    - `kind`: Enumeration (`feature`, `design`, `api`, `migration`, `qa`, `chore`).
    - `status`: Enumeration (`draft`, `planned`, `ready`, `in_progress`, `review`, `blocked`, `approved`, `done`).
    - `profiles`: Array of strings containing `'core'`.
    - `atomicity`: Object with `outcome_count: 1` and non-empty `primary_outcome`.
    - `risk`: Object with `level` or valid string.
    - `lifecycle`: Object with lifecycle stages.

### Dimension 3: Data Contracts & Freshness (`extractAndValidateGoalContract`)
- [x] **Option 3.1: Exported Canonical Validator Port**
  - Export `extractAndValidateGoalContract(content, filename)` alongside `validateGoalContract` in `goal-template-conformance-harness.mjs`.
  - Return structured validation result: `{ valid: boolean, isV2: boolean, errors: string[], contract: object }`.

### Dimension 4: Interactive Actions & Sagas (Atomicity & Splitting Rules)
- [x] **Option 4.1: Automated Atomicity Invariant Enforcement**
  - Reject `outcome_count !== 1`.
  - Reject multi-outcome conjunctions: `and also`, `as well as`, `in addition to`, `plus`, `along with`, `concurrently with`, or semicolons.

### Dimension 5: Edge Boundaries & Failure Policies
- [x] **Option 5.1: Fail-Closed Policy**
  - Malformed YAML throws parse error and fails gate.
  - Missing required fields emit explicit descriptive error messages.
  - Schema violations immediately exit non-zero in CI/CLI.

### Dimension 6: Codebase Grounding, Latency & Provenance
- [x] **Option 6.1: Sub-50ms SLA and Exact-HEAD Provenance**
  - Execution time strictly bounded under 50ms for contract parsing.
  - Zero mocks, zero stubs; 100% concrete compilable JavaScript (Node.js ESM).
  - Physical SHA256 hashing across touch map files.

---

## 🔒 Verification & Exit Gate
- Unit tests pass: `node scripts/harness/test-goal-assurance-suite.mjs`
- Atomicity harness passes: `node scripts/harness/goal-atomicity-harness.mjs docs/07-backlog/goals/G-CORE-004.md`
- Conformance harness passes: `node scripts/harness/goal-template-conformance-harness.mjs G-CORE-004`
- Full test pass: `npm test && npm run test:template`
