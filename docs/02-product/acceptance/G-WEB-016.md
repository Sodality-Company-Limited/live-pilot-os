# Acceptance Contract: G-WEB-016

**Goal:** [G-WEB-016](../../07-backlog/goals/G-WEB-016.md)  
**Requirement:** `REQ-LP-016` in [LivePilot OS Requirements Baseline](../../03-architecture/live-pilot-os-requirements.md)  
**Status:** passed — implementation and current-revision acceptance review completed on 2026-11-21.

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
**then** it follows the canonical responsive layout, has no horizontal overflow at 390px, uses semantic landmarks and visible keyboard focus, keeps interactive targets at least 44×44px, and normal text meets the WCAG 2.2 AA contrast target of 4.5:1 under the Live OS Hackathon exception approved on 2026-11-21.

**Verification:** Manual viewport and keyboard review; Storybook accessibility checks; inspect text and background token pairs.

## Blocking condition

The IA and UI specification were approved and `apps/web/` was confirmed on 2026-11-21. API specification completion is not a prerequisite for these static shells; data-bound stories remain out of scope until the backend contract is handed off.

## Execution evidence — 2026-11-21

- `npm --prefix apps/web run build` — passed; `/` and `/_not-found` were statically rendered.
- `npm --prefix apps/web run storybook:build` — passed; Storybook lists the separate Host and Live Ops stories.
- `npm --prefix apps/web run lint` — passed.
- Storybook accessibility scan — Host and Live Ops each reported 0 violations, 0 inconclusive findings, and 25 passing checks.
- Visual responsive review — checked 390px compact, tablet-width Storybook canvas in the 1280px browser window, 1280px desktop, and 1440px wide. No horizontal overflow was visible; compact uses one column and desktop/wide use the approved bento layout.
- Token contrast calculation — current approved text/background pairings are checked against the WCAG 2.2 AA 4.5:1 target; see refreshed evidence below.
- `npm audit --omit=dev --json` — 0 production dependency vulnerabilities. Full development dependency audit reports 5 moderate transitive findings through `@storybook/nextjs-vite` (`glob` and `minimatch`); npm reports no compatible automatic fix.
- No API fixture, invented session metric, or platform behavior was added. Shared design token declarations remain only in `src/tokens.css`.

## Sign-off

| Role | Name | Date | Decision |
|---|---|---|---|
| Product/Design — IA scope | | 2026-11-21 | approved |
| Product/Design — detailed UI specification | | 2026-11-21 | approved |
| Frontend workspace — requester confirmation | | 2026-11-21 | approved (`apps/web/`) |

## Current-revision verification

- Acceptance uses WCAG 2.2 AA (4.5:1) for the Live OS Hackathon surface under the explicit exception in the localization SOT; the default AAA target remains in force for other product surfaces.
- Used normal-text pairs meet AA: primary orange on the dark surface is 4.90:1, near-black foreground on orange is 5.31:1, muted text on raised panels is 7.41:1, and body text on raised panels is 14.16:1.
- Storybook axe reports 0 violations and 0 inconclusive results for both Host and Live Ops at compact (390×896), tablet (834×1112), desktop (1280×1024), and wide (1440×1024).
- Keyboard review confirms the role links and scrollable panels are focusable and the focused panel shows a visible 3px focus ring. The role links and disabled controls meet the 44×44px target minimum.
- Manual review confirms both stories match the approved screen regions and use explicit unavailable states without adding API or session behavior.
