# Acceptance Contract: G-WEB-017

**Goal:** [G-WEB-017](../../07-backlog/goals/G-WEB-017.md)  
**Title:** Apply an Orange Accent to the Live OS Dark Theme  
**Status:** passed — implementation and current-revision acceptance review completed on 2026-11-21.
**Requirement:** `REQ-LP-016`  
**Atomic outcome:** The Live OS frontend has a clearly orange accent on its existing dark theme, using the shared token source.

## Scenario 1: Shared orange theme

**Given** the Next.js app and the Host and Live Ops Storybook stories load the shared `src/tokens.css`,  
**when** a reviewer views the app and both stories,  
**then** all show the same dark surfaces and clearly orange primary accent, with no copied color declarations.

**Verification:** Inspect `apps/web/src/app/globals.css` and `.storybook/preview.tsx`; review the app and both stories.

## Scenario 2: Contrast and focus

**Given** the updated semantic palette,  
**when** the reviewer checks each normal-text/background pairing and keyboard focus,  
**then** normal text meets the 4.5:1 WCAG 2.2 AA target, approved for this surface on 2026-11-21, and focus remains visible without relying on color alone.

**Verification:** Token guardrail, contrast calculation, Storybook accessibility review, and keyboard-focus review.

## Scenario 3: Existing semantics remain stable

**Given** the theme update,  
**when** reviewers inspect status indicators and shell content,  
**then** success, warning, danger, and info retain their existing semantic colors, and screen anatomy and unavailable-data behavior are unchanged.

**Verification:** Review the Live OS UI specification and source; the separate DAVE workspace harness is not evidence for these components.

## Scenario 4: Responsive and build quality

**Given** the Host and Live Ops stories,  
**when** they are built and reviewed at the minimum supported width and desktop widths,  
**then** both builds pass, no accessibility violations are reported, and no horizontal overflow appears.

**Verification:** App build, Storybook build, lint, accessibility review, and responsive visual review.

## Out of scope

- A light theme or theme toggle.
- New API, session, or platform behavior.
- Changes to semantic success, warning, danger, or info colors.

## Execution evidence — 2026-11-21

The initial evidence below records the checks that first exposed the review blockers. The current-revision evidence that follows supersedes those results.

- App build, Storybook build, lint, token guardrail, goal conformance (51/51), architecture conformance (9/9), senior engineering gate, SOT hierarchy, skill registry, and `git diff --check` passed.
- Contrast, Storybook accessibility, and 390px responsive reviews passed for Host and Live Ops.
- The legacy DAVE UI-spec harness requires files from a separate workspace and is not applicable to these Live OS stories; direct conformance review is recorded below.
- Initial repository governance findings were repaired and the governance check against `master` now passes.

## Follow-up checks — 2026-11-21

- On the current working tree, app build, Storybook build, lint, and responsive accessibility checks passed after the final copy and focus updates.
- The `GITHUB_BASE_REF=master` governance check passed after repairing AG registry and archived-title findings.
- The DAVE workspace UI-spec harness remains broken due to missing inventory files and checks components outside the Live OS frontend. It is tracked separately rather than used as evidence for this goal.
- The requester selected the AA exception and chose not to show a simulation label on the current empty shell. Actual simulated playback remains subject to the software-quality SOT's visible mode-label requirement.
- The pending checks listed above were completed in the current-revision verification section below.

## Current-revision verification

- WCAG 2.2 AA contrast calculation — PASS for all text/background pairs used by the stories: primary orange on the dark surface 4.90:1, near-black foreground on orange 5.31:1, muted text on raised panels 7.41:1, and body text on raised panels 14.16:1.
- Storybook axe — Host and Live Ops each report 0 violations and 0 inconclusive results at 390×896, 834×1112, 1280×1024, and 1440×1024.
- Keyboard — role links and scrollable panels receive focus; the focus ring is visible on the active panel.
- Live OS UI specification — manually reviewed against both rendered stories; screen regions, shared orange theme, English copy, truthful unavailable states, and disabled session controls conform.
- `npm run lint`, `npm run build`, and `npm run storybook:build` from `apps/web/` — PASS.
- Token guardrail, SOT hierarchy, skill registry, both goal/architecture conformance checks, governance against `master`, senior-engineering checks, and the quality scorecard — PASS (100/100).
