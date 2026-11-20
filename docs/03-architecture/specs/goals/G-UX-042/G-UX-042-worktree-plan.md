# G-UX-042 Worktree Plan

## Ownership

- One frontend owner; one worktree because Host and Live Ops share one session model and UI token source.
- Execution branch after promotion: `feature/G-UX-042`.
- Keep the implementation inside the goal touch map.

## Allowed paths

- `package.json`, `package-lock.json` — add app scripts/dependencies.
- `src/app/**`, `src/components/live-os/**`, `src/lib/live-os/**`, `src/data/live-os-demo.ts` — add UI and session behavior.
- `src/tokens.css` — retain or adjust product-scoped variables only with approved design changes.
- `scripts/ui-smoke/live-os-demo.mjs` — add browser smoke coverage.
- `docs/02-product/acceptance/G-UX-042.md` — update test evidence/status only.

## Checkpoints

1. Stop if G-UX-041 is not approved.
2. Confirm application scaffold and test commands before implementation.
3. Verify the shared-session flow before responsive polish.
4. Run build, browser smoke, accessibility, network-boundary, and viewport checks before review.
