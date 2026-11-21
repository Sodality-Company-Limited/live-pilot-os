# Acceptance Contract: G-WEB-017

**Goal:** [G-WEB-017](../../07-backlog/goals/G-WEB-017.md)  
**Title:** Apply an Orange Accent to the Live OS Dark Theme  
**Status:** blocked at review — implementation complete; repository evidence gates remain blocked
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
**then** normal text meets the 7:1 WCAG 2.2 AAA target and focus remains visible without relying on color alone.

**Verification:** Token guardrail, contrast calculation, Storybook accessibility review, and keyboard-focus review.

## Scenario 3: Existing semantics remain stable

**Given** the theme update,  
**when** reviewers inspect status indicators and shell content,  
**then** success, warning, danger, and info retain their existing semantic colors, and screen anatomy and unavailable-data behavior are unchanged.

**Verification:** UI-spec conformance and source review.

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

- App build, Storybook build, lint, token guardrail, goal conformance (51/51), architecture conformance (9/9), senior engineering gate, SOT hierarchy, skill registry, and `git diff --check` passed.
- Contrast, Storybook accessibility, and 390px responsive reviews passed for Host and Live Ops.
- UI-spec conformance is blocked because `docs/02-product/design/component-inventory.md` and `docs/02-product/design/component-states.md` are missing.
- Repository governance is blocked by unregistered `AG` epic references in G-AG-001–020 and malformed H1 titles in archived G-CORE-034–040.
- No commit or PR was created because the required evidence and governance gates are not fully green. Existing uncommitted G-WEB-016 changes were preserved.
