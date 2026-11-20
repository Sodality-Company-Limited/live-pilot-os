# LivePilot OS — Accessibility Interaction SOT

> **Status:** Production-readiness target; WCAG 2.2 AA minimum, AAA where declared by surface.

Every component must define semantic HTML/ARIA, accessible name, keyboard order,
focus-visible style, focus trap/restoration, error association, live-region priority,
reduced-motion behavior, contrast, and touch target. Dialogs must trap focus and restore
it; async state changes must announce without repeating the whole activity log.

Required verification: keyboard-only journey, screen-reader tree, axe scan, contrast,
focus loss, zoom/reflow, reduced motion, RTL direction, and error announcement tests.
Accessibility failures block release for the affected surface.
