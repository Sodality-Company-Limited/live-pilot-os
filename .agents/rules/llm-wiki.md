---
description: Optional knowledge export for high-value, audit, architecture, security, incident, or deployment work
---

# LLM Wiki Specification & Operating Protocol

This document defines the strict, non-negotiable guidelines for building, maintaining, and querying the persistent **LLM Wiki Knowledge Base** across the Sodality Ecosystem (**AEther**, **AExis**, **AEcho**, **AEflux**, **AEthos**, **AEgis**, **AEonix**, **AEris**, **AEidolon**).

---

## 1. Core Architecture & Three-Tier Knowledge Structure

The LLM Wiki sits between raw engineering activities and active execution:

1. **Raw Sources Layer (`<repo_root>/docs/06_raw/`)**:
   - Primary, immutable source of truth. Contains raw research notes, architectural blueprints, RFCs, plan walkthroughs, and security audit reports.
   - All files must be named using ISO timestamps: `<YYYYMMDD>_<HHMMSS>_<topic>.md` or `<YYYYMMDD>_<topic>.md`.
2. **Catalog Index (`<repo_root>/docs/06_raw/index.md`)**:
   - Content-oriented catalog listing all raw documents, dynamic goal SOPs, curiosity spikes, and architectural reference links.
   - Antigravity MUST inspect `index.md` first when answering complex queries or conducting research across the codebase.
3. **Activity Log (`<repo_root>/docs/06_raw/log.md`)**:
   - Chronological, append-only record of ingestion, curiosity daydreaming, architecture synthesis, and milestone verification events.
   - Log entries follow the format: `## [<YYYY-MM-DDTHH:MM:SSZ>] <event_type> | <description>`.

---

## 2. Ingestion & Export Protocol for Antigravity

When the goal explicitly requires knowledge export, or when the work is architecture,
security, incident, deployment, compliance, or a high-value reusable discovery:

1. **Export Raw Documentation**:
   - Write a detailed Markdown technical report into `<repo_root>/docs/06_raw/<date_timestamp>_<topic>.md`.
2. **Update Catalog Index (`index.md`)**:
   - Add a clickable Markdown link `[file.md](file:///<repo_root>/docs/06_raw/<file.md>)` with a 1-line summary to `index.md`.
3. **Append Activity Entry (`log.md`)**:
   - Append a parseable ISO timestamped entry to `log.md`.

---

## 3. Querying & Synthesis Guidelines

- For ordinary bug fixes and small scoped tasks, do not load or update the wiki. Use the
  concise handoff instead.
- **Zero Memory Loss**: For opted-in wiki work, check `docs/06_raw/index.md` and related
  raw markdown files before conducting redundant research.
- **Bi-Directional Code & Wiki Linking**: All raw docs must include clickable links to active source code lines using the `file://` scheme (e.g. `[factory.rs](file:///absolute/path/to/factory.rs#L10-L45)`).
- **Compounding Artifacts**: High-value answers, comparative benchmarks, and bug root-cause analyses synthesized during user sessions MUST be persisted back into `docs/06_raw/` so future sessions benefit immediately.
