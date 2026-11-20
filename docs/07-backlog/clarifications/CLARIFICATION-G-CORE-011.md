# 🔄 Socratic Clarification State Machine: Goal G-CORE-011 Framework-Source Versus Downstream-Project Upgrade Mode

> **Goal ID:** `G-CORE-011`  
> **Owning Agent/Session:** `Antigravity Master Architect`  
> **State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
> **Iteration:** `Round 1 Confirmed & Locked`  
> **Goal Reference:** [G-CORE-011](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-CORE-011.md)  
> **Created At:** `2026-09-29T22:15:00+07:00`  
> **Updated At:** `2026-09-29T22:15:00+07:00`  

---

## 📜 Append-Only Q&A History
- **Round 1: Dimension 1 (Target Persona & Scope: Repository Kind Detection)** -> Confirmed Option 1.1: Automated repository kind detection in `cli.js` (`detectRepositoryKind`) recognizing `framework_source` vs `downstream_project` based on `package.json` metadata and directory markers.
- **Round 1: Dimension 2 (Core KPI Metrics & Invariant Checks)** -> Confirmed Option 2.1: 100% elimination of spurious downstream drift warnings on framework source root; accurate rule and skill parity reporting between root and `template/`; full downstream project upgrade pipeline preservation; exit code 0; zero mocks and zero stubs.
- **Round 1: Dimension 3 (Data Contracts & Freshness)** -> Confirmed Option 3.1: Inspection of `package.json` (`name`, `repository_kind`), filesystem verification of `template/framework-manifest.yml` and `cli.js`, rule count and skill count comparisons, and deterministic output schema.
- **Round 1: Dimension 4 (Interactive Actions & Sagas)** -> Confirmed Option 4.1: Atomic evaluation in `soda-os upgrade --report`, branching between `FRAMEWORK SOURCE INTEGRITY MODE` and downstream upgrade analysis, and fail-closed termination upon execution error.
- **Round 1: Dimension 5 (Edge Boundaries & Failure States)** -> Confirmed Option 5.1: Boundary guards handling missing package.json, corrupted JSON, missing template folders, and downstream project directory targets.
- **Round 1: Dimension 6 (Codebase Grounding, Latency Budgets & Reusability)** -> Confirmed Option 6.1: Sub-50ms execution SLA per CLI inspection, 100% byte equivalence between root and `template/` copies, zero mocks, and zero stubs.

---

## 🏛️ Context & Problem Statement

When maintaining Soda OS as a central framework repository while simultaneously supporting downstream projects:
1. **Spurious Drift False Positives:** The upgrade CLI previously treated the framework source repository as an ordinary downstream target, falsely reporting all downstream scaffold files (`AGENTS.md`, `docs/07-backlog/goals.md`, etc.) as missing in the framework root.
2. **Downstream File Instantiation Risk:** Accidental execution of `soda-os upgrade --yes` on the framework repository could overwrite framework-level governance or instantiate downstream project stubs into framework root.
3. **Missing Parity Telemetry:** Framework developers had no automated command to verify rule and skill synchronization between root `.agents/` and `template/.agents/`.
4. **Preservation of Downstream Upgrades:** Downstream projects must continue receiving full mechanical sync, hybrid merge guidance, and drift analysis without regression.

---

## 🎯 Confirmed Architectural Decisions

### Dimension 1: Target Persona & Scope (Repository Kind Detection)
- [x] **Option 1.1: Automated Repository Kind Detection**
  - Implement `detectRepositoryKind(dir)` in `cli.js`.
  - Check `package.json` (`name === '@sodality/soda-os'`, `name === 'soda-os'`, or `repository_kind === 'framework_source'`).
  - Fallback check for `template/framework-manifest.yml` and `cli.js`.
  - Return `framework_source` for framework repository, `downstream_project` otherwise.

### Dimension 2: Core KPI Metrics & Invariant Checks
- [x] **Option 2.1: Parity Reporting & Drift Suppression**
  - Suppress false downstream missing file drift warnings when `repositoryKind === 'framework_source'`.
  - Compare rule counts and skill counts between root and template.
  - Report 100% synchronization or flag specific discrepancies.
  - Maintain full downstream upgrade path for downstream projects.

### Dimension 3: Data Contracts & Freshness
- [x] **Option 3.1: Deterministic Metadata & Manifest Contracts**
  - Read `package.json` and `template/framework-manifest.yml`.
  - Introspect `.agents/rules` and `.agents/skills` directories dynamically.
  - Format clear, actionable stdout reports with next steps.

### Dimension 4: Interactive Actions & Sagas
- [x] **Option 4.1: Branch-Specific Reporting Execution**
  - In `runReport(manifest)`, if `framework_source`, print `FRAMEWORK SOURCE INTEGRITY MODE` and parity analysis, then return early.
  - If `downstream_project`, proceed with Phase 1 mechanical checks, drift analysis, and Phase 2 merge guidance.

### Dimension 5: Edge Boundaries & Failure Policies
- [x] **Option 5.1: Fail-Closed Boundary Hardening**
  - Handle malformed package.json gracefully by falling back to directory markers.
  - Reject corrupted template paths with exit code 1.

### Dimension 6: Codebase Grounding, Latency & Provenance
- [x] **Option 6.1: Sub-50ms Kernel SLA and Exact-HEAD Provenance**
  - All inspections complete in sub-50ms latency.
  - Exact-HEAD commit SHA bound in proof receipts.
  - 100% byte equivalence between root and `template/` files.
  - Zero mocks, zero stubs; 100% operational logic.

---

## 🔒 Verification & Exit Gate
- CLI inspection passes: `node cli.js upgrade --report`
- Conformance harness passes: `node scripts/harness/goal-template-conformance-harness.mjs G-CORE-011`
- Master replication harness passes: `node scripts/harness/g-core-011-replication-harness.mjs`
- Full test pass: `npm test && npm run test:template`
