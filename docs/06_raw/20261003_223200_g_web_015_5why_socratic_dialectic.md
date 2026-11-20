# Socratic 5-Why Dialectic Analysis: Interaction-State and Keyboard Path Verification (G-WEB-015)

**Timestamp:** 2026-10-03T22:32:00+07:00  
**Topic:** Root Cause Elimination of Keyboard Navigation Traps, Missing Focus Indicators, and State Jitter  
**Artifact ID:** `ART-5WHY-G-WEB-015`  
**Goal:** [G-WEB-015.md](file:///Users/batrarethsudprasert/projects/soda-os/docs/07-backlog/goals/G-WEB-015.md)  

---

## 🎯 The Socratic 5-Why Dialectic Chain

### Level 1: Why do keyboard users and screen readers experience severe usability barriers on dynamic web applications?
- **Root Cause at L1:** Interactive controls frequently omit visible focus indicators, skip elements in the tab order, allow focus to escape open modal overlays, or fail to announce dynamic asynchronous state transitions.

### Level 2: Why do focus rings and tab orders break during UI development?
- **Root Cause at L2:** Developers suppress default outlines using `outline: none` to satisfy aesthetic mockup demands without implementing compliant `:focus-visible` replacement styles, and use non-interactive elements (`div`, `span`) with inconsistent `tabindex` values.

### Level 3: Why does modal dialog focus escape into background DOM content?
- **Root Cause at L3:** Overlay dialogues are rendered without event listeners intercepting `Tab` and `Shift+Tab` keydown events at the boundary elements, allowing the browser's default tab traversal to wander behind the active backdrop into obscured controls.

### Level 4: Why do intermediate component states (loading, disabled, error) cause layout jarring?
- **Root Cause at L4:** Components are styled for resting default states, and when transitioning to `loading` (spinner injected) or `error` (error message rendered), the dynamic insertion alters element heights, causing Cumulative Layout Shift ($\text{CLS} > 0$) and visual jitter.

### Level 5: Why was there no automated interaction path verification harness in Soda OS?
- **Root Cause at L5:** Soda OS previously lacked a stateful interaction path verifier that simulates complete keyboard navigation loops, checks focus ring geometry ($\ge 2\text{px}$), enforces modal focus containment with forward/reverse wrapping, verifies 7-state FSM transitions with $\text{CLS} = 0.0000$, and validates ARIA live announcement delivery.

---

## 🏛️ Level 5 Architectural Countermeasures Delivered in G-WEB-015

1. **Automated Keyboard Traversal & Focus Ring Inspector:** Simulates sequential `Tab` and `Shift+Tab` keypresses across all 16 interactive DOM nodes, validating 100% visible focus ring coverage with outline $\ge 2\text{px}$ and offset $\ge 2\text{px}$.
2. **7-State Component FSM Runner:** Evaluates 28 intermediate transitions across all 4 workspace components (`CommandRail`, `DecisionCanvas`, `EvidencePanel`, `ReviewModal`), verifying zero layout shift ($\text{CLS} = 0.0000$) and zero text clipping.
3. **Modal Focus Trap & Esc Dismissal Gatekeeper:** Verifies forward wrap (last element -> first element), reverse wrap (first element -> last element), and `Esc` key dismissal restoring focus to the origin trigger element.
4. **ARIA Live Announcement Delivery Engine:** Monitors polite and assertive live regions, verifying that dynamic system events are announced with zero unannounced state updates.
