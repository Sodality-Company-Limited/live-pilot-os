# G-WEB-016 — FSM and Runtime Specification

## Goal lifecycle

| Current state | Event | Guard | Next state | Effect |
|---|---|---|---|---|
| `draft` | Workspace location confirmed | IA/UI approval is recorded and the goal is selected for execution | `ready` may be considered after goal analysis | Implementation may be planned |
| `draft` | Goal not selected for execution | Always | `draft` | UI implementation remains blocked |
| `in_progress` | App and Storybook builds pass; review evidence recorded | Both stories are included | `review` | Attach revision-bound evidence |
| `in_progress` | Build/review fails | Any required check fails | `in_progress` or `blocked` per dependency | Fix or record blocker; do not claim completion |

## Story runtime states

This goal renders a static shell only. A story with no session input shows an empty/unavailable presentation; it must not invent loading, success, promotion, or live-platform behavior. Stateful interaction and API-backed states belong to later goals.

## Runtime dependencies

Only the confirmed app workspace and its declared local dependencies are required. No backend, API, event broker, identity provider, or commerce platform is contacted.
