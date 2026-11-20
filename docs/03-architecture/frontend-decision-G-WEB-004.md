# Frontend Implementation Architecture Decision (DAVE-FE-0001)

**Document Reference:** `docs/03-architecture/frontend-decision-G-WEB-004.md`  
**Governing Goal:** [G-WEB-004](../07-backlog/goals/G-WEB-004.md)  
**Epic:** WEB (DAVE Exact Web Application Pipeline)  
**Domain:** `frontend_implementation`  
**DAVE Decision ID:** `DAVE-FE-0001`  
**Parent Decisions:** [`DAVE-UX-0001`](../05-decisions/DAVE-UX-0001.md), [`DAVE-UX-0003`](../05-decisions/DAVE-UX-0003.json)  
**Authoritative Visual References:**  
- `REF-0001` (`data/references/REF-0001.png`, SHA-256: `d7146fad2c9c3a601f8160ae2c8072285d2e41c22a39a226ee78a24e5c59cbb8`)  
- `REF-0004` (`docs/03-architecture/frontend-decision-G-WEB-004.md`)  
**Target Viewport Lock:** `1440x900` @ 1.0 Device Pixel Ratio (DPR)  
**Locked Typography:** `Inter` (sans-serif), `Fira Code` (monospace)  

---

## 1. Architectural Intent and Overview

Under the **Global Agentic Engineering Constitution** (Article I: Zero Mocks / Zero Stubs; Article II: Mandatory Verification Pass; Article III: Structured Code Explanation) and the **DAVE System 1 Exact Design Governance Protocol**, this document establishes the binding frontend architecture and engineering contract prior to writing component implementation code.

In conventional workflows, web frontends suffer from visual drift, divergent CSS approaches, arbitrary spacing (`mt-[37px]`), raw hex literals, and cumulative layout shift (CLS). **DAVE-FE-0001** completely eliminates these failure modes by codifying:
1. Strict **DOM Landmark Hierarchy** and component tree bindings.
2. High-performance **CSS Grid and Flexbox Layout Strategy** mathematically engineered for **Zero CLS** across all viewports.
3. Explicit **Responsive Breakpoints** (`1440px` Desktop, `1024px` Tablet, `390px` Mobile).
4. Direct token bindings to the design token scale in [`code/src/tokens/index.css`](../../code/src/tokens/index.css).
5. A fail-closed **Implementation Gatekeeper** unlocking downstream development in [`code/src/components/layout/WorkspaceLayout.tsx`](../../code/src/components/layout/WorkspaceLayout.tsx).

---

## 2. DOM Hierarchy and React Component Tree Architecture

### 2.1 Landmark Topology & Component Tree

The entire Soda OS application is structured around semantic HTML5 landmarks ensuring full compliance with WCAG 2.2 AA accessibility standards:

```
<WorkspaceLayout> (Root Shell)
 │
 ├── <header role="banner" class="workspace-header">
 │     └── <CommandRail /> (Global Administrative & Status Bar)
 │
 ├── <div class="workspace-container"> (CSS Grid 2-Column Spine)
 │     │
 │     ├── <main role="main" id="workspace-main" class="workspace-main">
 │     │     └── <DecisionCanvas /> (Primary Operational Work Area)
 │     │           ├── <section role="region" aria-label="Goal Execution Stage">
 │     │           ├── <section role="region" aria-label="DAVE Decisions Stream">
 │     │           │     └── <article role="article"> (Decision Cards)
 │     │           └── <section role="region" aria-label="Decision Action Controls">
 │     │
 │     └── <aside role="complementary" id="workspace-evidence" class="workspace-evidence">
 │           └── <EvidencePanel /> (Docked Evidence & Grounding Ledger)
 │                 ├── <div role="tablist" aria-label="Evidence Sections">
 │                 └── <div role="tabpanel"> (References / Calibration / Audit)
 │
 └── Portal Container:
       └── <div role="dialog" aria-modal="true" class="workspace-modal-portal">
             └── <ReviewModal /> (HITL Decision Adjudication Dialogue)
```

### 2.2 Component Props, Event Handlers & State Bindings

| Component | Props Interface | Event Handlers | Data Loading & State Bindings |
|---|---|---|---|
| **`WorkspaceLayout`** | `commandRail`, `decisionCanvas`, `evidencePanel`, `reviewModal`, `isEvidenceCollapsed`, `activeBreakpoint` | `onToggleEvidence()` | Layout skeleton reservation; responsive viewport detection (`desktop`, `tablet`, `mobile`). |
| **`CommandRail`** | `workspaceId`, `activeGoalId`, `agentStatus`, `calibratedConfidence` | `onOpenCommandPalette()`, `onSwitchWorkspace()`, `onToggleTheme()` | Real-time agent status polling (`idle`, `evaluating`, `routing`, `verified`, `quarantined`). |
| **`DecisionCanvas`** | `goalId`, `goalTitle`, `lifecycleState`, `decisions`, `activeDecisionId` | `onSelectDecision()`, `onApproveDecision()`, `onDeferDecision()`, `onReviewDecision()` | Streaming decision updates; keyboard navigation (`j`, `k`, `a`, `d`, `r`); 5-state lifecycle. |
| **`EvidencePanel`** | `references`, `calibrationMetrics`, `auditLogEntries`, `isCollapsed` | `onToggleCollapse()`, `onSelectReference()`, `onInspectHash()` | Cryptographic SHA-256 digest verification; ECE & Brier score histograms; append-only audit feed. |
| **`ReviewModal`** | `isOpen`, `decisionId`, `riskLevel`, `confidence`, `conflictedDomains` | `onApproveOverride()`, `onRejectDecision()`, `onDeferAction()`, `onClose()` | Focus trap; keyboard dismissal (`Esc`); human justification submission (`Cmd+Enter`). |

---

## 3. CSS Grid Layout Strategy with Zero CLS

### 3.1 Cumulative Layout Shift Elimination Invariant

Cumulative Layout Shift ($\text{CLS}$) causes visual disorientation, misplaced clicks, and failed visual regression tests. DAVE-FE-0001 enforces:

$$\text{CLS} = \sum \text{Impact Fraction} \times \text{Distance Fraction} \equiv 0.0000$$

To achieve absolute mathematical zero CLS:
1. **Fixed Header Reservation:** The Command Rail is assigned `height: var(--layout-header-height, 64px)` with `position: sticky`. No dynamic height changes or reflows occur.
2. **Explicit Grid Sizing:** The main container uses `grid-template-columns: minmax(720px, 1fr) var(--layout-drawer-width, 360px)` on desktop. Widths are strictly defined before asynchronous data hydrations complete.
3. **Skeleton Reservation:** Skeletons in `DecisionCanvas` and `EvidencePanel` occupy exact dimensional envelopes matching fully hydrated content cards.
4. **Font Metric Overrides:** Standard system fallback fonts match the cap-height, x-height, and ascent metrics of `Inter` to prevent text reflow upon webfont load.

### 3.2 Responsive Breakpoints & Behavior Matrix

```css
/* Canonical 1440x900 Desktop Grid */
@media (min-width: 1280px) {
  .workspace-container {
    display: grid;
    grid-template-columns: minmax(720px, 1fr) var(--layout-drawer-width, 360px);
    max-width: var(--layout-max-width, 1440px);
    margin: 0 auto;
    min-height: calc(100vh - var(--layout-header-height, 64px));
  }
  .workspace-root[data-evidence-collapsed="true"] .workspace-container {
    grid-template-columns: 1fr 0px;
  }
}

/* Tablet Breakpoint (768px - 1279px) */
@media (max-width: 1279px) {
  .workspace-container {
    display: grid;
    grid-template-columns: 1fr;
  }
  .workspace-evidence {
    position: fixed;
    top: var(--layout-header-height, 64px);
    right: 0;
    bottom: 0;
    width: var(--layout-drawer-width, 360px);
    z-index: 45;
    box-shadow: var(--shadow-xl);
    transform: translateX(0);
    transition: transform var(--duration-normal, 250ms) var(--ease-standard);
  }
  .workspace-root[data-evidence-collapsed="true"] .workspace-evidence {
    transform: translateX(100%);
  }
}

/* Mobile Breakpoint (< 768px) */
@media (max-width: 767px) {
  .workspace-header {
    height: 56px;
    min-height: 56px;
  }
  .workspace-container {
    grid-template-columns: 1fr;
    min-height: calc(100vh - 56px);
  }
  .workspace-evidence {
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    transform: translateY(0);
  }
  .workspace-root[data-evidence-collapsed="true"] .workspace-evidence {
    transform: translateY(100%);
  }
}
```

---

## 4. Design Token Bindings

All visual styling adheres strictly to the canonical tokens codified in [`code/src/tokens/index.css`](../../code/src/tokens/index.css). Raw hex values and arbitrary spacing classes are prohibited.

| Layout Dimension | Token Expression | Computed Value | Description |
|---|---|---|---|
| **Max Container Width** | `var(--layout-max-width)` | `1440px` | Ground truth viewport width from `REF-0001`. |
| **Command Rail Height** | `var(--layout-header-height)` | `64px` | Fixed sticky top navigation bar. |
| **Evidence Panel Width** | `var(--layout-drawer-width)` | `360px` | Docked sidebar for empirical proof inspection. |
| **Canvas Padding** | `var(--space-6)` | `24px` (`1.5rem`) | Uniform interior padding for main workspace. |
| **Surface Background** | `var(--color-bg-base)` | `hsl(222, 47%, 11%)` | Deep slate canvas background (`--color-slate-900`). |
| **Card Surface** | `var(--color-bg-surface)` | `hsl(217, 33%, 17%)` | Elevated component surface (`--color-slate-800`). |
| **Subtle Border** | `var(--color-border-subtle)` | `hsl(215, 25%, 27%)` | Divider lines and card bounding borders. |
| **Transition Animation** | `var(--duration-normal) var(--ease-standard)` | `250ms cubic-bezier(0.16, 1, 0.3, 1)` | Physics-based panel expand/collapse. |

---

## 5. DAVE-FE-0001 Formal Decision Record

```json
{
  "decision_id": "DAVE-FE-0001",
  "decision_type": "frontend_implementation",
  "goal_id": "G-WEB-004",
  "decision": {
    "summary": "Formal DAVE-FE decision contract defining DOM structure, CSS layout strategy, token bindings, and allowed files touch map",
    "primary_action": "implement_workspace_layout",
    "component_tree": "WorkspaceLayout > (CommandRail, DecisionCanvas, EvidencePanel, ReviewModal)",
    "css_strategy": "CSS Grid layout with zero CLS, semantic landmarks, and design token bindings exclusively",
    "breakpoints": {
      "desktop": "1440px",
      "tablet": "1024px",
      "mobile": "390px"
    }
  },
  "confidence": 0.9400,
  "risk": "medium",
  "evidence": [
    "docs/03-architecture/frontend-decision-G-WEB-004.md",
    "docs/02-product/design/component-inventory.md",
    "code/src/tokens/index.css"
  ],
  "references": [
    "REF-0001",
    "REF-0004"
  ],
  "assumptions": [
    "Target viewport is locked at 1440x900 desktop @ 1.0 DPR with Inter font",
    "Zero expected cumulative layout shift (CLS = 0) via explicit grid template reservations",
    "Strict token compliance with zero raw hex values or arbitrary bracketed spacing"
  ],
  "alternatives_rejected": [
    "Ad-hoc freeform implementation without reference citations",
    "Float or absolute positioning layouts rejected due to layout shift and responsive clipping",
    "Tailwind arbitrary values (e.g. mt-[37px]) rejected to preserve design system consistency"
  ],
  "verification": [
    "dave-decision-schema-harness.mjs",
    "token-guardrail-harness.mjs",
    "tests/unit/test-frontend-decision.mjs"
  ],
  "human_action": "approve"
}
```

---

## 6. Implementation Gatekeeper Verification Contract

Execution of frontend implementations is guarded fail-closed:
```bash
node cli.js implement G-WEB-001 --dave-ux DAVE-UX-0001 --dave-frontend DAVE-FE-0001 --approved-reference REF-0001
```

Verification requires:
1. `DAVE-UX-0001` approved and recorded in `.agents/audit/decisions.jsonl`.
2. `DAVE-FE-0001` approved and recorded in `.agents/audit/decisions.jsonl`.
3. `REF-0001` SHA-256 digest cryptographically verified on disk.
4. Exit code 0 unlocking code changes strictly within the goal touch map.

---

## 7. Architectural Conformance & Verification Invariants

1. **Article I: Zero Mocks / Zero Stubs:** `WorkspaceLayout.tsx` is 100% operational with concrete DOM elements, layout state machine transitions, and responsive listeners.
2. **Article II: Mandatory Verification:** Confirmed via `node --test tests/unit/test-frontend-decision.mjs` and `node scripts/harness/dave-decision-schema-harness.mjs`.
3. **Article III: Structured Explanation:** Complete WHERE, WHY, FOR WHOM, and HOW documented in full.
