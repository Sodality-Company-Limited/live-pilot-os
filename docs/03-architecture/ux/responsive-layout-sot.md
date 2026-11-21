# LivePilot OS — Responsive Layout SOT

> **Status:** Canonical responsive behavior target; replaces conflicting breakpoint assumptions.

Use CSS logical properties and these canonical viewport classes:

| Class | Viewport | Required behavior |
|---|---:|---|
| compact | <768px | single-column priority view; secondary panels become drawers |
| tablet | 768–1279px | two-column layout; evidence and chat collapse by priority |
| desktop | ≥1280px | full bento layout; live stage, signals, controls, and trace visible |
| wide | ≥1440px | expanded evidence/trace columns without changing hierarchy |

The minimum supported viewport is 390px. Layout must preserve critical actions,
focus order, status visibility, simulation labels, and no horizontal scrolling.
Components declare collapse order, minimum width, overflow policy, and touch target.
