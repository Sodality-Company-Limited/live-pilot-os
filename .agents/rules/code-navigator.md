# Global Code Navigator & Structured Explanation Protocol

This document defines the strict, non-negotiable guidelines for code navigation, architectural inspection, and change reporting across all projects.

---

## 1. Structured Code Explanation Standard ("WHERE, WHY, FOR WHOM, HOW")

Whenever proposing, explaining, or summarizing code changes, the Agent MUST structure its output into four core dimensions:

### A. WHERE (Exact File Locations & Impact Boundaries)
- State the exact absolute file path and line numbers using clickable Markdown links: `[basename.ext](file:///absolute/path/to/file#L10-L45)`.
- Explicitly categorize changes:
  - `[NEW]`: New files created.
  - `[MODIFY]`: Existing files modified (specify lines changed).
  - `[DELETE]`: Files or modules deleted.

### B. WHY (Architectural Rationale & Root Cause)
- Provide a deep technical explanation of why the change is necessary.
- Explain underlying mechanics, root cause of bugs fixed, performance impacts (latency, memory footprint, OOM protection), or feature capability expansion.

### C. FOR WHOM (Target Actors & Component Consumers)
- Identify the target user, system component, or subagent for whom the change is designed.

### D. HOW (Step-by-Step Implementation & Mechanics)
- Detail how the code accomplishes its objective:
  - Data structure definitions & state machine transitions.
  - Algorithms, error handling, signal propagation, and fallback logic.

---

## 2. Mandatory Implementation Invariants

1. **Zero Mocks & Zero Stubs:** Every file created or modified MUST be fully implemented with operational logic. Dummy return values, mocked APIs, or placeholder `todo!()` blocks are strictly forbidden.
2. **Mandatory Unit Testing:** All new features, adapters, and engines must include robust, executable unit test suites.
3. **Mandatory Verification Before Completion:** Never declare success without running build and test commands.
4. **LLM Wiki Documentation Export:** Always export raw technical documentation formatted with timestamps into `<repo_root>/docs/06_raw/<date_timestamp>_<topic>.md`.
