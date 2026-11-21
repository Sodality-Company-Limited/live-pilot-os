# G-WEB-016 — Invariants Specification

## Invariants

1. **One outcome:** one Storybook shell for each of the two roles, reviewed as part of the same simulated-session presentation foundation.
2. **Shared design source:** both shells load the existing `src/tokens.css`; app-local copies of those token values are prohibited.
3. **No false data:** absent session metrics remain unavailable/omitted and cannot be rendered as zero or success.
4. **No invented contracts:** no API request, response fixture, event shape, or platform capability is created by this goal.
5. **No consequential state:** no promotion, inventory, authorization, or session mutation is implemented in these shells.
6. **Approval before implementation:** unresolved Product/Design approval or workspace ownership keeps the goal in `draft`.
7. **Accessible shell:** page regions are semantic; any rendered control has an accessible name and visible keyboard focus, and the shared reduced-motion token behavior is preserved.

## Verification mapping

| Invariant | Evidence |
|---|---|
| 1 | Storybook build and story list contains both role stories |
| 2 | Global stylesheet imports `src/tokens.css`; no copied shared token definitions |
| 3–5 | Manual review of empty/unavailable stories and source; no API or mutation adapter in touch map |
| 6 | Recorded Product/Design and workspace decisions in goal/acceptance record |
| 7 | Manual keyboard and semantic-region review |

These are executable/review invariants, not mathematical proofs of application correctness.
