# Scope and Dependency Integrity Governance Rule

> **Scope:** Governs goal planning, dependency DAG allocation, git staging, and touch-map file boundaries across all Soda OS goals.  
> **Invariants:** Zero scope creep, zero unlisted file touches, zero cyclic dependencies.

---

## 1. Touch Map & Allowed Files Boundaries

1. **Strict File Confinement:** An agent or engineer executing a goal is strictly forbidden from modifying or creating files outside the declared `## Touch map` (`allowed_files:`).
2. **Explicit Forbidden Files:** If a file path matches `forbidden_files:` or falls outside the declared touch map, `scripts/harness/goal-scope-drift-harness.mjs` immediately rejects the PR with exit code 1.
3. **No Drive-by Refactorings:** Refactoring adjacent modules, adjusting formatting in unrelated files, or bumping package versions outside the goal scope is prohibited.
4. **Step-to-Touch Map Mapping:** Each individual work step must explicitly list `allowed_files:` as a strict subset of the goal's overall touch map.

---

## 2. Dependency Graph Invariants

1. **Explicit DAG Declaration:** Every goal must declare its upstream dependencies in `Depends on:` (`depends_on:` in YAML).
2. **Existence Requirement:** All declared dependencies must exist as valid goal cards in `docs/07-backlog/goals/` or `docs/07-backlog/goals/_archived/`.
3. **Acyclic Directed Graph (DAG):** Dependency cycles (e.g. A depends on B, B depends on A) are strictly invalid and rejected by `scripts/harness/goal-dependency-harness.mjs`.
4. **State Compatibility:** A goal cannot advance to `in_progress` or `ready` if any upstream dependency is in `blocked` or `draft` status.
5. **No Hidden Dependencies:** System modules cannot import unlisted libraries or rely on uncommitted environment variables.

---

## 3. 1:1 Acceptance Criteria to Work Step Traceability

Every item in `docs/02-product/acceptance/G-xxx.md` must trace directly to at least one discrete work step in the goal card. Unmapped acceptance criteria or orphan work steps block goal execution.
