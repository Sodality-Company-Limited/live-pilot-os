# Acceptance Contract: G-WEB-016

**Goal:** [G-WEB-016](../../07-backlog/goals/G-WEB-016.md)  
**Requirement:** `REQ-LP-016` in [LivePilot OS Requirements Baseline](../../03-architecture/live-pilot-os-requirements.md)  
**Status:** passed — implementation and acceptance review completed on 2026-11-21.

## Scenario 1: Review both role shells

**Given** Product/Design has approved the detailed UI specification and `apps/web/` is the confirmed frontend workspace,  
**when** the developer opens Storybook,  
**then** separate Host and Live Ops shell stories are listed and reflect their approved screen regions.

**Verification:** Storybook build exits successfully; manual review traces the Host and Live Ops regions to the approved UI specification.

## Scenario 2: Consume shared design tokens

**Given** both role stories are rendered,  
**when** the reviewer inspects their styles and token loading,  
**then** the app imports `src/tokens.css` and does not duplicate token values.

**Verification:** Inspect the app's global stylesheet import and search the app workspace for copied definitions of the shared tokens.

## Scenario 3: Keep absent data truthful

**Given** a shell story has no session/API data,  
**when** it renders,  
**then** missing metrics are labeled unavailable or omitted and are not shown as zero, successful, or live platform data.

**Verification:** Manual review of both shell stories; no API fixture or platform action is part of this goal.

## Scenario 4: Build both deliverables

**Given** the confirmed app workspace has its declared dependencies installed,  
**when** `npm --prefix apps/web run build` and `npm --prefix apps/web run storybook:build` run,  
**then** both commands exit with status 0 and the static Storybook includes both role stories.

## Scenario 5: Responsive and accessible shells

**Given** either role shell is rendered,  
**when** it is reviewed at compact, tablet, desktop, and wide viewports,  
**then** it follows the canonical responsive layout, has no horizontal overflow at 390px, uses semantic landmarks and visible keyboard focus, keeps interactive targets at least 44×44px, and normal text meets the WCAG 2.2 AAA contrast target of 7:1.

**Verification:** Manual viewport and keyboard review; Storybook accessibility checks; inspect text and background token pairs.

## Blocking condition

The IA and UI specification were approved and `apps/web/` was confirmed on 2026-11-21. API specification completion is not a prerequisite for these static shells; data-bound stories remain out of scope until the backend contract is handed off.

## Execution evidence — 2026-11-21

- `npm --prefix apps/web run build` — passed; `/` and `/_not-found` were statically rendered.
- `npm --prefix apps/web run storybook:build` — passed; Storybook lists the separate Host and Live Ops stories.
- `npm --prefix apps/web run lint` — passed.
- Storybook accessibility scan — Host and Live Ops each reported 0 violations, 0 inconclusive findings, and 25 passing checks.
- Visual responsive review — checked 390px compact, tablet-width Storybook canvas in the 1280px browser window, 1280px desktop, and 1440px wide. No horizontal overflow was visible; compact uses one column and desktop/wide use the approved bento layout.
- Token contrast calculation — `--color-text-muted` on `--color-surface-raised` is 7.41:1; `--color-text` on the same surface is 14.16:1. Both meet the 7:1 normal-text target.
- `npm audit --omit=dev --json` — 0 production dependency vulnerabilities. Full development dependency audit reports 5 moderate transitive findings through `@storybook/nextjs-vite` (`glob` and `minimatch`); npm reports no compatible automatic fix.
- No API fixture, invented session metric, or platform behavior was added. Shared design token declarations remain only in `src/tokens.css`.

## Sign-off

| Role | Name | Date | Decision |
|---|---|---|---|
| Product/Design — IA scope | | 2026-11-21 | approved |
| Product/Design — detailed UI specification | | 2026-11-21 | approved |
| Frontend workspace — requester confirmation | | 2026-11-21 | approved (`apps/web/`) |
