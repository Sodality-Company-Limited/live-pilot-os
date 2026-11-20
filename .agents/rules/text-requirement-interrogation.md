# Global Textual Requirement Interrogation & Broad Prompt Deconstruction Rule

This document defines the mandatory protocol for interrogating, clarifying, and grounding textual requests—especially broad, open-ended prompts (e.g. *"create a dashboard like this"*, *"build a billing engine"*, *"add analytics UI"* )—before writing any code.

---

## 🏛️ SECTION I: THE BROAD PROMPT INVARIANT (ANTI-HALLUCINATION)

### ⚖️ Law 1.1: Strict Zero-Code Lock on Broad Text Prompts
- When an engineer, product owner, or user provides a high-level, open-ended, or ambiguous prompt:
  - **THE AGENT MUST NEVER GUESS UNSTATED REQUIREMENTS OR PROCEED TO CODE DIRECTLY.**
  - LLMs hallucinate arbitrary features, unwanted widgets, and fictitious APIs when prompted broadly.
  - The Agent MUST immediately initiate the **File-Based State Machine (`CLARIFICATION.md`)** with structured point-by-point questions.

---

## 🔍 SECTION II: THE 6-DOMAIN BROAD PROMPT DECONSTRUCTION MATRIX

When given a broad request like *"create a dashboard like this"* or *"implement a trading bot"*, the Agent MUST deconstruct the request across 6 Architectural Domains:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              BROAD PROMPT: "Create a dashboard like this..."                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   6-DOMAIN CANDIDATE BLUEPRINT MATRIX                       │
│                                                                             │
│   Domain 1: Target Persona & Scope (Exec, Quant, Operator, Public User)     │
│   Domain 2: Core KPI Metrics & Visual Panels (Cards, Dual-Axis Charts)      │
│   Domain 3: Ingestion Protocol & Cadence (SSE, WebSocket, Polling, Pull)   │
│   Domain 4: Interactive Actions & Sagas (Filters, Date Pickers, Exports)   │
│   Domain 5: Edge Cases & Failure States (Empty Data, Network Drop, OOM)     │
│   Domain 6: Tech Stack & Token Grounding (Tailwind, Vanilla CSS, Tokio)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│          GENERATE `CLARIFICATION.md` WITH MULTIPLE-CHOICE OPTIONS           │
│          State: `[STATE: AWAITING_HUMAN_ROUND_1]`                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Domain 1: Target Scope & Persona
- Who is the primary operator (e.g., Executive high-level overview vs Quant high-frequency sub-millisecond trader vs DevOps engineer)?

### Domain 2: Core Metrics & Visual Representation
- What exact KPIs must be displayed (e.g., Sharpe ratio, Win Rate, Latency P99, MRR)?
- What visual controls represent them (e.g., Summary Metric Cards, Dual-Axis Line Charts, Heatmaps, Candlesticks)?

### Domain 3: Data Contracts, Source & Ingestion Cadence
- Where does the data originate (existing database tables, NATS event stream, REST endpoints, Redis cache)?
- What is the update frequency (real-time sub-second streaming vs 5s polling vs on-demand pull)?

### Domain 4: Interactive Controls, Filters & Mutations
- What filters are needed (Timeframe selectors `1m/5m/1h/1d`, date pickers, symbol search)?
- What action triggers exist (e.g., "Export CSV", "Emergency Halt", "Adjust Leverage") and what rollback saga is required on failure?

### Domain 5: Edge Boundaries & Error Handling
- How are empty states, network disconnections, rate limits, or backend timeouts handled?
- Loading UX: Skeletons vs Spinners vs Cached data retention.

### Domain 6: Codebase Grounding & Architecture Standards
- Which existing design tokens, utility classes, and backend structs should be reused?
- What are the hard quantitative latency SLAs ($< 1.0\text{ms}$ or $< 100\text{ms}$)?

---

## ❓ SECTION III: MANDATORY POINT-BY-POINT Q&A GENERATION

The Agent MUST generate structured questions for each ambiguous domain:
1. **Provide Clear Multiple-Choice Options:** Option A, Option B, Option C.
2. **Mandatory Recommendation Tag:** Prefix the optimal architectural path with **`(Recommended)`**.
3. **Include Write-In Slots:** Provide a `> **Human Custom Note:**` block under each question for custom overrides.

---

## 🔄 SECTION IV: MULTI-ROUND STATE MACHINE EXECUTION GATE

1. **State Instantiation:** The Agent creates `<workspace_root>/CLARIFICATION-{GOAL-ID}.md` with status `[STATE: AWAITING_HUMAN_ROUND_1]`.
2. **Agent 'Read' Transition:** Upon user selection, status updates to `[STATE: READ_ANALYZING]`.
3. **Iterative Follow-Up:** If answers introduce second-order technical dependencies, the Agent appends Round $N$ follow-up questions (`[STATE: AWAITING_HUMAN_ROUND_N]`).
4. **Execution Handoff & Archival:** When **0 remaining questions** exist, the Agent advances to `[STATE: ALIGNMENT_COMPLETE_READY_FOR_EXECUTION]`, formulates BDD Given-When-Then scenarios, and executes Red-Green-Refactor TDD with 100% operational logic. Completed clarification files are archived to `<workspace_root>/docs/07-backlog/clarifications/CLARIFICATION-{GOAL-ID}.md`.
