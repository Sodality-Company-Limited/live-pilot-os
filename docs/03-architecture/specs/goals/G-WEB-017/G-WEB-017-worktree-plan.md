# G-WEB-017 — Worktree Plan

## Execution boundary

- **Branch:** `feature/G-WEB-017`.
- **Mode:** one worktree; no subagents.
- **Reason:** one visual refinement across a shared token source and its app renderer.

## Write set

- `src/tokens.css`
- `apps/web/src/app/globals.css`
- `docs/03-architecture/ux/live-os-design-tokens.md`
- `docs/02-product/design/live-os-ui-specification.md`
- `docs/03-architecture/ux/live-os-ux-flow.md`
- Goal and acceptance evidence under G-WEB-017.
- Shared queues and snapshots only through Soda goal synchronization commands.

## Preparation and stop conditions

The current workspace contained uncommitted G-WEB-016 work. The dedicated G-WEB-017 branch was provisioned while preserving those changes. Keep all G-WEB-016-only files and hunks out of G-WEB-017 staging and commit scope; do not discard or overwrite them. The UI/UX source files are shared touch-map paths, so keep their G-WEB-017 color-direction edits distinct from the earlier approval edits. Any final commit must be split by goal after the existing governance blocker is resolved.

After implementation, run both frontend builds, lint, token guardrail, UI-spec conformance, accessibility review, and contrast checks. Stop review on any failed check or if the requested visual result requires new behavior.

No merge, production deployment, or external service mutation is part of this goal.
