# 🔄 Socratic Clarification State Machine: Goal G-CORE-005 Dependency Graph & Scope-Drift Harness

> **Goal ID:** `G-CORE-005`  
> **Owning Agent/Session:** `Antigravity Master Architect`  
> **State:** `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`  
> **Iteration:** `Round 1 Confirmed & Locked`  
> **Goal Reference:** [G-CORE-005](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-CORE-005.md)  
> **Created At:** `2026-09-29T13:30:00+07:00`  
> **Updated At:** `2026-09-29T13:31:00+07:00`  

---

## 📜 Append-Only Q&A History
- **Round 1: Dimension 1 (Target Persona & Scope: Dependency Graph & Work Step Boundaries)** -> Confirmed Option 1.1: Automated dependency DAG cycle detection and work-step scope drift harness enforcing strict touch map file confinement for autonomous engineering agents and scheduler DAGs.
- **Round 1: Dimension 2 (Core KPI Metrics & Invariant Checks)** -> Confirmed Option 2.1: Detection and reporting of exact cycle paths, rejection of ready goals depending on blocked/draft predecessors, rejection of work steps modifying unlisted files or forbidden files.
- **Round 1: Dimension 3 (Data Contracts & Freshness)** -> Confirmed Option 3.1: Topological traversal via DFS/Tarjan cycle detection, path-glob intersection matching for touch map and allowed_files, and Out-scope negative boundary pattern matching.
- **Round 1: Dimension 4 (Interactive Actions & Sagas)** -> Confirmed Option 4.1: Fail-closed termination (exit code 1) on cycle detection, unlisted file touch, or missing dependency; 1:1 traceability from acceptance criteria to discrete work steps.
- **Round 1: Dimension 5 (Edge Boundaries & Failure States)** -> Confirmed Option 5.1: Blocked predecessor propagation stops downstream execution; missing dependency references rejected fail-closed; glob prefixes supported without leaking repository root.
- **Round 1: Dimension 6 (Codebase Grounding, Latency Budgets & Reusability)** -> Confirmed Option 6.1: Sub-50ms execution SLA per harness run, 100% byte equivalence between root and `template/` copies, zero mocks, and zero stubs.

---

## 🏛️ Context & Problem Statement

In autonomous multi-agent pipelines and iterative development, scope creep and circular dependencies cause catastrophic deadlocks:
1. **Circular Goal Dependencies:** Without formal DAG cycle detection, circular dependencies (A -> B -> C -> A) cause orchestrator infinite loops and pipeline deadlocks.
2. **Blocked Predecessor Propagation:** Goals marked `ready` or `in_progress` must not execute if their upstream dependencies are `blocked`, `draft`, or `planned`.
3. **Scope Drift & Unlisted File Edits:** Autonomous agents can modify files outside their declared touch map or touch explicitly forbidden Out-scope files without detection.
4. **Distribution Parity:** Governance rules and validation harnesses must remain byte-for-byte identical between root and `template/` distributions.

---

## 🎯 Confirmed Architectural Decisions

### Dimension 1: Target Persona & Scope (Dependency Graph & Touch Map Confinement)
- [x] **Option 1.1: Automated DAG & Scope Drift Harnesses**
  - Implement `goal-dependency-harness.mjs` verifying acyclicity, reference resolution, and state compatibility across all goal cards.
  - Implement `goal-scope-drift-harness.mjs` validating that work steps only modify files declared in `## Touch map` (`allowed_files:`).
  - Enforce rule governance via `.agents/rules/scope-and-dependency-integrity.md`.

### Dimension 2: Core KPI Metrics & Invariant Checks
- [x] **Option 2.1: Deterministic Cycle & Drift Detection**
  - Report exact cycle paths (e.g. `G-A -> G-B -> G-C -> G-A`).
  - Reject ready goals whose upstream dependencies are incomplete (`draft`, `planned`, `blocked`).
  - Enforce zero unlisted files in work steps (`allowed_files`).
  - Reject edits to explicitly forbidden files or directories declared in `## Out`.

### Dimension 3: Data Contracts & Freshness
- [x] **Option 3.1: Exported Ports & Programmatic Verification**
  - Export `buildAndValidateDependencyDAG(goalMap)` and `loadGoalMapFromDirectory(dir)`.
  - Export `detectScopeDrift(content, filename)`.
  - Support programmatic in-memory execution as well as standalone CLI execution.

### Dimension 4: Interactive Actions & Sagas
- [x] **Option 4.1: Fail-Closed Pipeline Integration**
  - Terminate with non-zero exit code on any dependency cycle, missing dependency, or scope drift.
  - Provide structured error diagnostic arrays listing all violations in a single evaluation pass.

### Dimension 5: Edge Boundaries & Failure Policies
- [x] **Option 5.1: Path Normalization & Boundary Guards**
  - Clean surrounding backticks, quotes, bullets, and leading/trailing whitespace from path declarations.
  - Support directory glob prefixes (e.g. `scripts/harness/*`).
  - Strictly reject placeholder paths (e.g. `path/to/...`).

### Dimension 6: Codebase Grounding, Latency & Provenance
- [x] **Option 6.1: Sub-50ms Kernel SLA and Exact-HEAD Provenance**
  - Harness execution time strictly bounded under 50ms on local CPU.
  - Exact-HEAD SHA256 physical provenance hashing across all touch map files.
  - 100% byte equivalence between root and `template/` distributions.
  - Zero mocks, zero stubs; 100% concrete compilable JavaScript (Node.js ESM).

---

## 🔒 Verification & Exit Gate
- Dependency DAG harness passes: `node scripts/harness/goal-dependency-harness.mjs`
- Scope drift harness passes: `node scripts/harness/goal-scope-drift-harness.mjs docs/07-backlog/goals/G-CORE-005.md`
- Rule parity passes: `node -e "const fs = require('fs'); const a = fs.readFileSync('.agents/rules/scope-and-dependency-integrity.md'); const b = fs.readFileSync('template/.agents/rules/scope-and-dependency-integrity.md'); if (!a.equals(b)) process.exit(1);"`
- Conformance harness passes: `node scripts/harness/goal-template-conformance-harness.mjs G-CORE-005`
- Full test pass: `npm test && npm run test:template`
