# G-WEB-017 — FSM and Runtime Specification

## Goal lifecycle

| Current state | Event | Guard | Next state | Effect |
|---|---|---|---|---|
| `draft` | Goal selected for execution | Touch map and design criteria are complete; G-WEB-016 files are isolated | `ready` / `in_progress` | Prepare `feature/G-WEB-017` and apply the palette |
| `in_progress` | Builds, contrast, accessibility, and conformance pass | Evidence recorded for the exact revision | `review` | Review the visual result |
| `in_progress` | Required check fails | Any build, contrast, accessibility, or conformance check fails | `blocked` | Preserve evidence and fix within scope |

## Rendering states

The existing app and Storybook stories keep their current static presentation states. This goal changes colors only; it introduces no loading, success, session, or API state.

## Runtime dependencies

Only the existing frontend workspace and its local dependencies are required. No backend or external platform is contacted.
