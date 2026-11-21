---
description: DAVE frontend scope — token-first styling, touch-map isolation, and component state completeness
alwaysApply: true
---

# DAVE Frontend Scope Contract

This rule establishes strict boundaries on frontend code implementation to prevent scope expansion, token pollution, and visual drift.

---

## 1. Token-First Guardrail (Zero Arbitrary Values)

All styling in web and mobile applications MUST derive strictly from approved design tokens (`docs/03-architecture/design-tokens.md`).

### 1.1 Forbidden Anti-Patterns:
```tsx
// STRICTLY FORBIDDEN:
<div className="text-[#123456] mt-[37px] rounded-[11px]">
<div style={{ color: "#ff0000", paddingLeft: "19px" }}>
```

### 1.2 Approved Conforming Patterns:
```tsx
// APPROVED CONFORMING:
<div className="text-primary mt-space-6 rounded-card">
<div style={{ color: "var(--token-color-primary)", paddingLeft: "var(--token-space-4)" }}>
```

The automated `token-guardrail-harness.mjs` scans all git diffs and halts execution if arbitrary hex codes or magic number utility classes are detected.

---

## 2. Component State Completeness Invariant

Every component implemented under a DAVE goal MUST exhaustively implement and render the following standard component states:
1. `loading`: Skeleton loaders or spinners matching target geometry.
2. `empty`: Zero-data empty states with actionable guidance.
3. `partial`: Rendering gracefully when partial or paginated data is returned.
4. `error`: Explicit error state with retry triggers and boundary containment.
5. `success / default`: Fully populated data state.
6. `interaction`: Explicit hover, focus-visible, active, and disabled states.

---

## 3. Touch-Map & Global Pollution Isolation
- Modifications MUST be strictly restricted to the files listed in the goal's declared **Touch map**.
- The agent is **strictly forbidden** from editing global CSS files (`globals.css`, `index.css`) or altering shared root layout components unless the active goal explicitly includes global token refactoring.
