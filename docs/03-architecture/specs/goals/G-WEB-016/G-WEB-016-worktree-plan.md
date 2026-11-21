# G-WEB-016 — Worktree Plan

## Execution boundary

- **Branch:** `feature/G-WEB-016` (the current goal branch).
- **Mode:** one worktree; no subagents.
- **Reason:** the app shell, Storybook configuration, and their stories form one bounded presentation deliverable.

## Write set

- New app files: `apps/web/**`, the requester-confirmed Live OS frontend workspace.
- Goal evidence: `docs/02-product/acceptance/G-WEB-016.md` and `docs/03-architecture/specs/goals/G-WEB-016/**`.
- Approved UX/UI source: `docs/02-product/design/live-os-ui-specification.md` and `docs/03-architecture/ux/live-os-ux-flow.md`.
- Shared tracking files are synchronized through Soda governance commands and are not direct execution touch-map files.
- `src/tokens.css` is read/import only; it is not part of the write set.

## Verification and stop conditions

After the goal is selected for execution, run the app build and static Storybook build named in the goal. Stop review if either build fails, either role story is absent, tokens are duplicated, a story claims API/platform behavior, or a shell control fails keyboard review.

No merge, production deployment, or external service mutation is part of this goal.
